import type { CSSProperties } from "react";
import type { TextEffect } from "@/lib/types";

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

export function isLightColor(color: string): boolean {
  const rgb = parseHexColor(color);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55;
}

export function contrastingStrokeColor(fillColor: string): string {
  return isLightColor(fillColor) ? "#000000" : "#ffffff";
}

export function autoGlowColor(fillColor: string): string {
  return isLightColor(fillColor) ? "#000000" : "#ffffff";
}

export function resolveGlowColor(fillColor: string, glowColor?: string): string {
  return glowColor?.trim() || autoGlowColor(fillColor);
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function resolveBackgroundFill(
  backgroundColor?: string,
  backgroundOpacity?: number
): string {
  const hex = backgroundColor?.trim() || "#000000";
  const opacity =
    backgroundOpacity !== undefined
      ? Math.max(0, Math.min(1, backgroundOpacity))
      : 0.65;
  return hexToRgba(hex, opacity);
}

export function glowCssShadows(glowColor: string): string {
  const c = glowColor.startsWith("#") ? hexToRgba(glowColor, 0.95) : glowColor;
  const soft = glowColor.startsWith("#") ? hexToRgba(glowColor, 0.55) : glowColor;
  return `0 0 6px ${c}, 0 0 14px ${soft}, 0 0 24px ${soft}`;
}

function parseFontSizePx(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 16;
}

export function drawCanvasTextWithEffect(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  effect: TextEffect | undefined,
  fillColor: string,
  glowColor?: string
): void {
  const resolved = effect || "none";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (resolved === "outline") {
    const stroke = contrastingStrokeColor(fillColor);
    const fontSize = parseFontSizePx(ctx.font);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, Math.round(fontSize / 14));
    ctx.lineJoin = "round";
    ctx.strokeText(line, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(line, x, y);
    return;
  }

  if (resolved === "glow") {
    ctx.shadowColor = resolveGlowColor(fillColor, glowColor);
    ctx.shadowBlur = Math.max(8, Math.round(parseFontSizePx(ctx.font) / 3));
  } else if (resolved === "shadow") {
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillStyle = fillColor;
  ctx.fillText(line, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function cssTextEffectStyle(
  effect: TextEffect | undefined,
  fillColor: string,
  glowColor?: string
): CSSProperties {
  const resolved = effect || "none";
  if (resolved === "none") return {};

  if (resolved === "glow") {
    const glow = resolveGlowColor(fillColor, glowColor);
    return {
      textShadow: glowCssShadows(glow),
    };
  }

  if (resolved === "outline") {
    const stroke = contrastingStrokeColor(fillColor);
    return {
      WebkitTextStroke: `1px ${stroke}`,
      paintOrder: "stroke fill",
    };
  }

  if (resolved === "shadow") {
    return {
      textShadow: "0 2px 4px rgba(0, 0, 0, 0.65), 0 1px 8px rgba(0, 0, 0, 0.35)",
    };
  }

  return {};
}
