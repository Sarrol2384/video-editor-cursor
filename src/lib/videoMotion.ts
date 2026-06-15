import type { ProjectSettings } from "@/lib/types";
import {
  PEOPLE_NEGATIVE_PROMPT,
  sceneIncludesPeople,
} from "@/lib/productShot";

const CAMERA_BY_INTENSITY: Record<
  NonNullable<ProjectSettings["motionIntensity"]>,
  string
> = {
  low: "Slow smooth camera drift with gentle parallax and visible ambient motion.",
  medium:
    "Cinematic camera push-in with steady parallax — clear continuous movement throughout the clip.",
  high: "Dynamic slow orbit or arc with strong parallax, fluid camera motion and lively scene energy.",
};

export const VIDEO_NEGATIVE_PROMPT =
  "jerky motion, stuttering, jump cuts, head twitch, flickering, warping, morphing, distorted product, blurry label, low quality, worst quality, compression artifacts, shaky camera, sudden snap movement, ghosting, frame drops, frozen static image, " +
  PEOPLE_NEGATIVE_PROMPT;

const NEGATIVE_PROMPT_MAX_LEN = 500;

export function trimNegativePrompt(
  text: string,
  maxLen = NEGATIVE_PROMPT_MAX_LEN
): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).replace(/,\s*[^,]*$/, "");
}

/**
 * Motion-only prompt for image-to-video. Scene layout is already in the source
 * image — keep scene/subject out to avoid warping; motion text drives animation.
 */
export function buildVideoMotionPrompt(
  settings: Pick<
    ProjectSettings,
    | "motionPrompt"
    | "scenePrompt"
    | "subjectPrompt"
    | "freezeProduct"
    | "motionIntensity"
  >
): { prompt: string; negativePrompt: string } {
  const intensity = settings.motionIntensity || "medium";
  const camera = CAMERA_BY_INTENSITY[intensity];

  const userMotion =
    settings.motionPrompt?.trim() ||
    "Living scene with continuous natural motion — lighting shifts, gentle background movement, soft human gestures and breathing if people are present.";

  const parts = [
    "Smooth fluid cinematic motion, photorealistic high quality, lifelike movement in every frame — not a still image.",
    camera,
    userMotion,
  ];

  if (settings.freezeProduct !== false) {
    parts.push(
      "Product package stays static and sharp on screen. Animate camera, lighting, environment, and natural human motion around it.",
      "If people are present: natural slow gestures, breathing, and soft expressions — smooth and continuous, not jerky."
    );
  } else {
    parts.push(
      "Smooth cinematic motion throughout the scene. Keep product label readable."
    );
  }

  if (sceneIncludesPeople(settings.scenePrompt, settings.subjectPrompt)) {
    parts.push(
      "Faces stay sharp with natural lifelike movement — visible but gentle."
    );
  }

  return {
    prompt: parts.join(" "),
    negativePrompt: trimNegativePrompt(VIDEO_NEGATIVE_PROMPT),
  };
}
