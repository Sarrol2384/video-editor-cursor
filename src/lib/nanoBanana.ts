import { normalizeAspectRatioForAikit } from "@/lib/aspectRatio";

const DEFAULT_BASE_URL = "https://nanobanana.aikit.club";

export interface NanoBananaEditOptions {
  prompt: string;
  image: string;
  aspectRatio?: string;
  n?: number;
  responseFormat?: "url" | "b64_json";
}

export interface NanoBananaImageResult {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface NanoBananaEditResponse {
  data: NanoBananaImageResult[];
}

function getBaseUrl(): string {
  return process.env.NANO_BANANA_API_URL || DEFAULT_BASE_URL;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const apiKey = process.env.NANO_BANANA_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export function normalizeAspectRatio(ratio: string): string {
  return normalizeAspectRatioForAikit(ratio);
}

export async function editImage(
  options: NanoBananaEditOptions
): Promise<NanoBananaImageResult[]> {
  const body = {
    prompt: options.prompt,
    image: options.image,
    model: "nano-banana",
    n: options.n ?? 1,
    aspect_ratio: normalizeAspectRatio(options.aspectRatio || "1:1"),
    response_format: options.responseFormat ?? "b64_json",
  };

  const response = await fetch(`${getBaseUrl()}/v1/images/edits`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nano Banana API error (${response.status}): ${text}`);
  }

  const result = (await response.json()) as NanoBananaEditResponse;
  if (!result.data?.length) {
    throw new Error("Nano Banana returned no images");
  }
  return result.data;
}

export function isNanoBananaConfigured(): boolean {
  return true;
}
