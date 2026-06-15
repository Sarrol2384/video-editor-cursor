import type { TextFontId } from "@/lib/textFonts";
import { applyBrandDefaults } from "@/lib/brands";
import type { BrandId, WorkflowMode } from "@/lib/brands";
import type { VideoMode } from "@/lib/models";
import type { AgencyPostFormat } from "@/lib/agencyPostFormat";

export type TextLayerType = "text" | "image";
export type TextEffect = "none" | "glow" | "outline" | "shadow";
export type CtaLinkType = "whatsapp" | "website" | "phone" | "custom";

export interface TextLayer {
  id: string;
  layerType?: TextLayerType;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontFamily?: TextFontId;
  background: boolean;
  /** Panel colour behind text when background is enabled. */
  backgroundColor?: string;
  /** Panel opacity 0–1 when background is enabled. */
  backgroundOpacity?: number;
  /** Max line width as fraction of canvas width (e.g. 0.42 = 42%). */
  maxWidth?: number;
  textEffect?: TextEffect;
  /** Glow halo colour when textEffect is "glow". Any CSS colour (hex recommended). */
  glowColor?: string;
  /** Logo/image overlay — width as a fraction of canvas width (e.g. 0.3 = 30%). */
  imageUrl?: string;
  imageWidth?: number;
  /** Optional click target — visual in MP4; clickable on share page. */
  linkUrl?: string;
  linkType?: CtaLinkType;
  /** Burn a small QR code near this layer (encodes linkUrl). */
  showQr?: boolean;
}

export interface ProjectSettings {
  aspectRatio: string;
  duration: number;
  resolution: string;
  motionIntensity: "low" | "medium" | "high";
  freezeProduct: boolean;
  freezeText: boolean;
  overlayText: string;
  imageFit: "contain" | "cover";
  textLayers: TextLayer[];
  scenePrompt: string;
  benefitsPrompt: string;
  backgroundPrompt: string;
  subjectPrompt: string;
  motionPrompt: string;
  generatedVideoUrl?: string;
  selectedModelId?: string;
  selectedImageModelId?: string;
  selectedImageVariantId?: string;
  selectedImageUrl?: string;
  sourceImageUrl?: string;
  imageStyle?: string;
  /** Selected visual style chip — lighting look for image generation. */
  visualStyleId?: string;
  narrationScript?: string;
  voiceId?: string;
  /** voiceId used when generatedNarrationUrl was last created */
  generatedNarrationVoiceId?: string;
  musicMood?: string;
  generatedNarrationUrl?: string;
  /** Seconds — measured after audio generation; use for export length hints. */
  generatedNarrationDuration?: number;
  narrationVolume?: number;
  musicVolume?: number;
  priority?: "cost" | "speed" | "quality" | "balanced";
  /** Product name on pack — drives narration & text suggestions (e.g. Centrex Sleep Support). */
  productName?: string;
  /** Business / brand name shown in layout (e.g. E-KEM PHARMACY, VonWillingh Online). */
  pharmacyName?: string;
  brandId?: BrandId;
  workflowMode?: WorkflowMode;
  /** Agency: static image, cinematic motion video, or talking-head lip-sync */
  postFormat?: AgencyPostFormat;
  /** motion = cinematic scene; avatar = lip-sync talking head (agency) */
  videoGenerationMode?: VideoMode;
  /** True when generated video already contains synced speech (avatar models). */
  videoHasEmbeddedAudio?: boolean;
  /** Crop lower third on talking-head preview/export to hide garbled Kling subtitles. */
  hideAvatarSubtitles?: boolean;
  /** Unguessable token for public /share/[token] page. */
  shareToken?: string;
  /** Last exported MP4 URL shown on the share page. */
  shareExportUrl?: string;
}

export const DEFAULT_TEXT_LAYERS: TextLayer[] = [
  {
    id: "headline",
    text: "E-KEM PHARMACY",
    x: 0.5,
    y: 0.08,
    fontSize: 28,
    color: "#c41e3a",
    align: "center",
    fontWeight: "bold",
    fontFamily: "oswald",
    background: false,
  },
  {
    id: "subheadline",
    text: "We're here for you!",
    x: 0.5,
    y: 0.14,
    fontSize: 18,
    color: "#1a1a1a",
    align: "center",
    fontWeight: "bold",
    fontFamily: "montserrat",
    background: false,
  },
  {
    id: "price",
    text: "R129.98",
    x: 0.82,
    y: 0.55,
    fontSize: 24,
    color: "#c41e3a",
    align: "right",
    fontWeight: "bold",
    fontFamily: "montserrat",
    background: false,
  },
  {
    id: "cta",
    text: "Available Now",
    x: 0.5,
    y: 0.92,
    fontSize: 20,
    color: "#0d9488",
    align: "center",
    fontWeight: "bold",
    fontFamily: "montserrat",
    background: false,
  },
];

export const DEFAULT_SETTINGS: ProjectSettings = {
  aspectRatio: "9:16",
  duration: 8,
  resolution: "1080p",
  motionIntensity: "medium",
  freezeProduct: true,
  freezeText: true,
  overlayText: "",
  imageFit: "contain",
  textLayers: [],
  scenePrompt:
    "Cozy living room, warm evening light. Parent and child in sharp focus mid-shot on sofa — faces clearly visible, caring wellness moment. Product on side table in foreground.",
  benefitsPrompt:
    "Natural sleep support, non-habit forming, herbal ingredients, pharmacist recommended.",
  productName: "",
  pharmacyName: "E-KEM PHARMACY",
  backgroundPrompt:
    "Warm interior; people sharp in mid-ground, only distant background softly blurred.",
  subjectPrompt:
    "Product sharp and readable on side table, foreground right. Parent and child in focus mid-left, faces and expressions clearly visible.",
  motionPrompt:
    "Cinematic camera push-in with gentle parallax. Living scene — soft lighting shifts, natural breathing and gestures, curtains and background in gentle motion.",
  narrationScript: "",
  voiceId: "professional-f",
  musicMood: "professional",
  narrationVolume: 100,
  musicVolume: 40,
  priority: "balanced",
  selectedModelId: "kling-o3-standard",
  selectedImageModelId: "nano-banana",
  brandId: "ekem",
  workflowMode: "pharmacy",
};

export function createTextLayer(overrides?: Partial<TextLayer>): TextLayer {
  return {
    id: crypto.randomUUID(),
    text: "New text",
    x: 0.5,
    y: 0.5,
    fontSize: 20,
    color: "#ffffff",
    align: "center",
    fontWeight: "bold",
    fontFamily: "system",
    background: true,
    backgroundColor: "#000000",
    backgroundOpacity: 0.65,
    maxWidth: 0.42,
    textEffect: "none",
    ...overrides,
  };
}

function normalizeTextLayer(layer: TextLayer): TextLayer {
  return {
    ...layer,
    layerType: layer.layerType || "text",
    fontFamily: layer.fontFamily || "system",
    maxWidth: layer.maxWidth ?? 0.42,
    textEffect: layer.textEffect || "none",
    backgroundColor: layer.backgroundColor || "#000000",
    backgroundOpacity:
      layer.backgroundOpacity !== undefined ? layer.backgroundOpacity : 0.65,
  };
}

export function migrateOverlayText(settings: Partial<ProjectSettings>): TextLayer[] {
  if (settings.textLayers && settings.textLayers.length > 0) {
    return settings.textLayers;
  }
  if (settings.overlayText) {
    return [
      createTextLayer({
        id: "legacy-overlay",
        text: settings.overlayText,
        x: 0.5,
        y: 0.92,
        fontSize: 18,
        color: "#ffffff",
        align: "center",
        fontWeight: "bold",
        background: true,
      }),
    ];
  }
  return [];
}

export function parseSettings(json: string, projectName?: string): ProjectSettings {
  try {
    const parsed = JSON.parse(json) as Partial<ProjectSettings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (merged.generatedVideoUrl === null) delete merged.generatedVideoUrl;
    if (merged.videoHasEmbeddedAudio === null) delete merged.videoHasEmbeddedAudio;
    merged.textLayers = migrateOverlayText(merged).map(normalizeTextLayer);
    if (!merged.imageFit) merged.imageFit = "contain";
    return applyBrandDefaults(merged, projectName);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
