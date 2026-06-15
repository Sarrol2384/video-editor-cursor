import type { ImageStyle } from "@/lib/mockGen";
import type { WorkflowMode } from "@/lib/brands";

export interface VisualStyleSuggestion {
  id: string;
  label: string;
  imageStyle: ImageStyle;
  hint: string;
}

const AGENCY_VISUAL_STYLES: VisualStyleSuggestion[] = [
  {
    id: "agency-pro-studio",
    label: "Premium corporate studio",
    imageStyle: "professional",
    hint: "High-end commercial photography, polished corporate atmosphere, crisp lighting.",
  },
  {
    id: "agency-pro-navy",
    label: "Navy & gold premium",
    imageStyle: "professional",
    hint: "Deep navy tones with soft gold accent light — VonWillingh brand mood, executive feel.",
  },
  {
    id: "agency-pro-cinematic",
    label: "Cinematic tech desk",
    imageStyle: "professional",
    hint: "Moody monitor glow, cinematic shallow depth, modern developer workspace.",
  },
  {
    id: "agency-life-cowork",
    label: "Modern coworking",
    imageStyle: "lifestyle",
    hint: "Bright open-plan coworking space, plants, natural candid energy.",
  },
  {
    id: "agency-life-cpt",
    label: "Cape Town office views",
    imageStyle: "lifestyle",
    hint: "Western Cape city or mountain views through windows, warm afternoon light.",
  },
  {
    id: "agency-life-community",
    label: "Local business warmth",
    imageStyle: "lifestyle",
    hint: "Warm authentic SA small-business setting, approachable community feel.",
  },
  {
    id: "agency-life-daylight",
    label: "Soft natural daylight",
    imageStyle: "lifestyle",
    hint: "Soft diffused window light, calm trustworthy mood, real-world context.",
  },
  {
    id: "agency-min-clean",
    label: "Clean tech minimal",
    imageStyle: "minimalist",
    hint: "Minimal white and soft grey workspace, generous negative space, elegant simplicity.",
  },
  {
    id: "agency-min-gradient",
    label: "Minimal gradient backdrop",
    imageStyle: "minimalist",
    hint: "Subtle navy-to-grey gradient studio backdrop, device mockup hero composition.",
  },
  {
    id: "agency-vib-startup",
    label: "Energetic startup",
    imageStyle: "vibrant",
    hint: "Colorful dynamic workspace, saturated accents, youthful innovative energy.",
  },
  {
    id: "agency-vib-social",
    label: "Bold social ad",
    imageStyle: "vibrant",
    hint: "Eye-catching saturated colors, punchy lighting for TikTok and Reels feeds.",
  },
  {
    id: "agency-vib-team",
    label: "High-energy team",
    imageStyle: "vibrant",
    hint: "Bright collaborative team scene, lively atmosphere, movement and optimism.",
  },
];

const FASHION_VISUAL_STYLES: VisualStyleSuggestion[] = [
  {
    id: "fashion-pro-studio",
    label: "Studio catalog",
    imageStyle: "professional",
    hint: "Clean grey studio backdrop, e-commerce catalog lighting, garment and model sharp.",
  },
  {
    id: "fashion-pro-editorial",
    label: "Editorial premium",
    imageStyle: "professional",
    hint: "High-fashion editorial lighting, polished boutique look, rich fabric detail.",
  },
  {
    id: "fashion-life-street",
    label: "Street style",
    imageStyle: "lifestyle",
    hint: "Urban sidewalk or café setting, candid fashion influencer energy, natural daylight.",
  },
  {
    id: "fashion-life-golden",
    label: "Golden hour outdoor",
    imageStyle: "lifestyle",
    hint: "Warm late-afternoon light, soft breeze mood, lifestyle social feed ready.",
  },
  {
    id: "fashion-life-boutique",
    label: "Boutique interior",
    imageStyle: "lifestyle",
    hint: "Warm independent boutique setting, plants and wood tones, artisan fashion mood.",
  },
  {
    id: "fashion-min-lookbook",
    label: "Minimal lookbook",
    imageStyle: "minimalist",
    hint: "Soft neutral backdrop, generous negative space, elegant garment focus.",
  },
  {
    id: "fashion-min-flatlay",
    label: "Clean white minimal",
    imageStyle: "minimalist",
    hint: "Bright white seamless, soft shadows, Pinterest and catalog aesthetic.",
  },
  {
    id: "fashion-vib-reels",
    label: "Bold Reels / TikTok",
    imageStyle: "vibrant",
    hint: "Punchy saturated colours, dynamic pose, scroll-stopping social energy.",
  },
  {
    id: "fashion-vib-seasonal",
    label: "Seasonal colour pop",
    imageStyle: "vibrant",
    hint: "Rich seasonal palette, festive fashion mood, eye-catching feed post.",
  },
];

const PHARMACY_VISUAL_STYLES: VisualStyleSuggestion[] = [
  {
    id: "pharm-pro-shelf",
    label: "Premium shelf display",
    imageStyle: "professional",
    hint: "Clean pharmacy shelf lighting, product sharp, clinical premium retail look.",
  },
  {
    id: "pharm-pro-studio",
    label: "Studio product hero",
    imageStyle: "professional",
    hint: "Studio commercial lighting, product centred, high-end advertising photography.",
  },
  {
    id: "pharm-life-home",
    label: "Cozy home wellness",
    imageStyle: "lifestyle",
    hint: "Warm living-room wellness scene, caring family atmosphere, soft evening lamp light.",
  },
  {
    id: "pharm-life-family",
    label: "Family lifestyle",
    imageStyle: "lifestyle",
    hint: "Bright kitchen or lounge, parents and children in focus, healthy everyday life.",
  },
  {
    id: "pharm-life-pharmacy",
    label: "In-store consultation",
    imageStyle: "lifestyle",
    hint: "Friendly pharmacist and customer at counter, trusted local pharmacy mood.",
  },
  {
    id: "pharm-min-catalog",
    label: "Clean catalog",
    imageStyle: "minimalist",
    hint: "Minimal white or soft gradient backdrop, catalog-style product presentation.",
  },
  {
    id: "pharm-min-soft",
    label: "Soft neutral minimal",
    imageStyle: "minimalist",
    hint: "Soft even lighting, muted neutrals, elegant uncluttered composition.",
  },
  {
    id: "pharm-vib-seasonal",
    label: "Bright seasonal promo",
    imageStyle: "vibrant",
    hint: "Vibrant seasonal colours, energetic sale mood, eye-catching retail energy.",
  },
  {
    id: "pharm-vib-youth",
    label: "Fresh & youthful",
    imageStyle: "vibrant",
    hint: "Saturated fresh colours, upbeat health and vitality, social-ready brightness.",
  },
];

export function getVisualStyleSuggestions(
  workflow: WorkflowMode | boolean = "pharmacy"
): VisualStyleSuggestion[] {
  const mode =
    typeof workflow === "boolean"
      ? workflow
        ? "agency"
        : "pharmacy"
      : workflow;
  if (mode === "agency") return AGENCY_VISUAL_STYLES;
  if (mode === "fashion") return FASHION_VISUAL_STYLES;
  return PHARMACY_VISUAL_STYLES;
}

export function findVisualStyleSuggestion(
  id: string | undefined,
  workflow: WorkflowMode | boolean = "pharmacy"
): VisualStyleSuggestion | undefined {
  if (!id) return undefined;
  return getVisualStyleSuggestions(workflow).find((s) => s.id === id);
}
