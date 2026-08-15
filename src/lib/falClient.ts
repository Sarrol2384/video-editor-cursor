import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { fal } from "@fal-ai/client";
import type { XaiVoice } from "@/lib/voiceMapping";
import { normalizeAspectRatioForFal } from "@/lib/aspectRatio";

let configured = false;

/** Transient fal / gateway codes worth retrying on poll + submit. */
const FAL_RETRYABLE_STATUS_CODES = [408, 429, 502, 503, 504];

/** Stay under Next route / proxy limits while waiting on long video jobs. */
const VIDEO_SUBSCRIBE_TIMEOUT_MS = 9 * 60 * 1000;
const VIDEO_POLL_INTERVAL_MS = 2_000;
const VIDEO_MAX_CONSECUTIVE_ERRORS = 8;

function ensureConfigured() {
  if (configured) return;
  const credentials = process.env.FAL_KEY;
  if (!credentials) {
    throw new Error("FAL_KEY is not set in environment");
  }
  fal.config({
    credentials,
    retry: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30_000,
      retryableStatusCodes: FAL_RETRYABLE_STATUS_CODES,
    },
  });
  configured = true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientFalError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as { status?: number; message?: string; name?: string };
  if (
    typeof record.status === "number" &&
    FAL_RETRYABLE_STATUS_CODES.includes(record.status)
  ) {
    return true;
  }
  const message =
    err instanceof Error
      ? err.message
      : typeof record.message === "string"
        ? record.message
        : "";
  return /408|429|502|503|504|timeout|fetch failed|ECONNRESET|ETIMEDOUT/i.test(
    message
  );
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

interface FalVideoOutput {
  video?: { url?: string };
  videos?: Array<{ url?: string }>;
}

/**
 * Poll fal queue for long video jobs without aborting on transient 408/5xx blips.
 * fal.subscribe() gives up after status-poll retries; video jobs often need longer.
 */
async function subscribeVideoJob(
  falModelId: string,
  input: Record<string, unknown>,
  onProgress?: (message: string) => void
): Promise<FalVideoOutput> {
  ensureConfigured();

  const { request_id: requestId } = await fal.queue.submit(falModelId, {
    input,
  });

  const deadline = Date.now() + VIDEO_SUBSCRIBE_TIMEOUT_MS;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    try {
      const status = await fal.queue.status(falModelId, {
        requestId,
        logs: true,
      });
      consecutiveErrors = 0;

      if (status.status === "IN_PROGRESS" && onProgress) {
        status.logs?.forEach((log) => onProgress(log.message));
      }

      if (status.status === "COMPLETED") {
        const result = await fal.queue.result(falModelId, { requestId });
        return result.data as FalVideoOutput;
      }
    } catch (err) {
      consecutiveErrors += 1;
      if (
        !isTransientFalError(err) ||
        consecutiveErrors > VIDEO_MAX_CONSECUTIVE_ERRORS
      ) {
        throw err;
      }
      await sleep(
        Math.min(VIDEO_POLL_INTERVAL_MS * consecutiveErrors, 15_000)
      );
      continue;
    }

    await sleep(VIDEO_POLL_INTERVAL_MS);
  }

  throw new Error(
    `HTTP 408: Request Timeout — fal.ai did not finish within ${Math.round(
      VIDEO_SUBSCRIBE_TIMEOUT_MS / 60_000
    )} minutes`
  );
}

/**
 * Kling Avatar / talking-head — lip-syncs a portrait image to narration audio.
 */
export async function runTalkingAvatar(
  options: TalkingAvatarOptions
): Promise<string> {
  const input: Record<string, unknown> = {
    image_url: options.imageUrl,
    audio_url: options.audioUrl,
  };
  if (options.prompt?.trim()) {
    input.prompt = options.prompt.trim();
  }

  const data = await subscribeVideoJob(
    options.falModelId,
    input,
    options.onProgress
  );
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
  negativePrompt?: string;
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

  if (options.negativePrompt) {
    input.negative_prompt = options.negativePrompt.slice(0, 500);
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

export function formatFalVideoError(err: unknown, modelName?: string): string {
  return formatFalError(err, { modelName });
}

type FalFieldError = {
  loc?: (string | number)[];
  msg?: string;
};

function extractFalDetail(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const record = err as Record<string, unknown>;

  if ("fieldErrors" in record && Array.isArray(record.fieldErrors)) {
    const parts = (record.fieldErrors as FalFieldError[])
      .map((e) => {
        const field = e.loc?.length ? String(e.loc[e.loc.length - 1]) : "input";
        return e.msg ? `${field}: ${e.msg}` : "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }

  const body = record.body;
  if (body && typeof body === "object") {
    const bodyRecord = body as Record<string, unknown>;
    const detail = bodyRecord.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            const fieldError = item as FalFieldError;
            const field = fieldError.loc?.length
              ? String(fieldError.loc[fieldError.loc.length - 1])
              : "input";
            return fieldError.msg ? `${field}: ${fieldError.msg}` : "";
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length) return parts.join("; ");
    }
    if (typeof bodyRecord.message === "string" && bodyRecord.message.trim()) {
      return bodyRecord.message.trim();
    }
  }

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail.trim();
  }

  return null;
}

/** Turn fal ApiError / balance errors into actionable messages for the UI. */
export function formatFalError(
  err: unknown,
  context?: { modelName?: string }
): string {
  const detail = extractFalDetail(err);
  if (detail) {
    if (/balance|locked|exhausted|forbidden|invalid key/i.test(detail)) {
      if (/invalid key/i.test(detail)) {
        return (
          "Your fal.ai API key is invalid. Check FAL_KEY in .env and restart the dev server."
        );
      }
      return `${detail} Visit https://fal.ai/dashboard/billing to top up.`;
    }
    const prefix = context?.modelName ? `${context.modelName}: ` : "";
    if (/likenesses of real people|private information that cannot be processed/i.test(detail)) {
      return (
        `${prefix}${detail} ` +
        "Try Kling O3 Standard, or regenerate your ad image without identifiable faces."
      );
    }
    if (
      /did not generate the expected output|unsafe content|cannot be processed as the requested output/i.test(
        detail
      )
    ) {
      return (
        "The image model refused this scene (common with children + medicine, or a very complex prompt). " +
        "Try a simpler Scene & Setting with adults only (no kids), or a garden/patio scene, then Generate again."
      );
    }
    return `${prefix}${detail}`;
  }

  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Request failed";

  if (/gateway timeout|504|408|request timeout/i.test(raw)) {
    return (
      `${context?.modelName ? `${context.modelName}: ` : ""}` +
      "Generation timed out on fal.ai (often temporary under load). " +
      "Retry in a moment, or try Wan 2.7 / a shorter duration."
    );
  }

  if (/unprocessable|422|validation/i.test(raw)) {
    if (context?.modelName?.toLowerCase().includes("veo")) {
      return (
        "Veo 3.1 only supports 4s, 6s, or 8s duration and 16:9 or 9:16 aspect ratios. " +
        "For 1:1 square ads, use Kling O3 Standard."
      );
    }
    const modelHint = context?.modelName
      ? `Invalid settings for ${context.modelName}.`
      : "Invalid settings for this video model.";
    return `${modelHint} Check duration, aspect ratio, and resolution, then retry.`;
  }

  if (/forbidden|403|balance|locked|exhausted/i.test(raw)) {
    return (
      "Your fal.ai balance is exhausted or the API key is invalid. " +
      "Top up at https://fal.ai/dashboard/billing and restart the dev server after updating FAL_KEY."
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
  const data = await subscribeVideoJob(
    options.falModelId,
    buildVideoInput(options),
    options.onProgress
  );
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

interface FalVisionOutput {
  output?: string;
  error?: string;
}

/**
 * Run a vision-language model on one or more images.
 */
export async function runVisionLlm(options: {
  prompt: string;
  systemPrompt?: string;
  imageUrls: string[];
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  ensureConfigured();

  const result = await fal.subscribe("fal-ai/any-llm/vision", {
    input: {
      prompt: options.prompt,
      system_prompt: options.systemPrompt,
      image_urls: options.imageUrls,
      model: options.model || "google/gemini-2.5-flash-lite",
      priority: "latency",
      temperature: 0.4,
      max_tokens: options.maxTokens ?? 2048,
      reasoning: false,
    },
    logs: true,
  });

  const data = result.data as FalVisionOutput;
  if (data.error) {
    throw new Error(data.error);
  }
  const text = data.output?.trim();
  if (!text) {
    throw new Error("Vision model returned no output");
  }
  return text;
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
