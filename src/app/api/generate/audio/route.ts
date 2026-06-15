import { NextRequest } from "next/server";
import path from "path";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { reserveCredits, refundCredits } from "@/lib/credits";
import { getModelById, estimateCredits } from "@/lib/models";
import { buildAudioMetadata, ensureUploadDir } from "@/lib/mockGen";
import { parseSettings } from "@/lib/types";
import {
  downloadToUploads,
  isFalConfigured,
  runXaiTts,
} from "@/lib/falClient";
import { mapVoiceToXai } from "@/lib/voiceMapping";
import { probeMediaDurationSec } from "@/lib/ffprobe";
import { clampExportDurationSec } from "@/lib/exportAudio";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    let jobId: string | undefined;
    let creditCost = 0;

    try {
      const body = await req.json();
      const { projectId, script, voiceId, musicMood, duration } = body;

      if (!projectId) return jsonError("projectId is required");

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (!project) return jsonError("Project not found", 404);

      const settings = parseSettings(project.settings);
      const model = getModelById("xai-tts");
      if (!model) return jsonError("Invalid model");

      const effectiveScript = (script || settings.narrationScript || "").trim();
      if (!effectiveScript) {
        return jsonError("Narration script is required");
      }

      const effectiveVoiceId = voiceId || settings.voiceId || "professional-f";
      const effectiveMood = musicMood || settings.musicMood || "professional";
      const effectiveDuration = duration || settings.duration || 8;
      creditCost = estimateCredits(model, effectiveDuration);

      const job = await prisma.generationJob.create({
        data: {
          userId: user.id,
          projectId,
          kind: "audio",
          provider: model.provider,
          params: JSON.stringify({
            script: effectiveScript,
            voiceId: effectiveVoiceId,
            musicMood: effectiveMood,
          }),
          status: "processing",
          creditEstimate: creditCost,
        },
      });
      jobId = job.id;

      const reservation = await reserveCredits(
        user.id,
        creditCost,
        "Audio generation",
        job.id
      );
      if (!reservation.success) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { status: "failed", error: reservation.error },
        });
        return jsonError(reservation.error || "Insufficient credits", 402);
      }

      let narrationUrl = "";
      let provider = "mock";
      const xaiVoice = mapVoiceToXai(effectiveVoiceId);

      if (isFalConfigured()) {
        try {
          const remoteUrl = await runXaiTts({
            text: effectiveScript,
            voice: xaiVoice,
          });
          const uploadDir = await ensureUploadDir();
          narrationUrl = await downloadToUploads(remoteUrl, uploadDir, ".mp3");
          provider = "xai-tts";
        } catch (err) {
          console.error("xAI TTS failed:", err);
          const message =
            err instanceof Error ? err.message : "xAI TTS failed";
          if (
            message.toLowerCase().includes("balance") ||
            message.toLowerCase().includes("forbidden")
          ) {
            await prisma.generationJob.update({
              where: { id: job.id },
              data: { status: "failed", error: message },
            });
            await refundCredits(
              user.id,
              creditCost,
              "Audio generation failed",
              job.id
            );
            return jsonError(
              "fal.ai balance exhausted. Top up at fal.ai/dashboard/billing to generate AI narration.",
              403
            );
          }
        }
      }

      if (!narrationUrl) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error: "AI narration unavailable — check FAL_KEY and try again.",
          },
        });
        await refundCredits(
          user.id,
          creditCost,
          "Audio generation failed",
          job.id
        );
        return jsonError(
          "AI narration unavailable. Check FAL_KEY in .env and restart the server.",
          503
        );
      }

      const metadata = buildAudioMetadata({
        script: effectiveScript,
        voice: effectiveVoiceId,
        tone: effectiveVoiceId.split("-")[0],
        musicMood: effectiveMood,
      });

      const asset = await prisma.asset.create({
        data: {
          userId: user.id,
          projectId,
          type: "audio",
          source: "generated",
          storageUrl: narrationUrl,
          metadata: JSON.stringify({
            ...metadata,
            mock: false,
            provider,
            xaiVoice,
            narrationVolume: settings.narrationVolume ?? 100,
            musicVolume: settings.musicVolume ?? 40,
          }),
        },
      });

      settings.narrationScript = effectiveScript;
      settings.voiceId = effectiveVoiceId;
      settings.generatedNarrationVoiceId = effectiveVoiceId;
      settings.musicMood = effectiveMood;
      settings.generatedNarrationUrl = narrationUrl;

      const narrationPath = path.join(
        process.cwd(),
        "public",
        narrationUrl.replace(/^\//, "")
      );
      const measuredSec = await probeMediaDurationSec(narrationPath);
      if (measuredSec != null && measuredSec > 0) {
        settings.generatedNarrationDuration = measuredSec;
        settings.duration = clampExportDurationSec(
          Math.max(settings.duration ?? 8, Math.ceil(measuredSec))
        );
      }

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          creditCharged: creditCost,
          resultAssetId: asset.id,
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          step: Math.max(project.step, 3),
          settings: JSON.stringify(settings),
        },
      });

      return jsonOk({
        job,
        asset,
        settings,
        provider,
        credits: reservation.balance,
      });
    } catch (err) {
      console.error("Audio generation failed:", err);
      if (jobId && creditCost > 0) {
        await refundCredits(user.id, creditCost, "Audio generation failed", jobId);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "failed", error: "Internal error" },
        });
      }
      return jsonError(
        err instanceof Error ? err.message : "Audio generation failed",
        500
      );
    }
  });
}
