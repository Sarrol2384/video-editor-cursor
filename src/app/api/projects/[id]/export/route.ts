import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { ensureUploadDir } from "@/lib/mockGen";
import { convertWebmToMp4 } from "@/lib/ffmpeg";
import { probeMediaDurationSec } from "@/lib/ffprobe";
import { parseSettings } from "@/lib/types";
import { getAspectDimensions, getCanvasBaseWidth } from "@/lib/canvas-utils";
import { shouldHideAvatarSubtitles } from "@/lib/avatarSubtitles";
import {
  clampExportDurationSec,
  getExportVolumeLevels,
  resolveExportDurationSec,
} from "@/lib/exportAudio";

const MAX_EXPORT_BYTES = 200 * 1024 * 1024;

function resolveUploadPath(storageUrl: string): string | null {
  if (!storageUrl.startsWith("/uploads/")) return null;
  return path.join(process.cwd(), "public", storageUrl.replace(/^\//, ""));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    const projectId = params.id;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });
    if (!project) return jsonError("Project not found", 404);

    let inputPath: string | null = null;
    let outputPath: string | null = null;
    let deleteInputAfter = false;

    try {
      const formData = await req.formData();
      const settings = parseSettings(project.settings || "{}");
      const lipSyncExport = formData.get("lipSyncExport") === "1";
      const rawOnly = formData.get("rawOnly") === "1";
      const canvasExport = formData.get("canvasExport") === "1";
      const exportDurationRaw = formData.get("exportDurationSec");
      const clientExportDuration =
        typeof exportDurationRaw === "string"
          ? Number.parseFloat(exportDurationRaw)
          : NaN;

      const generatedVideoUrl = settings.generatedVideoUrl?.trim() ?? "";
      const narrationUrl = settings.generatedNarrationUrl?.trim() ?? "";

      if ((lipSyncExport || rawOnly) && generatedVideoUrl) {
        const rawPath = resolveUploadPath(generatedVideoUrl);
        if (!rawPath) {
          return jsonError("Generated video file path is invalid", 400);
        }
        try {
          await fs.access(rawPath);
        } catch {
          return jsonError("Generated video file not found on server", 404);
        }
        inputPath = rawPath;
        deleteInputAfter = false;
      } else {
        const video = formData.get("video") as File | null;
        if (!video) return jsonError("No video file provided");
        if (video.size > MAX_EXPORT_BYTES) {
          return jsonError("Export file is too large", 413);
        }

        const uploadDir = await ensureUploadDir();
        const id = uuidv4();
        const videoExt =
          video.name?.toLowerCase().endsWith(".mp4") ||
          video.type.includes("mp4")
            ? ".mp4"
            : ".webm";
        inputPath = path.join(uploadDir, `${id}-input${videoExt}`);
        deleteInputAfter = true;
        await fs.writeFile(inputPath, Buffer.from(await video.arrayBuffer()));
      }

      let narrationExists: string | undefined;
      if (narrationUrl) {
        const narrationPath = resolveUploadPath(narrationUrl);
        if (narrationPath) {
          try {
            await fs.access(narrationPath);
            narrationExists = narrationPath;
          } catch {
            console.warn("Export: narration file missing at", narrationPath);
          }
        }
      }

      const useEmbeddedAudio =
        lipSyncExport ||
        rawOnly ||
        (Boolean(settings.videoHasEmbeddedAudio) &&
          !canvasExport &&
          !narrationExists);

      const inputVideoDurationSec = await probeMediaDurationSec(inputPath!);

      let targetDurationSec = Number.isFinite(clientExportDuration)
        ? clampExportDurationSec(clientExportDuration)
        : resolveExportDurationSec(settings, inputVideoDurationSec);

      if (useEmbeddedAudio && inputVideoDurationSec != null && inputVideoDurationSec > 0) {
        targetDurationSec = clampExportDurationSec(inputVideoDurationSec);
      } else if (narrationExists && !useEmbeddedAudio) {
        const narrSec = await probeMediaDurationSec(narrationExists);
        if (narrSec != null && narrSec > 0) {
          targetDurationSec = clampExportDurationSec(
            Math.max(targetDurationSec, narrSec)
          );
        }
      }

      const shortEdge = getCanvasBaseWidth(settings.resolution);
      const { width, height } = getAspectDimensions(
        settings.aspectRatio,
        shortEdge
      );
      const cropAvatarSubtitles =
        shouldHideAvatarSubtitles(settings) &&
        Boolean(settings.videoHasEmbeddedAudio);

      const uploadDir = await ensureUploadDir();
      const id = uuidv4();
      outputPath = path.join(uploadDir, `${id}-export.mp4`);

      const volumes = getExportVolumeLevels(settings);
      const muxOptions = {
        narrationPath: useEmbeddedAudio ? undefined : narrationExists,
        musicMood: rawOnly
          ? undefined
          : settings.musicMood || "professional",
        narrationVolume: volumes.narrationVolume,
        musicVolume: volumes.musicVolume,
        useEmbeddedVideoAudio: useEmbeddedAudio,
        targetDurationSec,
        inputVideoDurationSec: inputVideoDurationSec ?? undefined,
        cropAvatarSubtitles,
        outputWidth: width,
        outputHeight: height,
      };

      try {
        await convertWebmToMp4(inputPath!, outputPath, muxOptions);
      } catch (muxErr) {
        console.warn("Export mux with music failed, retrying:", muxErr);
        if (narrationExists && !useEmbeddedAudio) {
          await convertWebmToMp4(inputPath!, outputPath, {
            narrationPath: narrationExists,
            narrationVolume: volumes.narrationVolume,
            targetDurationSec,
            inputVideoDurationSec: inputVideoDurationSec ?? undefined,
            cropAvatarSubtitles,
            outputWidth: width,
            outputHeight: height,
          });
        } else if (useEmbeddedAudio) {
          await convertWebmToMp4(inputPath!, outputPath, {
            useEmbeddedVideoAudio: true,
            targetDurationSec,
            cropAvatarSubtitles,
            outputWidth: width,
            outputHeight: height,
          });
        } else {
          await convertWebmToMp4(inputPath!, outputPath, {
            targetDurationSec,
            inputVideoDurationSec: inputVideoDurationSec ?? undefined,
          });
        }
      }

      const filename = `ad-${projectId.slice(0, 8)}.mp4`;
      const storageUrl = `/uploads/${path.basename(outputPath)}`;

      await prisma.asset.create({
        data: {
          userId: user.id,
          projectId,
          type: "video",
          source: "export",
          storageUrl,
          metadata: JSON.stringify({
            format: "mp4",
            exportedAt: new Date().toISOString(),
            targetDurationSec,
            lipSyncExport: lipSyncExport || rawOnly,
          }),
        },
      });

      return jsonOk({ url: storageUrl, filename });
    } catch (err) {
      console.error("Export conversion failed:", err);
      if (outputPath) {
        await fs.unlink(outputPath).catch(() => {});
      }
      const message =
        err instanceof Error ? err.message : "Export conversion failed";
      if (message.toLowerCase().includes("ffmpeg")) {
        return jsonError(message, 503);
      }
      return jsonError(message, 500);
    } finally {
      if (inputPath && deleteInputAfter) {
        await fs.unlink(inputPath).catch(() => {});
      }
    }
  });
}
