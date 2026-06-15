import type { TextLayer } from "@/lib/types";

export interface ImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getAspectDimensions(
  aspectRatio: string,
  shortEdge = 720
): { width: number; height: number } {
  const ratios: Record<string, number> = {
    "1:1": 1,
    "16:9": 16 / 9,
    "9:16": 9 / 16,
    "4:3": 4 / 3,
    "3:4": 3 / 4,
    "21:9": 21 / 9,
  };
  const ratio = ratios[aspectRatio] || 9 / 16;

  if (ratio >= 1) {
    const height = shortEdge;
    return { width: Math.round(height * ratio), height };
  }

  const width = shortEdge;
  return { width, height: Math.round(width / ratio) };
}

export function getCanvasBaseWidth(resolution: string): number {
  const map: Record<string, number> = {
    "720p": 720,
    "1080p": 1080,
    "4K": 2160,
  };
  return map[resolution] || 720;
}

export function getPreviewBaseWidth(resolution: string): number {
  return Math.min(getCanvasBaseWidth(resolution), 720);
}

export function getExportVideoBitrate(width: number, height: number): number {
  const pixels = width * height;
  if (pixels >= 1920 * 1080) return 12_000_000;
  if (pixels >= 1280 * 720) return 8_000_000;
  return 5_000_000;
}

const PREVIEW_MAX_HEIGHT = 560;
const PREVIEW_MAX_WIDTH = 560;
const EDITOR_PREVIEW_MAX_HEIGHT = 380;
const EDITOR_PREVIEW_MAX_WIDTH = 420;

export function getPreviewLayout(
  aspectRatio: string,
  resolution: string,
  options?: { compact?: boolean }
): {
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
} {
  const maxHeight = options?.compact
    ? EDITOR_PREVIEW_MAX_HEIGHT
    : PREVIEW_MAX_HEIGHT;
  const maxWidth = options?.compact
    ? EDITOR_PREVIEW_MAX_WIDTH
    : PREVIEW_MAX_WIDTH;
  const baseWidth = getPreviewBaseWidth(resolution);
  const { width, height } = getAspectDimensions(aspectRatio, baseWidth);
  const scale = Math.min(
    1,
    maxHeight / height,
    maxWidth / width
  );
  return {
    width,
    height,
    displayWidth: Math.round(width * scale),
    displayHeight: Math.round(height * scale),
  };
}

export function computeImageRect(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  fit: "contain" | "cover",
  scale = 1,
  offsetX = 0,
  offsetY = 0
): ImageRect {
  const imgAspect = imgW / imgH;
  const canvasAspect = canvasW / canvasH;

  let drawW: number;
  let drawH: number;

  if (fit === "contain") {
    if (imgAspect > canvasAspect) {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
    } else {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
    }
  } else {
    if (imgAspect > canvasAspect) {
      drawH = canvasH;
      drawW = canvasH * imgAspect;
    } else {
      drawW = canvasW;
      drawH = canvasW / imgAspect;
    }
  }

  drawW *= scale;
  drawH *= scale;

  return {
    x: (canvasW - drawW) / 2 + offsetX,
    y: (canvasH - drawH) / 2 + offsetY,
    width: drawW,
    height: drawH,
  };
}

/** Like CSS object-fit: cover + object-position: top center (no letterboxing). */
export function computeCoverTopRect(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
  scale = 1
): ImageRect {
  const scaleFactor = Math.max(canvasW / imgW, canvasH / imgH) * scale;
  const drawW = imgW * scaleFactor;
  const drawH = imgH * scaleFactor;
  return {
    x: (canvasW - drawW) / 2,
    y: 0,
    width: drawW,
    height: drawH,
  };
}

export function getMotionScale(
  intensity: "low" | "medium" | "high",
  progress: number
): { scale: number; offsetX: number; offsetY: number } {
  const ranges = {
    low: { scaleRange: 0.06, offsetRange: 20 },
    medium: { scaleRange: 0.16, offsetRange: 50 },
    high: { scaleRange: 0.3, offsetRange: 100 },
  };
  const { scaleRange, offsetRange } = ranges[intensity];
  const scale = 1 + scaleRange * Math.sin(progress * Math.PI * 2);
  const offsetX = offsetRange * Math.sin(progress * Math.PI);
  const offsetY = offsetRange * Math.cos(progress * Math.PI * 0.5);
  return { scale, offsetX, offsetY };
}

export async function loadImage(
  src: string,
  timeoutMs = 15_000
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => {
      reject(new Error(`Timed out loading image: ${src}`));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

export async function loadOverlayImages(
  layers: TextLayer[],
  timeoutMs = 15_000
): Promise<Map<string, HTMLImageElement>> {
  const imageLayers = layers.filter(
    (l) => l.layerType === "image" && l.imageUrl
  );
  const entries = await Promise.all(
    imageLayers.map(
      async (layer) =>
        [layer.id, await loadImage(layer.imageUrl!, timeoutMs)] as [
          string,
          HTMLImageElement,
        ]
    )
  );
  return new Map(entries);
}
