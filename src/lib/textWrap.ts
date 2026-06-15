export const DEFAULT_TEXT_MAX_WIDTH = 0.42;
export const TEXT_LINE_HEIGHT_RATIO = 1.25;

export function lineHeightPx(fontSize: number): number {
  return Math.round(fontSize * TEXT_LINE_HEIGHT_RATIO);
}

/** Word-wrap text to fit maxWidthPx; respects manual line breaks. */
export function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim() ? paragraph.split(/\s+/) : [""];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidthPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    else if (paragraph === "") lines.push("");
  }

  return lines.length ? lines : [""];
}

export function measureLineWidths(
  ctx: CanvasRenderingContext2D,
  lines: string[]
): number[] {
  return lines.map((line) => ctx.measureText(line).width);
}

export interface WrappedTextBlock {
  lines: string[];
  lineWidths: number[];
  blockWidth: number;
  blockHeight: number;
  lineHeight: number;
}

export function layoutWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
  fontSize: number
): WrappedTextBlock {
  const lines = wrapTextLines(ctx, text, maxWidthPx);
  const lineWidths = measureLineWidths(ctx, lines);
  const lineHeight = lineHeightPx(fontSize);
  return {
    lines,
    lineWidths,
    blockWidth: Math.max(0, ...lineWidths),
    blockHeight: lines.length * lineHeight,
    lineHeight,
  };
}
