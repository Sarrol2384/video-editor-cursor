import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import { resolveAgencyPostFormat } from "@/lib/agencyPostFormat";

export function isAgencyWorkflow(settings: ProjectSettings): boolean {
  return inferWorkflowMode(settings) === "agency";
}

export function isFashionWorkflow(settings: ProjectSettings): boolean {
  return inferWorkflowMode(settings) === "fashion";
}

export function hasApprovedImage(settings: ProjectSettings): boolean {
  return Boolean(settings.selectedImageUrl || settings.sourceImageUrl);
}

/** PATCH payload values — server treats `null` as "remove this field". */
export function videoClearPatch(
  settings: ProjectSettings
): Partial<ProjectSettings> {
  if (!settings.generatedVideoUrl && !settings.videoHasEmbeddedAudio) {
    return {};
  }
  return {
    generatedVideoUrl: null as unknown as string,
    videoHasEmbeddedAudio: null as unknown as boolean,
  };
}

export function shouldClearVideoForImageChange(
  prev: ProjectSettings,
  updates: Partial<ProjectSettings>
): boolean {
  const hadVideo = Boolean(
    prev.generatedVideoUrl || prev.videoHasEmbeddedAudio
  );
  if (!hadVideo) return false;

  if (
    updates.sourceImageUrl !== undefined &&
    updates.sourceImageUrl !== prev.sourceImageUrl
  ) {
    return true;
  }

  if (updates.selectedImageUrl !== undefined) {
    const prevImage = prev.selectedImageUrl || prev.sourceImageUrl;
    return updates.selectedImageUrl !== prevImage;
  }

  return false;
}

export function resolveStudioStep(
  savedStep: number,
  settings: ProjectSettings
): number {
  if (savedStep <= 1) return savedStep;

  if (isAgencyWorkflow(settings)) {
    if (!hasApprovedImage(settings)) return 1;
    if (savedStep >= 4) return 4;
    return savedStep;
  }

  const hasNarration = Boolean(settings.generatedNarrationUrl);
  const hasVideo = Boolean(settings.generatedVideoUrl);
  if (!hasNarration) return 2;
  if (!hasVideo) return 3;
  return 4;
}

export function maxReachableStep(settings: ProjectSettings): number {
  if (isAgencyWorkflow(settings)) {
    if (!hasApprovedImage(settings)) return 1;
    return 4;
  }

  if (settings.generatedVideoUrl && settings.generatedNarrationUrl) return 4;
  if (settings.generatedNarrationUrl) return 3;
  if (settings.selectedImageUrl || settings.sourceImageUrl) return 2;
  if (settings.sourceImageUrl) return 1;
  return 0;
}

export function isPipelineStepComplete(
  stepId: number,
  settings: ProjectSettings
): boolean {
  const agency = isAgencyWorkflow(settings);

  switch (stepId) {
    case 0:
      return agency
        ? hasApprovedImage(settings)
        : Boolean(settings.sourceImageUrl);
    case 1:
      return hasApprovedImage(settings);
    case 2:
      if (agency && resolveAgencyPostFormat(settings) === "static") {
        return hasApprovedImage(settings);
      }
      return Boolean(settings.generatedNarrationUrl);
    case 3:
      if (agency && resolveAgencyPostFormat(settings) === "static") {
        return hasApprovedImage(settings);
      }
      return Boolean(settings.generatedVideoUrl);
    default:
      return false;
  }
}

export const PHARMACY_STEPS = [
  { id: 0, label: "Upload" },
  { id: 1, label: "Create Ad" },
  { id: 2, label: "Audio" },
  { id: 3, label: "Video" },
  { id: 4, label: "Export" },
] as const;

export const AGENCY_STEPS = [
  { id: 0, label: "Image" },
  { id: 1, label: "Create" },
  { id: 2, label: "Script & voice" },
  { id: 3, label: "Video" },
  { id: 4, label: "Export" },
] as const;

export const FASHION_STEPS = [
  { id: 0, label: "Upload" },
  { id: 1, label: "Model shot" },
  { id: 2, label: "Audio" },
  { id: 3, label: "Video" },
  { id: 4, label: "Export" },
] as const;

export function getStepLabels(settings: ProjectSettings) {
  if (isAgencyWorkflow(settings)) return AGENCY_STEPS;
  if (isFashionWorkflow(settings)) return FASHION_STEPS;
  return PHARMACY_STEPS;
}
