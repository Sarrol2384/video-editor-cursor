import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import {
  refundCredits,
  reserveCredits,
} from "@/lib/credits";
import { generateProductPrompts } from "@/lib/productPromptGen";
import { PRODUCT_PROMPT_CREDIT_COST } from "@/lib/creditCosts";
import { isFalConfigured, formatFalError } from "@/lib/falClient";
import { parseSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";

/** Vision upload + LLM can take 30–90s — allow long serverless runs. */
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    let jobId: string | undefined;

    try {
      if (!isFalConfigured()) {
        return jsonError(
          "AI prompt generation requires FAL_KEY. Add your key to .env and restart the server.",
          503
        );
      }

      const body = await req.json();
      const { projectId, productName, sourceImageUrl, pharmacyName } = body;

      if (!projectId || !productName?.trim() || !sourceImageUrl) {
        return jsonError("projectId, productName, and sourceImageUrl are required");
      }

      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
      });
      if (!project) return jsonError("Project not found", 404);

      const settings = parseSettings(project.settings, project.name);
      if (inferWorkflowMode(settings) !== "pharmacy") {
        return jsonError("Product prompt generation is only available for pharmacy projects", 400);
      }

      const creditCost = PRODUCT_PROMPT_CREDIT_COST;
      const job = await prisma.generationJob.create({
        data: {
          userId: user.id,
          projectId,
          kind: "image",
          provider: "fal-vision",
          params: JSON.stringify({
            productName: productName.trim(),
            sourceImageUrl,
          }),
          status: "processing",
          creditEstimate: creditCost,
        },
      });
      jobId = job.id;

      const reservation = await reserveCredits(
        user.id,
        creditCost,
        "Product prompt generation",
        job.id
      );
      if (!reservation.success) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { status: "failed", error: reservation.error },
        });
        return jsonError(reservation.error || "Insufficient credits", 402);
      }

      const resolvedPharmacy =
        pharmacyName?.trim() || settings.pharmacyName || "your pharmacy";

      const { suggestions, productContext } = await generateProductPrompts({
        productName: productName.trim(),
        pharmacyName: resolvedPharmacy,
        sourceImageUrl,
      });

      const mergedSettings = {
        ...settings,
        aiPromptSuggestions: suggestions,
        aiProductContext: productContext,
      };

      await prisma.project.update({
        where: { id: projectId },
        data: { settings: JSON.stringify(mergedSettings) },
      });

      await prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "completed" },
      });

      return jsonOk({
        suggestions,
        productContext,
        credits: reservation.balance,
      });
    } catch (err) {
      if (jobId) {
        await prisma.generationJob
          .update({
            where: { id: jobId },
            data: {
              status: "failed",
              error: err instanceof Error ? err.message : "Generation failed",
            },
          })
          .catch(() => undefined);
        await refundCredits(
          user.id,
          PRODUCT_PROMPT_CREDIT_COST,
          "Product prompt generation failed",
          jobId
        ).catch(() => undefined);
      }

      const message = formatFalError(err);
      if (/408|timeout/i.test(message)) {
        return jsonError(
          "Vision analysis timed out — please try again in a moment.",
          504
        );
      }
      if (/balance|locked|exhausted|forbidden/i.test(message)) {
        return jsonError(message, 402);
      }
      return jsonError(message, 500);
    }
  });
}
