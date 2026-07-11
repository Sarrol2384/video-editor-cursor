import type { ProjectSettings } from "@/lib/types";
import {
  PEOPLE_NEGATIVE_PROMPT,
  sceneIncludesPeople,
} from "@/lib/productShot";

/** Avoid zooming into packs — AI often magnifies incorrect label text. */
export const NO_PRODUCT_ZOOM_PROMPT =
  "Never zoom in, push in, or dolly toward the product packaging or label. Camera holds steady or moves slowly outward so pack text is not magnified.";

const CAMERA_BY_INTENSITY: Record<
  NonNullable<ProjectSettings["motionIntensity"]>,
  string
> = {
  low: "Locked-off static camera — no zoom, no push-in. Only ambient light, curtains, and natural gestures move.",
  medium:
    "Very slow pull-back or static wide frame — gentle parallax only, never move closer to the product pack.",
  high: "Slow pull-back or soft lateral drift — product stays the same size or smaller in frame; never zoom toward packaging.",
};

export const VIDEO_NEGATIVE_PROMPT =
  "zoom in, push in, dolly in, close-up on product, macro product shot, camera approaching package, magnifying label text, " +
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
    "Living scene with natural ambient motion — lighting shifts, gentle background movement, soft human gestures and breathing if people are present. No camera zoom.";

  const parts = [
    "Smooth fluid cinematic motion, photorealistic high quality, lifelike movement in every frame — not a still image.",
    NO_PRODUCT_ZOOM_PROMPT,
    camera,
    userMotion,
  ];

  if (settings.freezeProduct !== false) {
    parts.push(
      "Product package stays static and sharp on screen. Animate lighting, environment, and natural human motion around it — not the camera toward the pack.",
      "If people are present: natural slow gestures, breathing, and soft expressions — smooth and continuous, not jerky."
    );
  } else {
    parts.push(
      "Smooth cinematic motion throughout the scene. Keep product label readable and avoid moving closer to it."
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
