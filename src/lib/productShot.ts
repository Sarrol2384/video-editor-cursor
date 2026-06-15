import type { ProjectSettings } from "@/lib/types";

const PEOPLE_KEYWORDS =
  /\b(person|people|woman|man|mother|father|parent|child|family|caregiver|pharmacist|customer|couple|lady|gentleman|adult|patient|hands)\b/i;

/** True when scene/subject copy likely includes human subjects. */
export function sceneIncludesPeople(...texts: Array<string | undefined>): boolean {
  return texts.some((t) => t && PEOPLE_KEYWORDS.test(t));
}

export const PEOPLE_FOCUS_IMAGE_PROMPT =
  "Any people in the scene must be in sharp focus in the mid-ground or foreground — faces, eyes, and expressions clearly visible and well lit. Do not blur people, do not push them far into the background, and do not use heavy bokeh on faces. Soft blur is only for distant background elements behind the subjects.";

export const PEOPLE_FOCUS_VIDEO_PROMPT =
  "People in the scene remain in sharp focus with clear faces and natural expressions in the mid-ground or foreground. Do not blur people or hide them as tiny distant figures.";

export const PEOPLE_NEGATIVE_PROMPT =
  "blurry faces, out of focus people, distant tiny figures, heavy background bokeh on faces, people far in background, unrecognizable faces";

/** ~1MP output sizes per aspect ratio (Bria recommendation). */
export function getProductShotSize(aspectRatio?: string): [number, number] {
  const sizes: Record<string, [number, number]> = {
    "1:1": [1000, 1000],
    "9:16": [750, 1333],
    "16:9": [1333, 750],
    "4:3": [1155, 866],
    "3:4": [866, 1155],
  };
  return sizes[aspectRatio || "1:1"] || [1000, 1000];
}

export function getProductPlacement(
  subjectPrompt?: string
):
  | "upper_left"
  | "upper_right"
  | "bottom_left"
  | "bottom_right"
  | "right_center"
  | "left_center"
  | "upper_center"
  | "bottom_center"
  | "center_vertical"
  | "center_horizontal" {
  const text = (subjectPrompt || "").toLowerCase();
  if (text.includes("upper") && text.includes("left")) return "upper_left";
  if (text.includes("upper") && text.includes("right")) return "upper_right";
  if (text.includes("bottom") && text.includes("left")) return "bottom_left";
  if (text.includes("bottom") && text.includes("right")) return "bottom_right";
  if (text.includes("right")) return "right_center";
  if (text.includes("left")) return "left_center";
  if (text.includes("upper") || text.includes("top")) return "upper_center";
  if (text.includes("center")) return "center_horizontal";
  return "bottom_center";
}

/** Scene-only prompt for Bria — the model preserves the product itself. */
export function buildSceneDescription(
  settings: Pick<
    ProjectSettings,
    "scenePrompt" | "benefitsPrompt" | "backgroundPrompt" | "subjectPrompt"
  >,
  styleSuffix: string
): string {
  const scene =
    settings.scenePrompt ||
    settings.backgroundPrompt ||
    "Warm wellness lifestyle scene with soft natural lighting";
  const mood = settings.benefitsPrompt
    ? `Mood and benefits to convey: ${settings.benefitsPrompt}.`
    : "";
  const placement = settings.subjectPrompt
    ? `Product placement in scene: ${settings.subjectPrompt}.`
    : "Product placed naturally on a surface in the scene.";

  return [
    scene,
    mood,
    placement,
    sceneIncludesPeople(scene, settings.subjectPrompt)
      ? PEOPLE_FOCUS_IMAGE_PROMPT
      : "",
    styleSuffix,
    "Photorealistic commercial photography. No text overlays or watermarks.",
  ]
    .join(" ")
    .replace(/[^\x20-\x7E.!,?\-'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
