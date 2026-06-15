import { VONWILLINGH_LOGO_URL, POMEGRANATE_LOGO_URL } from "@/lib/brands";
import { buildPharmacyLayout } from "@/lib/pharmacyLayout";
import { createTextLayer, type TextLayer } from "@/lib/types";

export { VONWILLINGH_LOGO_URL, POMEGRANATE_LOGO_URL };

export function isAgencyBrand(brandName?: string): boolean {
  return /vonwillingh/i.test(brandName || "");
}

export function isFashionBrand(brandName?: string): boolean {
  return /pomegranate/i.test(brandName || "");
}

/** VonWillingh Online agency ad: logo, headline, tagline, CTA. */
export function buildVonWillinghLayout(
  brandName = "VonWillingh Online"
): TextLayer[] {
  return [
    {
      id: crypto.randomUUID(),
      layerType: "image",
      imageUrl: VONWILLINGH_LOGO_URL,
      imageWidth: 0.42,
      text: "",
      x: 0.5,
      y: 0.075,
      fontSize: 0,
      color: "#000000",
      align: "center",
      fontWeight: "normal",
      background: false,
    },
    createTextLayer({
      text: brandName,
      x: 0.5,
      y: 0.14,
      fontSize: 24,
      color: "#1e3a5f",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
      maxWidth: 0.92,
    }),
    createTextLayer({
      text: "Custom web apps for SA businesses",
      x: 0.5,
      y: 0.2,
      fontSize: 16,
      color: "#475569",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
      maxWidth: 0.9,
    }),
    createTextLayer({
      text: "Get a free quote",
      x: 0.5,
      y: 0.9,
      fontSize: 20,
      color: "#d4a853",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
    }),
  ];
}

/** Pomegranate fashion ad: logo, collection headline, tagline, CTA. */
export function buildPomegranateLayout(brandName = "Pomegranate"): TextLayer[] {
  return [
    {
      id: crypto.randomUUID(),
      layerType: "image",
      imageUrl: POMEGRANATE_LOGO_URL,
      imageWidth: 0.38,
      text: "",
      x: 0.5,
      y: 0.08,
      fontSize: 0,
      color: "#000000",
      align: "center",
      fontWeight: "normal",
      background: false,
    },
    createTextLayer({
      text: brandName,
      x: 0.5,
      y: 0.15,
      fontSize: 22,
      color: "#7f1d1d",
      align: "center",
      fontWeight: "bold",
      fontFamily: "playfair",
      background: false,
      maxWidth: 0.9,
    }),
    createTextLayer({
      text: "Handmade fashion & accessories",
      x: 0.5,
      y: 0.21,
      fontSize: 15,
      color: "#44403c",
      align: "center",
      fontWeight: "normal",
      fontFamily: "montserrat",
      background: false,
      maxWidth: 0.88,
    }),
    createTextLayer({
      text: "Shop the collection",
      x: 0.5,
      y: 0.9,
      fontSize: 18,
      color: "#b45309",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
    }),
  ];
}

/** Pick pharmacy, agency, or fashion overlay layout from brand name. */
export function buildBrandLayout(brandName?: string): TextLayer[] {
  if (isAgencyBrand(brandName)) {
    return buildVonWillinghLayout(brandName?.trim() || "VonWillingh Online");
  }
  if (isFashionBrand(brandName)) {
    return buildPomegranateLayout(brandName?.trim() || "Pomegranate");
  }
  return buildPharmacyLayout(brandName);
}
