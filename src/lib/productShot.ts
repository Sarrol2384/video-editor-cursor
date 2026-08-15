import type { ProjectSettings } from "@/lib/types";
import {
  PHARMACY_DEFAULT_SCENE,
  PHARMACY_NO_ADDED_MARKETING_PROMPT,
  buildPharmacyBrandingExclusionPrompt,
  pharmacyPeopleAndBrandingBlock,
  sanitizePharmacySceneText,
} from "@/lib/pharmacyImage";

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
  "blurry faces, out of focus people, distant tiny figures, heavy background bokeh on faces, people far in background, unrecognizable faces, pharmacy sign, store logo, shop signage, wall text, readable letters, E-KEM, poster, shelf talker, branded uniform, shopping bag with logo, watermark, headline text, wrong packaging colors, altered product label";

/** Keep packs looking physically in the scene — not pasted catalog cutouts. */
export const PRODUCT_REALISM_PROMPT =
  "COMPOSITION: This is a lifestyle family photo first, product second. People and faces stay sharp and well lit in mid-shot — never heavy bokeh on faces. The product pack is a secondary prop resting on the dining table or side table (usually to one side), natural real-world scale — not a giant centered catalog hero floating over a blurred background. " +
  "INTEGRATION: The pack must sit firmly on the table surface with a soft contact shadow, matching the room light direction and color. No floating, no white halo, no cutout fringe, no sticker/pasted collage look. Keep packaging identity (label, logos, colors) accurate while allowing gentle relighting so it belongs in the photo.";

export const PRODUCT_REALISM_NEGATIVE =
  "floating product, hovering pack, product in mid-air, giant product hero, centered catalog cutout, cutout, white halo, hard edge composite, pasted collage, sticker look, mismatched lighting, no contact shadow, product in front of shelves without surface, blurred faces, out of focus people, heavy bokeh on family, shallow depth of field on faces, AI watermark, AI badge";

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
    "scenePrompt" | "benefitsPrompt" | "backgroundPrompt" | "subjectPrompt" | "pharmacyName"
  >,
  styleSuffix: string,
  options?: { pharmacy?: boolean }
): string {
  const rawScene =
    settings.scenePrompt ||
    settings.backgroundPrompt ||
    "Warm wellness lifestyle scene with soft natural lighting";
  const scene = options?.pharmacy
    ? sanitizePharmacySceneText(rawScene, settings.pharmacyName) ||
      PHARMACY_DEFAULT_SCENE
    : rawScene;
  const mood = settings.benefitsPrompt
    ? `Mood and benefits to convey: ${settings.benefitsPrompt}.`
    : "";
  const rawPlacement = settings.subjectPrompt;
  const placement = rawPlacement
    ? options?.pharmacy
      ? `Product placement in scene: ${sanitizePharmacySceneText(rawPlacement, settings.pharmacyName) || "product resting on the dining table in the foreground with a natural contact shadow, unchanged from upload"}.`
      : `Product placement in scene: ${rawPlacement}.`
    : "Product resting on a real table or counter surface in the foreground, grounded with a soft contact shadow.";

  const peopleBlock = options?.pharmacy
    ? pharmacyPeopleAndBrandingBlock(
        settings.pharmacyName,
        scene,
        settings.subjectPrompt
      )
    : sceneIncludesPeople(scene, settings.subjectPrompt)
      ? PEOPLE_FOCUS_IMAGE_PROMPT
      : "";

  return [
    scene,
    mood,
    placement,
    options?.pharmacy ? PRODUCT_REALISM_PROMPT : "",
    peopleBlock,
    options?.pharmacy
      ? `${buildPharmacyBrandingExclusionPrompt(settings.pharmacyName)} ${PHARMACY_NO_ADDED_MARKETING_PROMPT}`
      : "",
    styleSuffix,
    "Photorealistic commercial photography. No text overlays or watermarks.",
  ]
    .join(" ")
    .replace(/[^\x20-\x7E.!,?\-'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
