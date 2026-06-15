import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { reserveCredits, refundCredits } from "@/lib/credits";
import { getModelById, estimateCredits, isAvatarVideoModel } from "@/lib/models";
import { simulateDelay, buildVideoMetadata, ensureUploadDir } from "@/lib/mockGen";
import {
  isFalConfigured,
  uploadImageToFal,
  uploadAudioToFal,
  runImageToVideo,
  runTalkingAvatar,
  downloadToUploads,
  formatFalVideoError,
} from "@/lib/falClient";
import { parseSettings } from "@/lib/types";
import { buildVideoMotionPrompt } from "@/lib/videoMotion";
import { buildTalkingAvatarPrompt } from "@/lib/avatarVideo";

export const maxDuration = 300;

function resolveAvatarDuration(settings: {
  generatedNarrationDuration?: number;
  duration: number;
}): number {
  const narr = settings.generatedNarrationDuration;
  if (typeof narr === "number" && narr > 0) {
    return Math.min(Math.max(Math.ceil(narr), 3), 30);
  }
  return Math.min(settings.duration || 8, 30);
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    let jobId: string | undefined;
    let creditCost = 0;

    try {
      const body = await req.json();
      const { projectId, modelId, settings: inputSettings } = body;

      if (!projectId) return jsonError("projectId is required");

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (!project) return jsonError("Project not found", 404);

      const settings = { ...parseSettings(project.settings), ...inputSettings };
      const model = getModelById(
        modelId || settings.selectedModelId || "kling-o3-standard"
      );
      if (!model) return jsonError("Invalid model");

      const isAvatar = isAvatarVideoModel(model.id);
      const duration = isAvatar
        ? resolveAvatarDuration(settings)
        : Math.min(settings.duration, model.maxDuration || settings.duration);

      const resolution = model.resolutions.includes(
        settings.resolution as (typeof model.resolutions)[number]
      )
        ? settings.resolution
        : model.resolutions[model.resolutions.length - 1];
      creditCost = estimateCredits(model, duration);

      const imageUrl = settings.selectedImageUrl || settings.sourceImageUrl;
      if (!imageUrl) {
        return jsonError("No source image selected. Generate an image first.");
      }

      if (isAvatar && !settings.generatedNarrationUrl?.trim()) {
        return jsonError(
          "Generate narration on the Audio step first — talking-head video needs your voice track.",
          400
        );
      }

      const job = await prisma.generationJob.create({
        data: {
          userId: user.id,
          projectId,
          kind: "video",
          provider: model.provider,
          params: JSON.stringify({
            modelId: model.id,
            duration,
            isAvatar,
            settings,
          }),
          status: "processing",
          creditEstimate: creditCost,
        },
      });
      jobId = job.id;

      const reservation = await reserveCredits(
        user.id,
        creditCost,
        isAvatar ? "Talking-head video" : "Video generation",
        job.id
      );
      if (!reservation.success) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { status: "failed", error: reservation.error },
        });
        return jsonError(reservation.error || "Insufficient credits", 402);
      }

      const uploadDir = await ensureUploadDir();
      const motionPrompt = buildVideoMotionPrompt(settings);
      const avatarPrompt = buildTalkingAvatarPrompt();

      let videoUrl: string;
      let provider: "fal" | "mock";

      if (isFalConfigured() && model.falModelId) {
        try {
          const falImageUrl = await uploadImageToFal(imageUrl);

          if (isAvatar) {
            const falAudioUrl = await uploadAudioToFal(
              settings.generatedNarrationUrl!
            );
            const remoteVideoUrl = await runTalkingAvatar({
              falModelId: model.falModelId,
              imageUrl: falImageUrl,
              audioUrl: falAudioUrl,
              prompt: avatarPrompt,
            });
            videoUrl = await downloadToUploads(remoteVideoUrl, uploadDir, ".mp4");
          } else {
            const remoteVideoUrl = await runImageToVideo({
              falModelId: model.falModelId,
              imageUrl: falImageUrl,
              prompt: motionPrompt.prompt,
              negativePrompt: motionPrompt.negativePrompt,
              aspectRatio: settings.aspectRatio,
              duration,
              resolution,
            });
            videoUrl = await downloadToUploads(remoteVideoUrl, uploadDir, ".mp4");
          }
          provider = "fal";
        } catch (err) {
          console.error("fal video generation failed:", err);
          await refundCredits(
            user.id,
            creditCost,
            "Video generation failed (fal)",
            job.id
          );
          await prisma.generationJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error: err instanceof Error ? err.message : "fal error",
            },
          });
          return jsonError(
            `Video generation failed: ${formatFalVideoError(err)}`,
            502
          );
        }
      } else {
        await simulateDelay(2000);
        videoUrl = imageUrl;
        provider = "mock";
      }

      const metadata = buildVideoMetadata({
        duration,
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        motionIntensity: settings.motionIntensity,
        freezeProduct: settings.freezeProduct,
        freezeText: settings.freezeText,
        overlayText: settings.overlayText,
        imageFit: settings.imageFit,
        textLayers: settings.textLayers,
        backgroundPrompt: settings.backgroundPrompt,
        motionPrompt: isAvatar ? avatarPrompt : motionPrompt.prompt,
        provider,
        videoUrl,
      });

      const asset = await prisma.asset.create({
        data: {
          userId: user.id,
          projectId,
          type: "video",
          source: "generated",
          storageUrl: videoUrl,
          metadata: JSON.stringify({
            ...metadata,
            isAvatar,
            videoHasEmbeddedAudio: isAvatar && provider === "fal",
          }),
        },
      });

      settings.selectedModelId = model.id;
      settings.selectedImageUrl = imageUrl;
      settings.generatedVideoUrl = provider === "fal" ? videoUrl : undefined;
      settings.videoGenerationMode = isAvatar ? "avatar" : "motion";
      settings.videoHasEmbeddedAudio = isAvatar && provider === "fal";
      if (isAvatar && provider === "fal" && settings.hideAvatarSubtitles !== false) {
        settings.hideAvatarSubtitles = true;
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
          step: Math.max(project.step, 4),
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
      console.error("Video generation error:", err);
      if (jobId && creditCost > 0) {
        await refundCredits(user.id, creditCost, "Video generation failed", jobId);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "failed", error: "Internal error" },
        });
      }
      return jsonError("Video generation failed", 500);
    }
  });
}
