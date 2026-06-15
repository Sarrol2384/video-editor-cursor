import type { ProjectSettings } from "@/lib/types";

import { inferWorkflowMode } from "@/lib/brands";

import {

  PEOPLE_FOCUS_IMAGE_PROMPT,

  sceneIncludesPeople,

} from "@/lib/productShot";



/** Primary audience for VonWillingh Online social ads. */

export const SA_COLOURED_AUDIENCE_IMAGE_PROMPT =

  "People must reflect VonWillingh Online's South African audience: Coloured South African professionals and entrepreneurs in sharp mid-shot focus — authentic Western Cape and national representation. Most subjects should be Coloured South African men and women; white colleagues may appear occasionally in supporting roles, not as the sole focus. Natural skin tones, smart-casual or professional dress suited to local business.";



export const NO_MARKETING_TEXT_IN_IMAGE_PROMPT =

  "No headlines, slogans, call-to-action phrases, text boxes, banners, prices, URLs, or watermarks in the image. Marketing copy is added later as movable overlays.";



/** Nano Banana 2 — logo reference image applied to props in the scene. */

export const LOGO_ON_BRANDED_PROP_PROMPT =

  "Apply the VonWillingh Online circular logo from the reference image accurately on any branded props in the scene — merchandise, apparel, packaging, signage, or products where it fits naturally. Reproduce the logo exactly; do not invent misspelled text or alternate marks. Laptop and phone screens stay abstract with no readable words.";



function agencyMoodOnly(): string {

  return "Visual mood only: professional, modern South African business and technology atmosphere — confident, approachable, premium. Do not write any marketing sentences or slogans in the image.";

}



/** Legacy Nano Banana 1 — no AI-drawn logos; branding added in editor overlay. */

export const NO_TEXT_IN_IMAGE_PROMPT =

  "CRITICAL — ZERO TEXT IN IMAGE: No readable text, slogans, or logos drawn by AI. Marketing copy and branding are added in the editor.";



export interface AgencyImagePromptOptions {

  /** Nano Banana 2 with VonWillingh logo passed as a reference image. */

  withLogoReference?: boolean;

}



export function isAgencyImageGeneration(

  settings: Pick<ProjectSettings, "workflowMode" | "brandId" | "pharmacyName">,

  sourceImageUrl?: string

): boolean {

  if (inferWorkflowMode(settings) === "agency") return true;

  if (sourceImageUrl?.includes("agency-blank")) return true;

  return false;

}



/** Full-scene prompt for VonWillingh / agency posts (not product-pack preservation). */

export function buildAgencyImagePrompt(

  settings: Pick<

    ProjectSettings,

    "scenePrompt" | "benefitsPrompt" | "subjectPrompt" | "backgroundPrompt"

  >,

  styleSuffix: string,

  options: AgencyImagePromptOptions = {}

): string {

  const { withLogoReference = false } = options;

  const scene =

    settings.scenePrompt ||

    settings.backgroundPrompt ||

    "Modern South African office with Coloured entrepreneur at laptop, warm natural light";

  const placement =

    settings.subjectPrompt ||

    "Coloured South African business owner in sharp focus mid-shot, confident professional mood";



  const peopleBlock = sceneIncludesPeople(scene, placement)

    ? `${SA_COLOURED_AUDIENCE_IMAGE_PROMPT} ${PEOPLE_FOCUS_IMAGE_PROMPT}`

    : "";



  const textRule = withLogoReference

    ? NO_MARKETING_TEXT_IN_IMAGE_PROMPT

    : NO_TEXT_IN_IMAGE_PROMPT;



  const brandingRule = withLogoReference ? LOGO_ON_BRANDED_PROP_PROMPT : "";



  const mood = agencyMoodOnly();



  return [

    textRule,

    "Transform the source image into a full photorealistic advertisement photograph for a South African digital agency.",

    `Scene: ${scene}.`,

    `Composition: ${placement}.`,

    mood,

    peopleBlock,

    brandingRule,

    textRule,

    "Photorealistic broadcast-quality commercial photography with natural lighting and shadows.",

    styleSuffix,

  ]

    .filter(Boolean)

    .join(" ");

}



/** Bria fallback scene text for agency posts. */

export function buildAgencySceneDescription(

  settings: Pick<

    ProjectSettings,

    "scenePrompt" | "benefitsPrompt" | "backgroundPrompt" | "subjectPrompt"

  >,

  styleSuffix: string,

  options: AgencyImagePromptOptions = {}

): string {

  const { withLogoReference = false } = options;

  const scene =

    settings.scenePrompt ||

    settings.backgroundPrompt ||

    "Modern South African office, Coloured professional at work, warm natural light";

  const mood = agencyMoodOnly();

  const placement = settings.subjectPrompt

    ? `Composition: ${settings.subjectPrompt}.`

    : "Coloured South African subject in sharp focus mid-shot.";



  const peopleBlock = sceneIncludesPeople(scene, settings.subjectPrompt)

    ? `${SA_COLOURED_AUDIENCE_IMAGE_PROMPT} ${PEOPLE_FOCUS_IMAGE_PROMPT}`

    : "";



  const textRule = withLogoReference

    ? NO_MARKETING_TEXT_IN_IMAGE_PROMPT

    : NO_TEXT_IN_IMAGE_PROMPT;



  const brandingRule = withLogoReference ? LOGO_ON_BRANDED_PROP_PROMPT : "";



  return [

    textRule,

    scene,

    mood,

    placement,

    peopleBlock,

    brandingRule,

    styleSuffix,

    textRule,

  ]

    .join(" ")

    .replace(/[^\x20-\x7E.!,?\-'"]/g, " ")

    .replace(/\s+/g, " ")

    .trim();

}


