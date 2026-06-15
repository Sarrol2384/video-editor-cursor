import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { reserveCredits, refundCredits } from "@/lib/credits";
import { getModelById, estimateCredits } from "@/lib/models";
import { ensureUploadDir, type ImageStyle } from "@/lib/mockGen";
import { generateMockOrRealVariants } from "@/lib/imageGen";
import { parseSettings } from "@/lib/types";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    let jobId: string | undefined;
    let creditCost = 0;

    try {
      const body = await req.json();
      const {
        projectId,
        sourceImageUrl,
        style,
        modelId,
        settings: inputSettings,
      } = body;

      if (!projectId || !sourceImageUrl) {
        return jsonError("projectId and sourceImageUrl are required");
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (!project) return jsonError("Project not found", 404);

      const settings = {
        ...parseSettings(project.settings),
        ...inputSettings,
      };

      // "mock-image" is an internal fallback only; always generate via Nano Banana.
      const requestedModelId =
        modelId || settings.selectedImageModelId || "nano-banana";
      const model = getModelById(
        requestedModelId === "mock-image" ? "nano-banana" : requestedModelId
      );
      if (!model) return jsonError("Invalid model");

      creditCost = estimateCredits(model);
      const job = await prisma.generationJob.create({
        data: {
          userId: user.id,
          projectId,
          kind: "image",
          provider: model.provider,
          params: JSON.stringify({
            sourceImageUrl,
            style,
            modelId: model.id,
            aspectRatio: settings.aspectRatio,
            scenePrompt: settings.scenePrompt,
            benefitsPrompt: settings.benefitsPrompt,
          }),
          status: "processing",
          creditEstimate: creditCost,
        },
      });
      jobId = job.id;

      const reservation = await reserveCredits(
        user.id,
        creditCost,
        "Image generation",
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
      const imageModelId =
        modelId || settings.selectedImageModelId || "nano-banana";

      const { variants, provider, warning } = await generateMockOrRealVariants(
        sourceImageUrl,
        settings,
        uploadDir,
        imageModelId,
        style as ImageStyle | undefined
      );

      const assets = await Promise.all(
        variants.map((v) =>
          prisma.asset.create({
            data: {
              userId: user.id,
              projectId,
              type: "image",
              source: "generated",
              storageUrl: v.storageUrl || sourceImageUrl,
              metadata: JSON.stringify({
                variant: v,
                provider,
                mock: provider === "mock",
              }),
            },
          })
        )
      );

      settings.sourceImageUrl = sourceImageUrl;
      settings.selectedImageModelId = model.id;
      delete settings.generatedVideoUrl;
      delete settings.videoHasEmbeddedAudio;

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          creditCharged: creditCost,
          resultAssetId: assets[0]?.id,
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          step: Math.max(project.step, 1),
          settings: JSON.stringify(settings),
        },
      });

      return jsonOk({
        job,
        variants,
        assets,
        provider,
        warning,
        settings,
        credits: reservation.balance,
      });
    } catch (err) {
      console.error("Image generation failed:", err);
      if (jobId && creditCost > 0) {
        await refundCredits(user.id, creditCost, "Image generation failed", jobId);
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "failed", error: "Internal error" },
        });
      }
      return jsonError(
        err instanceof Error ? err.message : "Image generation failed",
        500
      );
    }
  });
}
