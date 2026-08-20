import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { ensureTempDir, materializeLocalFile, saveUploadBuffer } from "@/lib/storage";
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

export const runtime = "nodejs";
export const maxDuration = 300;

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
    let overlayPath: string | null = null;
    let narrationPath: string | null = null;
    let deleteInputAfter = false;
    let deleteOverlayAfter = false;
    let deleteNarrationAfter = false;

    try {
      const formData = await req.formData();
      const settings = parseSettings(project.settings || "{}");
      const lipSyncExport = formData.get("lipSyncExport") === "1";
      const rawOnly = formData.get("rawOnly") === "1";
      const canvasExport = formData.get("canvasExport") === "1";
      const overlayExport = formData.get("overlayExport") === "1";
      const stillImageExport = formData.get("stillImageExport") === "1";
      const exportDurationRaw = formData.get("exportDurationSec");
      const clientExportDuration =
        typeof exportDurationRaw === "string"
          ? Number.parseFloat(exportDurationRaw)
          : NaN;

      const generatedVideoUrl = settings.generatedVideoUrl?.trim() ?? "";
      const narrationUrl = settings.generatedNarrationUrl?.trim() ?? "";
      const tempDir = await ensureTempDir();

      if ((lipSyncExport || rawOnly || overlayExport) && generatedVideoUrl) {
        try {
          const generated = await materializeLocalFile(generatedVideoUrl);
          inputPath = generated.filePath;
          deleteInputAfter = generated.cleanup;
        } catch {
          return jsonError("Generated video file not found", 404);
        }

        if (overlayExport) {
          const overlayFile = formData.get("overlay") as File | null;
          if (!overlayFile || overlayFile.size === 0) {
            return jsonError("No overlay image provided", 400);
          }
          if (overlayFile.size > 20 * 1024 * 1024) {
            return jsonError("Overlay image is too large", 413);
          }
          overlayPath = path.join(tempDir, `${uuidv4()}-overlay.png`);
          deleteOverlayAfter = true;
          await fs.writeFile(
            overlayPath,
            Buffer.from(await overlayFile.arrayBuffer())
          );
        }
      } else if (stillImageExport) {
        const sourceImageUrl = (
          settings.selectedImageUrl ||
          settings.sourceImageUrl ||
          ""
        ).trim();
        if (!sourceImageUrl) {
          return jsonError("No source image found for export", 404);
        }

        try {
          const sourceImage = await materializeLocalFile(sourceImageUrl);
          inputPath = sourceImage.filePath;
          deleteInputAfter = sourceImage.cleanup;
        } catch {
          return jsonError("Source image file not found", 404);
        }

        const overlayFile = formData.get("overlay") as File | null;
        if (overlayFile && overlayFile.size > 0) {
          if (overlayFile.size > 20 * 1024 * 1024) {
            return jsonError("Overlay image is too large", 413);
          }
          overlayPath = path.join(tempDir, `${uuidv4()}-overlay.png`);
          deleteOverlayAfter = true;
          await fs.writeFile(
            overlayPath,
            Buffer.from(await overlayFile.arrayBuffer())
          );
        }
      } else {
        const video = formData.get("video") as File | null;
        if (!video) return jsonError("No video file provided");
        if (video.size > MAX_EXPORT_BYTES) {
          return jsonError("Export file is too large", 413);
        }

        const id = uuidv4();
        const videoExt =
          video.name?.toLowerCase().endsWith(".mp4") ||
          video.type.includes("mp4")
            ? ".mp4"
            : ".webm";
        inputPath = path.join(tempDir, `${id}-input${videoExt}`);
        deleteInputAfter = true;
        await fs.writeFile(inputPath, Buffer.from(await video.arrayBuffer()));
      }

      let narrationExists: string | undefined;
      if (narrationUrl) {
        try {
          const narration = await materializeLocalFile(narrationUrl);
          narrationPath = narration.filePath;
          deleteNarrationAfter = narration.cleanup;
          narrationExists = narration.filePath;
        } catch (err) {
          console.error("Export: narration file missing", err);
          if (!lipSyncExport && !rawOnly) {
            return jsonError(
              "Narration audio could not be loaded for export. Go back to the Audio step, generate narration again, then export MP4.",
              422
            );
          }
        }
      }

      const useEmbeddedAudio =
        !stillImageExport &&
        (lipSyncExport ||
          rawOnly ||
          (Boolean(settings.videoHasEmbeddedAudio) &&
            !canvasExport &&
            !overlayExport &&
            !narrationExists));

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

      const id = uuidv4();
      outputPath = path.join(tempDir, `${id}-export.mp4`);

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
        imageFit: settings.imageFit || "contain",
        overlayImagePath: overlayPath ?? undefined,
        inputIsStillImage: stillImageExport || undefined,
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
            imageFit: settings.imageFit || "contain",
            overlayImagePath: overlayPath ?? undefined,
            inputIsStillImage: stillImageExport || undefined,
          });
        } else if (useEmbeddedAudio) {
          await convertWebmToMp4(inputPath!, outputPath, {
            useEmbeddedVideoAudio: true,
            targetDurationSec,
            cropAvatarSubtitles,
            outputWidth: width,
            outputHeight: height,
            imageFit: settings.imageFit || "contain",
            overlayImagePath: overlayPath ?? undefined,
            inputIsStillImage: stillImageExport || undefined,
          });
        } else {
          await convertWebmToMp4(inputPath!, outputPath, {
            targetDurationSec,
            inputVideoDurationSec: inputVideoDurationSec ?? undefined,
            outputWidth: width,
            outputHeight: height,
            imageFit: settings.imageFit || "contain",
            overlayImagePath: overlayPath ?? undefined,
            inputIsStillImage: stillImageExport || undefined,
          });
        }
      }

      const filename = `ad-${projectId.slice(0, 8)}.mp4`;
      const outputBuffer = await fs.readFile(outputPath);
      const storageUrl = await saveUploadBuffer(
        outputBuffer,
        `${id}-export.mp4`,
        "video/mp4"
      );

      let shareTokenOut: string | undefined;
      if (lipSyncExport) {
        const nextSettings = {
          ...settings,
          shareExportUrl: storageUrl,
          shareToken: settings.shareToken || uuidv4(),
        };
        shareTokenOut = nextSettings.shareToken;
        await prisma.project.update({
          where: { id: projectId },
          data: { settings: JSON.stringify(nextSettings) },
        });
      }

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

      return jsonOk({ url: storageUrl, filename, shareToken: shareTokenOut });
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
      if (overlayPath && deleteOverlayAfter) {
        await fs.unlink(overlayPath).catch(() => {});
      }
      if (narrationPath && deleteNarrationAfter) {
        await fs.unlink(narrationPath).catch(() => {});
      }
      if (outputPath) {
        await fs.unlink(outputPath).catch(() => {});
      }
    }
  });
}
