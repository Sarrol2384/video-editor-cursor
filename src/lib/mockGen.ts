import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export type ImageStyle = "professional" | "lifestyle" | "minimalist" | "vibrant";

export interface ImageVariant {
  id: string;
  style: ImageStyle;
  label: string;
  filter: string;
  background: string;
  storageUrl?: string;
  prompt?: string;
}

export interface VideoGenParams {
  duration: number;
  aspectRatio: string;
  resolution: string;
  motionIntensity: "low" | "medium" | "high";
  freezeProduct: boolean;
  freezeText: boolean;
  overlayText: string;
  imageFit?: "contain" | "cover";
  textLayers?: unknown[];
  backgroundPrompt: string;
  motionPrompt?: string;
  provider?: string;
  videoUrl?: string;
}

export interface AudioGenParams {
  script: string;
  voice: string;
  tone: string;
  musicMood: string;
}

const STYLE_VARIANTS: ImageVariant[] = [
  {
    id: "professional",
    style: "professional",
    label: "Professional",
    filter: "brightness(1.05) contrast(1.1) saturate(0.95)",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
  },
  {
    id: "lifestyle",
    style: "lifestyle",
    label: "Lifestyle",
    filter: "brightness(1.1) contrast(1.05) saturate(1.2)",
    background: "linear-gradient(135deg, #fef3e2 0%, #fde8d0 100%)",
  },
  {
    id: "minimalist",
    style: "minimalist",
    label: "Minimalist",
    filter: "brightness(1.08) contrast(0.95) saturate(0.8)",
    background: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)",
  },
  {
    id: "vibrant",
    style: "vibrant",
    label: "Vibrant",
    filter: "brightness(1.15) contrast(1.15) saturate(1.4)",
    background: "linear-gradient(135deg, #e0f2fe 0%, #fce7f3 100%)",
  },
];

export function generateImageVariants(
  sourceUrl: string,
  style?: ImageStyle
): ImageVariant[] {
  const match =
    STYLE_VARIANTS.find((v) => v.style === (style || "professional")) ||
    STYLE_VARIANTS[0];
  return [{ ...match, id: uuidv4() }];
}

export async function simulateDelay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildVideoMetadata(params: VideoGenParams) {
  return {
    type: "video",
    mock: params.provider ? params.provider === "mock" : true,
    provider: params.provider,
    videoUrl: params.videoUrl,
    duration: params.duration,
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    motionIntensity: params.motionIntensity,
    freezeProduct: params.freezeProduct,
    freezeText: params.freezeText,
    overlayText: params.overlayText,
    imageFit: params.imageFit,
    textLayers: params.textLayers,
    backgroundPrompt: params.backgroundPrompt,
    motionPrompt: params.motionPrompt,
    generatedAt: new Date().toISOString(),
  };
}

export function buildAudioMetadata(params: AudioGenParams) {
  return {
    type: "audio",
    mock: true,
    script: params.script,
    voice: params.voice,
    tone: params.tone,
    musicMood: params.musicMood,
    generatedAt: new Date().toISOString(),
  };
}

export async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export const MUSIC_MOODS = [
  { id: "uplifting", label: "Uplifting", bpm: 120 },
  { id: "calm", label: "Calm", bpm: 80 },
  { id: "professional", label: "Professional", bpm: 100 },
  { id: "energetic", label: "Energetic", bpm: 140 },
];

export const VOICE_OPTIONS = [
  { id: "professional-f", label: "Professional (Female)", tone: "professional" },
  { id: "professional-m", label: "Professional (Male)", tone: "professional" },
  { id: "warm-f", label: "Warm (Female)", tone: "warm" },
  { id: "warm-m", label: "Warm (Male)", tone: "warm" },
  { id: "energetic-f", label: "Energetic (Female)", tone: "energetic" },
  { id: "energetic-m", label: "Energetic (Male)", tone: "energetic" },
];
