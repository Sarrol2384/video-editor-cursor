import type { ProjectSettings } from "@/lib/types";

export type AgencyPostFormat = "static" | "cinematic" | "talking-head";

export function resolveAgencyPostFormat(
  settings: Partial<ProjectSettings>
): AgencyPostFormat {
  if (settings.postFormat) return settings.postFormat;
  if (settings.videoGenerationMode === "avatar") return "talking-head";
  return "cinematic";
}

export function settingsForAgencyPostFormat(
  format: AgencyPostFormat
): Partial<ProjectSettings> {
  switch (format) {
    case "static":
      return {
        postFormat: "static",
        videoGenerationMode: "motion",
        videoHasEmbeddedAudio: false,
      };
    case "cinematic":
      return {
        postFormat: "cinematic",
        videoGenerationMode: "motion",
        selectedModelId: "kling-o3-standard",
        videoHasEmbeddedAudio: false,
      };
    case "talking-head":
      return {
        postFormat: "talking-head",
        videoGenerationMode: "avatar",
        selectedModelId: "kling-avatar-pro",
        hideAvatarSubtitles: true,
      };
  }
}

export function agencyNarrationRequired(settings: ProjectSettings): boolean {
  const format = resolveAgencyPostFormat(settings);
  return format === "talking-head" || format === "cinematic";
}

export function agencyVideoStepRequired(settings: ProjectSettings): boolean {
  return resolveAgencyPostFormat(settings) !== "static";
}
