import type { ProjectSettings } from "@/lib/types";
import { resolveAgencyPostFormat } from "@/lib/agencyPostFormat";

export type BrandId = "ekem" | "vonwillingh" | "pomegranate";
export type WorkflowMode = "pharmacy" | "agency" | "fashion";

export const EKEM_LOGO_URL = "/branding/ekem-pharmacy-logo.png";
export const VONWILLINGH_LOGO_URL = "/branding/vonwillingh-logo.png";
export const POMEGRANATE_LOGO_URL = "/branding/pomegranate-logo.png";

export interface BrandConfig {
  id: BrandId;
  name: string;
  logoUrl: string;
  logoWide?: boolean;
  logoDarkBg?: boolean;
  workflowMode: WorkflowMode;
  defaultPharmacyName: string;
  templateIndustry: string;
  description: string;
  hubBlurb: string;
}

export const BRANDS: Record<BrandId, BrandConfig> = {
  ekem: {
    id: "ekem",
    name: "E-KEM Pharmacy",
    logoUrl: EKEM_LOGO_URL,
    workflowMode: "pharmacy",
    defaultPharmacyName: "E-KEM PHARMACY",
    templateIndustry: "pharmacy",
    description: "Product photo ads with narration and AI video",
    hubBlurb:
      "Upload product photos, generate lifestyle scenes, narration, and video ads.",
  },
  vonwillingh: {
    id: "vonwillingh",
    name: "VonWillingh Online",
    logoUrl: VONWILLINGH_LOGO_URL,
    workflowMode: "agency",
    defaultPharmacyName: "VonWillingh Online",
    templateIndustry: "agency",
    description: "Social posts from prompts — text, audio, or video",
    hubBlurb:
      "Create images from prompts, add text overlays, export static or video posts.",
  },
  pomegranate: {
    id: "pomegranate",
    name: "Pomegranate",
    logoUrl: POMEGRANATE_LOGO_URL,
    logoWide: true,
    logoDarkBg: true,
    workflowMode: "fashion",
    defaultPharmacyName: "Pomegranate",
    templateIndustry: "fashion",
    description: "Fashion lookbook — models wearing your designs for social",
    hubBlurb:
      "Upload clothing photos, generate model shots with your Pomegranate branding, then add audio and video for TikTok, Facebook, and more.",
  },
};

export const BRAND_LIST = Object.values(BRANDS);

export const AGENCY_STOCK_IMAGE_URL = "/branding/agency-blank.jpg";

export function isBrandId(value: string): value is BrandId {
  return value === "ekem" || value === "vonwillingh" || value === "pomegranate";
}

export function getBrand(id?: string | null): BrandConfig | undefined {
  if (!id || !isBrandId(id)) return undefined;
  return BRANDS[id];
}

export function inferBrandId(
  settings: Partial<ProjectSettings>,
  projectName?: string
): BrandId {
  if (projectName && /pomegranate/i.test(projectName)) {
    return "pomegranate";
  }
  if (projectName && /vonwillingh/i.test(projectName)) {
    return "vonwillingh";
  }
  if (settings.workflowMode === "fashion" || settings.brandId === "pomegranate") {
    return "pomegranate";
  }
  if (/pomegranate/i.test(settings.pharmacyName || "")) {
    return "pomegranate";
  }
  if (settings.workflowMode === "agency") {
    return "vonwillingh";
  }
  if (/vonwillingh/i.test(settings.pharmacyName || "")) {
    return "vonwillingh";
  }
  if (settings.brandId === "vonwillingh") {
    return "vonwillingh";
  }
  return "ekem";
}

export function inferWorkflowMode(settings: Partial<ProjectSettings>): WorkflowMode {
  if (
    settings.workflowMode === "agency" ||
    settings.workflowMode === "pharmacy" ||
    settings.workflowMode === "fashion"
  ) {
    return settings.workflowMode;
  }
  const brandId = inferBrandId(settings);
  return BRANDS[brandId].workflowMode;
}

/** Normalize brand fields on load so legacy projects keep working. */
export function applyBrandDefaults(
  settings: ProjectSettings,
  projectName?: string
): ProjectSettings {
  const brandId = inferBrandId(settings, projectName);
  const brand = BRANDS[brandId];
  const workflowMode = inferWorkflowMode({ ...settings, brandId });
  const next: ProjectSettings = {
    ...settings,
    brandId,
    workflowMode,
    pharmacyName: settings.pharmacyName || brand.defaultPharmacyName,
  };
  if (workflowMode === "agency" && !next.postFormat) {
    next.postFormat = resolveAgencyPostFormat(next);
  }
  return next;
}

export function settingsForBrand(brandId: BrandId): Partial<ProjectSettings> {
  const brand = BRANDS[brandId];
  return {
    brandId,
    workflowMode: brand.workflowMode,
    pharmacyName: brand.defaultPharmacyName,
    imageStyle: "professional",
    visualStyleId:
      brandId === "vonwillingh"
        ? "agency-pro-studio"
        : brandId === "pomegranate"
          ? "fashion-pro-studio"
          : "pharm-pro-shelf",
    selectedImageModelId:
      brandId === "vonwillingh" || brandId === "pomegranate"
        ? "nano-banana-2"
        : "nano-banana",
    ...(brandId === "vonwillingh"
      ? {
          postFormat: "cinematic" as const,
          videoGenerationMode: "motion" as const,
          selectedModelId: "kling-o3-standard",
        }
      : {}),
  };
}

export const BRAND_BY_INDUSTRY: Partial<Record<string, BrandId>> = {
  pharmacy: "ekem",
  agency: "vonwillingh",
  fashion: "pomegranate",
};

export function projectMatchesBrand(
  settings: ProjectSettings,
  brandId: BrandId,
  projectName?: string
): boolean {
  return inferBrandId(settings, projectName) === brandId;
}
