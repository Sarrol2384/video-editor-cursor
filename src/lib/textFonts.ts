export type TextFontId =
  | "system"
  | "arial"
  | "georgia"
  | "impact"
  | "montserrat"
  | "oswald"
  | "playfair"
  | "bebas";

export interface TextFontOption {
  id: TextFontId;
  label: string;
  family: string;
}

export const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { id: "system", label: "System Default", family: "system-ui, -apple-system, sans-serif" },
  { id: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  { id: "georgia", label: "Georgia (Serif)", family: 'Georgia, "Times New Roman", serif' },
  {
    id: "impact",
    label: "Impact",
    family: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  },
  { id: "montserrat", label: "Montserrat", family: '"Montserrat", sans-serif' },
  { id: "oswald", label: "Oswald", family: '"Oswald", sans-serif' },
  { id: "playfair", label: "Playfair Display", family: '"Playfair Display", serif' },
  { id: "bebas", label: "Bebas Neue", family: '"Bebas Neue", sans-serif' },
];

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&display=swap";

export function resolveTextFontFamily(fontFamily?: string): string {
  const option = TEXT_FONT_OPTIONS.find((f) => f.id === fontFamily);
  return option?.family ?? TEXT_FONT_OPTIONS[0].family;
}

/** Map design fontSize (reference 480px tall frame) to canvas pixels. */
export function scaleTextSize(fontSize: number, canvasHeight: number): number {
  return Math.max(1, Math.round((fontSize / 480) * canvasHeight));
}

export function buildCanvasFont(
  layer: { fontWeight: string; fontSize: number; fontFamily?: string },
  canvasHeight: number
): string {
  const px = scaleTextSize(layer.fontSize, canvasHeight);
  const family = resolveTextFontFamily(layer.fontFamily);
  return `${layer.fontWeight} ${px}px ${family}`;
}

/** Wait for web fonts used by text layers before canvas export burn-in. */
export async function waitForExportFonts(
  layers: { layerType?: string; fontFamily?: string }[]
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const families = new Set<string>();
  for (const layer of layers) {
    if (layer.layerType === "image") continue;
    families.add(resolveTextFontFamily(layer.fontFamily));
  }

  await Promise.all(
    Array.from(families).map((family) =>
      document.fonts.load(`700 24px ${family}`).catch(() => undefined)
    )
  );
  await document.fonts.ready;
}

export function overlayAlignTransform(align: "left" | "center" | "right"): string {
  if (align === "left") return "translate(0, -50%)";
  if (align === "right") return "translate(-100%, -50%)";
  return "translate(-50%, -50%)";
}
