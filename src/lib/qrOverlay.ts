import type { TextLayer } from "@/lib/types";
import { loadImage } from "@/lib/canvas-utils";
import QRCode from "qrcode";

/** Fixed bottom-left slot — text layers should stay outside this zone. */
export const FIXED_QR_LAYOUT = {
  x: 0.04,
  y: 0.86,
  sizeFraction: 0.14,
} as const;

export const FIXED_QR_MAP_KEY = "fixed:qr";

export function getFixedQrPixelRect(canvasW: number, canvasH: number) {
  const size = Math.round(canvasW * FIXED_QR_LAYOUT.sizeFraction);
  const x = Math.round(FIXED_QR_LAYOUT.x * canvasW);
  const y = Math.round(FIXED_QR_LAYOUT.y * canvasH);
  return { x, y, size };
}

/** First CTA layer with QR explicitly enabled and a resolvable link. */
export function findQrSourceLayer(layers: TextLayer[]): TextLayer | null {
  for (const layer of layers) {
    if (layer.showQr !== true) continue;
    if (resolveCtaQrUrl(layer)) return layer;
  }
  return null;
}

export function shouldRenderProjectQr(layers: TextLayer[]): boolean {
  return findQrSourceLayer(layers) !== null;
}

/** Resolve URL for QR encoding (WhatsApp wa.me, tel:, etc.). */
export function resolveCtaQrUrl(layer: TextLayer): string | null {
  const url = layer.linkUrl?.trim();
  if (!url) return null;
  if (layer.linkType === "phone") {
    const digits = url.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : null;
  }
  if (layer.linkType === "whatsapp" && !url.startsWith("http")) {
    const digits = url.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  }
  return url;
}

export async function createQrImage(
  url: string,
  size = 160
): Promise<HTMLImageElement> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return loadImage(dataUrl);
}

/** Single project QR at fixed position, keyed by `fixed:qr`. */
export async function loadQrOverlayImages(
  layers: TextLayer[],
  timeoutMs = 15_000
): Promise<Map<string, HTMLImageElement>> {
  const layer = findQrSourceLayer(layers);
  if (!layer) return new Map();
  const url = resolveCtaQrUrl(layer);
  if (!url) return new Map();
  const img = await createQrImage(url);
  void timeoutMs;
  return new Map([[FIXED_QR_MAP_KEY, img]]);
}
