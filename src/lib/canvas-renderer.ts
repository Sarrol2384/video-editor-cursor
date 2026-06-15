import type { ProjectSettings, TextLayer } from "@/lib/types";
import { computeCoverTopRect, computeImageRect, getMotionScale } from "@/lib/canvas-utils";
import {
  AVATAR_SUBTITLE_CROP_RATIO,
  shouldHideAvatarSubtitles,
} from "@/lib/avatarSubtitles";
import { drawCanvasTextWithEffect, resolveBackgroundFill } from "@/lib/textEffects";
import { buildCanvasFont, scaleTextSize } from "@/lib/textFonts";
import {
  DEFAULT_TEXT_MAX_WIDTH,
  layoutWrappedText,
} from "@/lib/textWrap";

function drawLetterboxBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const drawW = (layer.imageWidth || 0.25) * canvasW;
  const aspect = img.naturalHeight / img.naturalWidth || 1;
  const drawH = drawW * aspect;
  const anchorX = layer.x * canvasW;
  const anchorY = layer.y * canvasH;

  let drawX = anchorX - drawW / 2;
  if (layer.align === "left") drawX = anchorX;
  if (layer.align === "right") drawX = anchorX - drawW;

  ctx.drawImage(img, drawX, anchorY - drawH / 2, drawW, drawH);
}

function lineXForAlign(
  align: TextLayer["align"],
  anchorX: number,
  lineWidth: number,
  blockWidth: number
): number {
  if (align === "left") return anchorX;
  if (align === "right") return anchorX - lineWidth;
  const blockLeft = anchorX - blockWidth / 2;
  return blockLeft + (blockWidth - lineWidth) / 2;
}

function drawQrBadge(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  qrImg: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const size = Math.round(canvasW * 0.12);
  const anchorX = layer.x * canvasW;
  const anchorY = layer.y * canvasH;
  const gap = 8;
  let x = anchorX + gap;
  let y = anchorY + gap;
  if (layer.align === "center") x = anchorX - size / 2;
  if (layer.align === "right") x = anchorX - size - gap;
  if (y + size > canvasH - 4) y = canvasH - size - 4;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  ctx.drawImage(qrImg, x, y, size, size);
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  canvasW: number,
  canvasH: number,
  progress: number,
  freezeText: boolean
) {
  if (!layer.text) return;

  const fontSize = scaleTextSize(layer.fontSize, canvasH);
  const anchorX = layer.x * canvasW;
  const anchorY = layer.y * canvasH;
  const wobble = freezeText ? 0 : Math.sin(progress * Math.PI * 4) * 4;
  const maxWidthPx = (layer.maxWidth ?? DEFAULT_TEXT_MAX_WIDTH) * canvasW;

  ctx.font = buildCanvasFont(layer, canvasH);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const block = layoutWrappedText(ctx, layer.text, maxWidthPx, fontSize);
  const layoutWidth = Math.max(block.blockWidth, maxWidthPx);
  const textX = anchorX + wobble;
  const topY = anchorY - block.blockHeight / 2;

  if (layer.background) {
    const padX = 16;
    const padY = 8;
    let boxX = textX - layoutWidth / 2 - padX;
    if (layer.align === "left") boxX = textX - padX;
    if (layer.align === "right") boxX = textX - layoutWidth - padX;

    ctx.fillStyle = resolveBackgroundFill(
      layer.backgroundColor,
      layer.backgroundOpacity
    );
    ctx.fillRect(
      boxX,
      topY - padY,
      layoutWidth + padX * 2,
      block.blockHeight + padY * 2
    );
  }

  block.lines.forEach((line, index) => {
    const lineWidth = block.lineWidths[index] ?? 0;
    const lineY = topY + block.lineHeight * index + block.lineHeight / 2;
    const lineX = lineXForAlign(layer.align, textX, lineWidth, layoutWidth);
    drawCanvasTextWithEffect(
      ctx,
      line,
      lineX,
      lineY,
      layer.textEffect,
      layer.color,
      layer.glowColor
    );
  });
}

function getEffectiveLayers(settings: ProjectSettings): TextLayer[] {
  if (settings.textLayers?.length) return settings.textLayers;
  if (settings.overlayText) {
    return [
      {
        id: "legacy",
        text: settings.overlayText,
        x: 0.5,
        y: 0.92,
        fontSize: 18,
        color: "#ffffff",
        align: "center" as const,
        fontWeight: "bold" as const,
        background: true,
      },
    ];
  }
  return [];
}

export function renderOverlayLayers(
  ctx: CanvasRenderingContext2D,
  settings: ProjectSettings,
  progress: number,
  canvasW: number,
  canvasH: number,
  overlayImages?: Map<string, HTMLImageElement>
) {
  for (const layer of getEffectiveLayers(settings)) {
    if (layer.layerType === "image" && layer.imageUrl) {
      const img = overlayImages?.get(layer.id);
      if (img) drawImageLayer(ctx, layer, img, canvasW, canvasH);
      const qrImg = overlayImages?.get(`${layer.id}:qr`);
      if (qrImg) drawQrBadge(ctx, layer, qrImg, canvasW, canvasH);
      continue;
    }
    drawTextLayer(ctx, layer, canvasW, canvasH, progress, settings.freezeText);
    const qrImg = overlayImages?.get(`${layer.id}:qr`);
    if (qrImg) drawQrBadge(ctx, layer, qrImg, canvasW, canvasH);
  }
}

/** @deprecated Use renderOverlayLayers */
export function renderTextLayers(
  ctx: CanvasRenderingContext2D,
  settings: ProjectSettings,
  progress: number,
  canvasW: number,
  canvasH: number,
  overlayImages?: Map<string, HTMLImageElement>
) {
  renderOverlayLayers(ctx, settings, progress, canvasW, canvasH, overlayImages);
}

export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  settings: ProjectSettings,
  progress: number,
  canvasW: number,
  canvasH: number,
  overlayImages?: Map<string, HTMLImageElement>
) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const vw = video.videoWidth || canvasW;
  const vh = video.videoHeight || canvasH;
  const fit = settings.imageFit || "contain";
  const hideSubs = shouldHideAvatarSubtitles(settings);
  const sourceHeight = hideSubs ? vh * AVATAR_SUBTITLE_CROP_RATIO : vh;

  const rect = hideSubs
    ? computeCoverTopRect(vw, sourceHeight, canvasW, canvasH)
    : fit === "cover"
      ? computeCoverTopRect(vw, sourceHeight, canvasW, canvasH)
      : computeImageRect(vw, sourceHeight, canvasW, canvasH, "contain", 1, 0, 0);

  ctx.drawImage(
    video,
    0,
    0,
    vw,
    sourceHeight,
    rect.x,
    rect.y,
    rect.width,
    rect.height
  );

  renderOverlayLayers(ctx, settings, progress, canvasW, canvasH, overlayImages);
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  settings: ProjectSettings,
  progress: number,
  canvasW: number,
  canvasH: number,
  options?: { skipTextLayers?: boolean; overlayImages?: Map<string, HTMLImageElement> }
) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  drawLetterboxBackground(ctx, canvasW, canvasH);

  const motion = getMotionScale(settings.motionIntensity, progress);
  const fit = settings.imageFit || "contain";

  if (settings.freezeProduct) {
    const rect = computeImageRect(img.width, img.height, canvasW, canvasH, fit, 1, 0, 0);
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
  } else {
    const rect = computeImageRect(
      img.width,
      img.height,
      canvasW,
      canvasH,
      fit,
      motion.scale,
      motion.offsetX,
      motion.offsetY
    );
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
  }

  if (!options?.skipTextLayers) {
    renderOverlayLayers(
      ctx,
      settings,
      progress,
      canvasW,
      canvasH,
      options?.overlayImages
    );
  }
}
