import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import {
  PEOPLE_FOCUS_IMAGE_PROMPT,
  sceneIncludesPeople,
} from "@/lib/productShot";

export const NO_MARKETING_TEXT_IN_IMAGE_PROMPT =
  "No headlines, slogans, call-to-action phrases, text boxes, banners, prices, URLs, or watermarks in the image. Marketing copy is added later as movable overlays.";

export const LOGO_ON_FASHION_PROP_PROMPT =
  "Apply the Pomegranate logo from the reference image accurately on subtle branded elements where natural — woven label, swing tag, packaging, or shop bag in the scene. Reproduce the logo exactly; do not invent misspelled text or alternate marks.";

export const GARMENT_FIDELITY_PROMPT =
  "CRITICAL: The garment from the reference photo must be worn by the model with identical pattern, colours, fabric texture, cut, zipper details, cuffs, and hem. Do not simplify, recolour, or redesign the clothing. The piece must be instantly recognizable as the same item.";

export interface FashionImagePromptOptions {
  withLogoReference?: boolean;
}

export function isFashionImageGeneration(
  settings: Pick<ProjectSettings, "workflowMode" | "brandId">
): boolean {
  return inferWorkflowMode(settings) === "fashion";
}

function fashionMoodOnly(benefitsPrompt?: string): string {
  if (benefitsPrompt?.trim()) {
    return `Visual mood only — ${benefitsPrompt.trim()}. Do not write marketing sentences in the image.`;
  }
  return "Visual mood: premium independent South African fashion — elegant, wearable, boutique quality.";
}

export function buildFashionSceneDescription(
  settings: Pick<
    ProjectSettings,
    "scenePrompt" | "benefitsPrompt" | "backgroundPrompt" | "subjectPrompt"
  >,
  styleSuffix: string
): string {
  const scene =
    settings.scenePrompt ||
    settings.backgroundPrompt ||
    "Clean fashion studio with soft grey backdrop, professional e-commerce lighting";
  const placement =
    settings.subjectPrompt ||
    "Model wearing the garment, waist-up or full-length as described, garment sharp and fully visible";

  return [
    scene,
    placement,
    fashionMoodOnly(settings.benefitsPrompt),
    GARMENT_FIDELITY_PROMPT,
    sceneIncludesPeople(scene, placement) ? PEOPLE_FOCUS_IMAGE_PROMPT : "",
    styleSuffix,
    "High-end fashion photography for social media. No text overlays.",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFashionImagePrompt(
  settings: Pick<
    ProjectSettings,
    | "scenePrompt"
    | "benefitsPrompt"
    | "backgroundPrompt"
    | "subjectPrompt"
    | "productName"
  >,
  styleSuffix: string,
  options: FashionImagePromptOptions = {}
): string {
  const scene =
    settings.scenePrompt ||
    settings.backgroundPrompt ||
    "Clean fashion studio, soft grey seamless backdrop, professional catalog lighting";
  const modelAndPose =
    settings.subjectPrompt ||
    "Female fashion model wearing the garment, waist-up three-quarter pose, face and outfit in sharp focus";
  const piece = settings.productName?.trim()
    ? `Garment: ${settings.productName.trim()}.`
    : "";

  const logoLine = options.withLogoReference
    ? LOGO_ON_FASHION_PROP_PROMPT
    : "Do not draw logos or readable brand text in the image — branding is added in the editor.";

  return [
    "Transform this clothing product photo into a professional fashion model shot for social media.",
    GARMENT_FIDELITY_PROMPT,
    piece,
    `Scene and setting: ${scene}.`,
    `Model and pose: ${modelAndPose}.`,
    sceneIncludesPeople(scene, modelAndPose) ? PEOPLE_FOCUS_IMAGE_PROMPT : "",
    fashionMoodOnly(settings.benefitsPrompt),
    NO_MARKETING_TEXT_IN_IMAGE_PROMPT,
    logoLine,
    "Photorealistic fashion editorial photography, natural skin tones, flattering light on fabric texture and pattern.",
    styleSuffix,
  ].join(" ");
}
