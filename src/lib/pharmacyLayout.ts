import { EKEM_LOGO_URL } from "@/lib/brands";
import { createTextLayer, type TextLayer } from "@/lib/types";

export const PHARMACY_LOGO_URL = EKEM_LOGO_URL;

/** E-KEM pharmacy ad layout: logo + headline, subhead, price, CTA. */
export function buildPharmacyLayout(pharmacyName = "E-KEM PHARMACY"): TextLayer[] {
  return [
    {
      id: crypto.randomUUID(),
      layerType: "image",
      imageUrl: PHARMACY_LOGO_URL,
      imageWidth: 0.3,
      text: "",
      x: 0.5,
      y: 0.055,
      fontSize: 0,
      color: "#000000",
      align: "center",
      fontWeight: "normal",
      background: false,
    },
    createTextLayer({
      text: pharmacyName,
      x: 0.5,
      y: 0.11,
      fontSize: 26,
      color: "#c41e3a",
      align: "center",
      fontWeight: "bold",
      fontFamily: "oswald",
      background: false,
      maxWidth: 0.95,
    }),
    createTextLayer({
      text: "We're here for you!",
      x: 0.5,
      y: 0.155,
      fontSize: 18,
      color: "#1a1a1a",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
    }),
    createTextLayer({
      text: "R129.98",
      x: 0.82,
      y: 0.55,
      fontSize: 24,
      color: "#c41e3a",
      align: "right",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
    }),
    createTextLayer({
      text: "Available Now",
      x: 0.5,
      y: 0.92,
      fontSize: 20,
      color: "#0d9488",
      align: "center",
      fontWeight: "bold",
      fontFamily: "montserrat",
      background: false,
    }),
  ];
}
