import type { TextLayer } from "@/lib/types";
import { loadImage } from "@/lib/canvas-utils";
import QRCode from "qrcode";

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

/** QR images keyed by `${layerId}:qr` for canvas export. */
export async function loadQrOverlayImages(
  layers: TextLayer[],
  timeoutMs = 15_000
): Promise<Map<string, HTMLImageElement>> {
  const entries: [string, HTMLImageElement][] = [];
  for (const layer of layers) {
    if (!layer.showQr) continue;
    const url = resolveCtaQrUrl(layer);
    if (!url) continue;
    const img = await createQrImage(url);
    entries.push([`${layer.id}:qr`, img]);
    void timeoutMs;
  }
  return new Map(entries);
}
