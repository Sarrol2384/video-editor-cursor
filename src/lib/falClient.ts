import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { fal } from "@fal-ai/client";
import type { XaiVoice } from "@/lib/voiceMapping";
import { normalizeAspectRatioForFal } from "@/lib/aspectRatio";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const credentials = process.env.FAL_KEY;
  if (!credentials) {
    throw new Error("FAL_KEY is not set in environment");
  }
  fal.config({ credentials });
  configured = true;
}

export function isFalConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function resolvePublicPath(urlOrPath: string): string {
  const relative = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
  return path.join(process.cwd(), "public", relative);
}

async function readLocalFile(
  urlOrPath: string
): Promise<{ buffer: Buffer; mime: string }> {
  const filePath = resolvePublicPath(urlOrPath);
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return { buffer, mime: MIME_BY_EXT[ext] || "image/jpeg" };
}

const AUDIO_MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};

/**
 * Make a local /uploads audio file available to fal as a public CDN URL.
 */
export async function uploadAudioToFal(sourceAudioUrl: string): Promise<string> {
  ensureConfigured();

  if (
    sourceAudioUrl.startsWith("http://") ||
    sourceAudioUrl.startsWith("https://")
  ) {
    return sourceAudioUrl;
  }

  const filePath = resolvePublicPath(sourceAudioUrl);
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = AUDIO_MIME_BY_EXT[ext] || "audio/mpeg";
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: mime });
  return fal.storage.upload(blob);
}

/**
 * Make a local /uploads image available to fal as a public CDN URL.
 * Remote URLs are passed through unchanged.
 */
export async function uploadImageToFal(sourceImageUrl: string): Promise<string> {
  ensureConfigured();

  if (
    sourceImageUrl.startsWith("http://") ||
    sourceImageUrl.startsWith("https://")
  ) {
    return sourceImageUrl;
  }

  const { buffer, mime } = await readLocalFile(sourceImageUrl);
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: mime });
  return fal.storage.upload(blob);
}

export interface TalkingAvatarOptions {
  falModelId: string;
  imageUrl: string;
  audioUrl: string;
  prompt?: string;
  onProgress?: (message: string) => void;
}

/**
 * Kling Avatar / talking-head — lip-syncs a portrait image to narration audio.
 */
export async function runTalkingAvatar(
  options: TalkingAvatarOptions
): Promise<string> {
  ensureConfigured();

  const input: Record<string, unknown> = {
    image_url: options.imageUrl,
    audio_url: options.audioUrl,
  };
  if (options.prompt?.trim()) {
    input.prompt = options.prompt.trim();
  }

  const result = await fal.subscribe(options.falModelId, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && options.onProgress) {
        update.logs?.forEach((log) => options.onProgress?.(log.message));
      }
    },
  });

  const data = result.data as FalVideoOutput;
  const url = data.video?.url || data.videos?.[0]?.url;
  if (!url) {
    throw new Error("fal talking avatar returned no video URL");
  }
  return url;
}

export interface ImageEditResult {
  url?: string;
  b64?: string;
}

interface FalImageOutput {
  images?: Array<{ url?: string }>;
  image?: { url?: string };
}

type BriaPlacement =
  | "upper_left"
  | "upper_right"
  | "bottom_left"
  | "bottom_right"
  | "right_center"
  | "left_center"
  | "upper_center"
  | "bottom_center"
  | "center_vertical"
  | "center_horizontal";

/**
 * Bria Product Shot — keeps the uploaded product intact and generates a new scene.
 */
export async function runBriaProductShot(options: {
  imageUrl: string;
  sceneDescription: string;
  shotSize: [number, number];
  placement?: BriaPlacement;
}): Promise<string> {
  ensureConfigured();

  const result = await fal.subscribe("fal-ai/bria/product-shot", {
    input: {
      image_url: options.imageUrl,
      scene_description: options.sceneDescription,
      ref_image_url: "",
      num_results: 1,
      fast: true,
      placement_type: "manual_placement",
      manual_placement_selection: options.placement || "bottom_center",
      shot_size: options.shotSize,
      optimize_description: true,
    },
  });

  const data = result.data as FalImageOutput;
  const url = data.images?.[0]?.url;
  if (!url) {
    throw new Error("Bria product shot returned no image URL");
  }
  return url;
}

/**
 * Edit an image with fal-hosted Nano Banana (fallback — may alter the product).
 */
export async function editImageWithFal(options: {
  prompt: string;
  imageUrl: string;
  referenceImageUrls?: string[];
  falModelId?: string;
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "4K";
}): Promise<ImageEditResult[]> {
  ensureConfigured();

  const falModelId = options.falModelId || "fal-ai/nano-banana/edit";
  const imageUrls = [options.imageUrl, ...(options.referenceImageUrls || [])];

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    image_urls: imageUrls,
    num_images: 1,
  };

  if (falModelId.includes("nano-banana-2")) {
    input.resolution = options.resolution || "1K";
    input.output_format = "png";
  }

  const aspectRatio = normalizeAspectRatioForFal(options.aspectRatio);
  if (aspectRatio !== "auto") {
    input.aspect_ratio = aspectRatio;
  }

  const result = await fal.subscribe(falModelId, {
    input,
  });

  const data = result.data as FalImageOutput;
  const images = data.images || (data.image ? [data.image] : []);
  return images
    .filter((img) => img?.url)
    .map((img) => ({ url: img.url as string }));
}

interface FalVideoOutput {
  video?: { url?: string };
  videos?: Array<{ url?: string }>;
}

export interface ImageToVideoOptions {
  falModelId: string;
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  onProgress?: (message: string) => void;
}

function normalizeVideoResolution(resolution?: string): string | undefined {
  if (!resolution) return undefined;
  if (resolution === "4K") return "1080p";
  const lower = resolution.toLowerCase();
  if (lower === "720p" || lower === "1080p") return lower;
  if (/^\d+p$/i.test(lower)) return lower;
  return undefined;
}

/** Veo 3.1 only accepts 4s, 6s, or 8s duration strings. */
function mapVeoDuration(duration?: number): "4s" | "6s" | "8s" {
  const seconds = duration ?? 8;
  if (seconds <= 4) return "4s";
  if (seconds <= 6) return "6s";
  return "8s";
}

/** Veo supports 16:9, 9:16, or auto (crops other ratios). */
function mapVeoAspectRatio(aspectRatio?: string): "16:9" | "9:16" | "auto" {
  if (aspectRatio === "16:9" || aspectRatio === "9:16") return aspectRatio;
  return "auto";
}

function mapVeoResolution(resolution?: string): "720p" | "1080p" | "4k" {
  if (resolution === "4K" || resolution === "4k") return "4k";
  if (resolution === "720p") return "720p";
  return "1080p";
}

export function formatFalVideoError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Video generation failed";

  if (/unprocessable/i.test(raw)) {
    return (
      "Invalid settings for this video model. Veo 3 only supports 4s, 6s, or 8s " +
      "duration and 16:9 or 9:16 aspect ratios. For 1:1 square ads, use Kling O3 Standard."
    );
  }

  return raw.replace(/^Video generation failed:\s*/i, "");
}

function buildVideoInput(options: ImageToVideoOptions): Record<string, unknown> {
  const modelId = options.falModelId;
  const input: Record<string, unknown> = {
    prompt: options.prompt,
    image_url: options.imageUrl,
  };

  const isWan = modelId.includes("/wan/");
  const isKlingO3 = modelId.includes("kling-video/o3");
  const isKlingLegacy =
    modelId.includes("kling") && !isKlingO3;
  const isVeo = modelId.includes("veo");

  if (isWan) {
    input.enable_prompt_expansion = false;
    if (options.duration) input.duration = String(options.duration);
    const resolution = normalizeVideoResolution(options.resolution);
    if (resolution) input.resolution = resolution;
    if (options.negativePrompt) {
      input.negative_prompt = options.negativePrompt.slice(0, 500);
    }
  } else if (isKlingO3) {
    if (options.duration) {
      const clamped = Math.max(3, Math.min(15, options.duration));
      input.duration = String(clamped);
    }
    input.generate_audio = false;
  } else if (isVeo) {
    input.duration = mapVeoDuration(options.duration);
    input.aspect_ratio = mapVeoAspectRatio(options.aspectRatio);
    input.resolution = mapVeoResolution(options.resolution);
    input.generate_audio = false;
    if (options.negativePrompt) {
      input.negative_prompt = options.negativePrompt;
    }
  } else if (isKlingLegacy) {
    if (options.duration) input.duration = String(options.duration);
    if (options.aspectRatio) input.aspect_ratio = options.aspectRatio;
    if (options.negativePrompt) {
      input.negative_prompt = options.negativePrompt;
    }
    input.generate_audio = false;
  }

  return input;
}

/**
 * Run a fal image-to-video model and return the remote video URL.
 */
export async function runImageToVideo(
  options: ImageToVideoOptions
): Promise<string> {
  ensureConfigured();

  const result = await fal.subscribe(options.falModelId, {
    input: buildVideoInput(options),
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && options.onProgress) {
        update.logs?.forEach((log) => options.onProgress?.(log.message));
      }
    },
  });

  const data = result.data as FalVideoOutput;
  const url = data.video?.url || data.videos?.[0]?.url;
  if (!url) {
    throw new Error("fal image-to-video returned no video URL");
  }
  return url;
}

interface FalTtsOutput {
  audio?: { url?: string };
}

/**
 * Generate narration audio with xAI TTS on fal.
 */
export async function runXaiTts(options: {
  text: string;
  voice: XaiVoice;
}): Promise<string> {
  ensureConfigured();

  const result = await fal.subscribe("xai/tts/v1", {
    input: {
      text: options.text,
      voice: options.voice,
      language: "en",
    },
  });

  const data = result.data as FalTtsOutput;
  const url = data.audio?.url;
  if (!url) {
    throw new Error("xAI TTS returned no audio URL");
  }
  return url;
}

/**
 * Download a remote file into public/uploads and return its local URL.
 */
export async function downloadToUploads(
  url: string,
  uploadDir: string,
  extension: string
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${url} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${uuidv4()}${extension}`;
  await fs.writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}
