import {
  PEOPLE_FOCUS_IMAGE_PROMPT,
  sceneIncludesPeople,
} from "@/lib/productShot";

/** 90% Coloured / 10% Black South African cast for pharmacy lifestyle scenes. */
export function pickPharmacyCastLabel(): "coloured" | "black" {
  return Math.random() < 0.9 ? "coloured" : "black";
}

export function pharmacyCastImagePrompt(
  cast: "coloured" | "black" = pickPharmacyCastLabel()
): string {
  if (cast === "black") {
    return "People in the scene are Black South African adults or families — authentic local representation, natural skin tones, relatable everyday casting.";
  }
  return "People in the scene are Coloured South African adults or families — authentic Western Cape and national representation, natural skin tones, relatable everyday casting.";
}

/**
 * Strip pharmacy / retailer names from scene copy so the image model is not prompted to draw signs.
 */
export function sanitizePharmacySceneText(
  text: string | undefined,
  pharmacyName?: string
): string {
  if (!text?.trim()) return "";
  let out = text;
  if (pharmacyName?.trim()) {
    const escaped = pharmacyName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), "");
  }
  out = out
    .replace(/\bE-?KEM(\s+PHARMACY)?\b/gi, "")
    .replace(/\bpharmacy\s+(name|sign|signage|logo|counter|store|branding)\b/gi, "")
    .replace(/\b(at|in)\s+the\s+pharmacy\b/gi, "at home")
    .replace(/\bpharmacist\b/gi, "caregiver");
  return out.replace(/\s+/g, " ").trim();
}

export function buildPharmacyBrandingExclusionPrompt(pharmacyName?: string): string {
  const nameBan = pharmacyName?.trim()
    ? `Never write or display "${pharmacyName}", E-KEM, or any pharmacy or retailer name.`
    : "Never write or display any pharmacy, store, or retailer name.";
  return [
    "ZERO BRANDING IN THE SCENE ENVIRONMENT:",
    "No logos, shop signs, posters, shelf talkers, branded bags, uniforms, wall text, readable book spines, or any lettering anywhere in the room, shelves, walls, or background.",
    "Use only neutral home decor — plain cushions, plants, lamps, blurred books, empty frames.",
    nameBan,
    "The ONLY branded object is the uploaded product pack held or placed in frame — composite it unchanged from the source photo; do not invent or redraw packaging.",
  ].join(" ");
}

export const PHARMACY_NO_SCENE_BRANDING_PROMPT = buildPharmacyBrandingExclusionPrompt();

export const PHARMACY_NO_ADDED_MARKETING_PROMPT =
  "Do not add headlines, prices, URLs, watermarks, AI badges, or extra logos. All marketing copy and pharmacy branding are added later as movable text overlays in the editor — never burned into the photo.";

export const PHARMACY_DEFAULT_SCENE =
  "Neutral cozy South African home living room, warm soft lamp light, plain furniture and decor, no signage or readable text anywhere.";

export function buildPharmacyImageNegativePrompt(pharmacyName?: string): string {
  const parts = [
    "pharmacy sign, store logo, shop signage, wall text, readable letters, poster, shelf talker",
    "E-KEM, branded uniform, shopping bag with logo, watermark, headline text, price tag",
    "blurry product label, wrong packaging, altered product colors",
  ];
  if (pharmacyName?.trim()) {
    parts.push(pharmacyName.trim());
  }
  return parts.join(", ").slice(0, 500);
}

export function pharmacyPeopleAndBrandingBlock(
  pharmacyName?: string,
  ...sceneTexts: Array<string | undefined>
): string {
  const branding = buildPharmacyBrandingExclusionPrompt(pharmacyName);
  if (!sceneIncludesPeople(...sceneTexts)) {
    return branding;
  }
  return [
    pharmacyCastImagePrompt(),
    PEOPLE_FOCUS_IMAGE_PROMPT,
    branding,
  ].join(" ");
}
