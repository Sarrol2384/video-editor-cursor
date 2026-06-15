export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
export type Resolution = "720p" | "1080p" | "4K";
export type CostTier = "low" | "medium" | "high";
export type GenerationKind = "image" | "video" | "audio";
export type VideoMode = "motion" | "avatar";

export interface ModelCapability {
  id: string;
  name: string;
  provider: string;
  kind: GenerationKind;
  /** motion = cinematic image-to-video; avatar = lip-sync talking head */
  videoMode?: VideoMode;
  strengths: string;
  maxDuration: number;
  resolutions: Resolution[];
  aspectRatios: AspectRatio[];
  creditsPerSecond: number;
  baseCredits: number;
  etaSeconds: number;
  costTier: CostTier;
  bestUseCase: string;
  falModelId?: string;
  /** Internal fallback models are hidden from pickers and routing. */
  internal?: boolean;
}

export const MODELS: ModelCapability[] = [
  {
    id: "wan-i2v",
    name: "Wan 2.7 (Budget)",
    provider: "fal / Wan",
    kind: "video",
    videoMode: "motion",
    strengths: "Lowest cost — best for simple product-only scenes",
    maxDuration: 5,
    resolutions: ["720p", "1080p"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    creditsPerSecond: 1,
    baseCredits: 2,
    etaSeconds: 60,
    costTier: "low",
    bestUseCase: "Batch pharmacy ad generation",
    falModelId: "fal-ai/wan/v2.7/image-to-video",
  },
  {
    id: "minimax-video-01",
    name: "MiniMax Video 01",
    provider: "fal / MiniMax",
    kind: "video",
    videoMode: "motion",
    strengths: "Smooth motion, reliable subject consistency",
    maxDuration: 6,
    resolutions: ["1080p"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    creditsPerSecond: 2,
    baseCredits: 4,
    etaSeconds: 90,
    costTier: "medium",
    bestUseCase: "Daily promotional posts",
    falModelId: "fal-ai/minimax/video-01/image-to-video",
  },
  {
    id: "kling-o3-standard",
    name: "Kling O3 Standard",
    provider: "fal / Kling",
    kind: "video",
    videoMode: "motion",
    strengths: "Latest Kling — best motion quality and visual fidelity",
    maxDuration: 15,
    resolutions: ["1080p", "4K"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    creditsPerSecond: 5,
    baseCredits: 8,
    etaSeconds: 180,
    costTier: "high",
    bestUseCase: "Premium pharmacy ads with natural motion",
    falModelId: "fal-ai/kling-video/o3/standard/image-to-video",
  },
  {
    id: "kling-v3",
    name: "Kling V3 Standard",
    provider: "fal / Kling",
    kind: "video",
    videoMode: "motion",
    strengths: "Previous-gen Kling — good motion, superseded by O3",
    maxDuration: 10,
    resolutions: ["1080p"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    creditsPerSecond: 4,
    baseCredits: 6,
    etaSeconds: 150,
    costTier: "high",
    bestUseCase: "High-end product launches",
    falModelId: "fal-ai/kling-video/v3/standard/image-to-video",
  },
  {
    id: "veo-3-1-fast",
    name: "Veo 3.1 Fast",
    provider: "fal / Google",
    kind: "video",
    videoMode: "motion",
    strengths: "Cinematic realism — 16:9 or 9:16 only (4s/6s/8s clips)",
    maxDuration: 8,
    resolutions: ["720p", "1080p", "4K"],
    aspectRatios: ["16:9", "9:16"],
    creditsPerSecond: 5,
    baseCredits: 8,
    etaSeconds: 120,
    costTier: "high",
    bestUseCase: "Cinematic brand storytelling",
    falModelId: "fal-ai/veo3.1/fast/image-to-video",
  },
  {
    id: "kling-avatar-standard",
    name: "Kling Avatar (Talking head)",
    provider: "fal / Kling",
    kind: "video",
    videoMode: "avatar",
    strengths: "Lip-sync portrait to your narration — Facebook / TikTok presenter style",
    maxDuration: 30,
    resolutions: ["720p", "1080p"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    creditsPerSecond: 6,
    baseCredits: 12,
    etaSeconds: 120,
    costTier: "high",
    bestUseCase: "VonWillingh talking-head social ads",
    falModelId: "fal-ai/kling-video/ai-avatar/v2/standard",
  },
  {
    id: "kling-avatar-pro",
    name: "Kling Avatar Pro",
    provider: "fal / Kling",
    kind: "video",
    videoMode: "avatar",
    strengths: "Higher quality lip-sync — 1080p talking head from your image + voice",
    maxDuration: 30,
    resolutions: ["1080p"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    creditsPerSecond: 8,
    baseCredits: 16,
    etaSeconds: 180,
    costTier: "high",
    bestUseCase: "Premium VonWillingh presenter videos",
    falModelId: "fal-ai/kling-video/ai-avatar/v2/pro",
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    provider: "fal / Google",
    kind: "image",
    strengths:
      "Latest editor — logo on branded props, multi-image references, Coloured SA scenes",
    maxDuration: 0,
    resolutions: ["1080p"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    creditsPerSecond: 0,
    baseCredits: 18,
    etaSeconds: 50,
    costTier: "medium",
    bestUseCase: "VonWillingh scenes with logo on branded props",
    falModelId: "fal-ai/nano-banana-2/edit",
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    provider: "fal / Google",
    kind: "image",
    strengths: "Product-locked ad scenes from a pharmacy product photo",
    maxDuration: 0,
    resolutions: ["1080p"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    creditsPerSecond: 0,
    baseCredits: 15,
    etaSeconds: 45,
    costTier: "medium",
    bestUseCase: "Full ad image from product photo",
    falModelId: "fal-ai/nano-banana/edit",
  },
  {
    id: "mock-image",
    name: "Mock Image Enhancer",
    provider: "Internal",
    kind: "image",
    strengths: "CSS style previews (offline fallback)",
    maxDuration: 0,
    resolutions: ["1080p"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
    creditsPerSecond: 0,
    baseCredits: 5,
    etaSeconds: 15,
    costTier: "low",
    bestUseCase: "Offline preview without API",
    internal: true,
  },
  {
    id: "xai-tts",
    name: "xAI Narration",
    provider: "fal / xAI",
    kind: "audio",
    strengths: "Expressive voices with distinct tone and personality",
    maxDuration: 16,
    resolutions: ["1080p"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    creditsPerSecond: 2,
    baseCredits: 12,
    etaSeconds: 15,
    costTier: "low",
    bestUseCase: "Professional ad voice-overs",
    falModelId: "xai/tts/v1",
  },
  {
    id: "mock-audio",
    name: "Mock Narration Engine",
    provider: "Internal",
    kind: "audio",
    strengths: "Offline fallback metadata only",
    maxDuration: 16,
    resolutions: ["1080p"],
    aspectRatios: ["16:9", "9:16"],
    creditsPerSecond: 0,
    baseCredits: 0,
    etaSeconds: 5,
    costTier: "low",
    bestUseCase: "Offline preview without API",
    internal: true,
  },
];

export interface RoutingParams {
  kind: GenerationKind;
  aspectRatio?: AspectRatio;
  duration?: number;
  resolution?: Resolution;
  priority?: "cost" | "speed" | "quality" | "balanced";
  videoMode?: VideoMode;
}

export interface RoutingResult {
  recommended: ModelCapability;
  alternatives: ModelCapability[];
  estimatedCredits: number;
  etaSeconds: number;
  rationale: string;
}

export function getModelsForKind(
  kind: GenerationKind,
  videoMode?: VideoMode
): ModelCapability[] {
  return MODELS.filter((m) => {
    if (m.kind !== kind || m.internal) return false;
    if (kind === "video" && videoMode) {
      const mode = m.videoMode || "motion";
      return mode === videoMode;
    }
    if (kind === "video" && !videoMode) {
      return (m.videoMode || "motion") === "motion";
    }
    return true;
  });
}

export function isAvatarVideoModel(modelId: string): boolean {
  const model = getModelById(modelId);
  return model?.videoMode === "avatar";
}

export function estimateCredits(
  model: ModelCapability,
  duration: number = 6
): number {
  if (model.kind === "image") return model.baseCredits;
  const effectiveDuration = model.maxDuration
    ? Math.min(duration, model.maxDuration)
    : duration;
  return model.baseCredits + model.creditsPerSecond * effectiveDuration;
}

export function filterModels(
  params: RoutingParams & { videoMode?: VideoMode }
): ModelCapability[] {
  let candidates = getModelsForKind(params.kind, params.videoMode);

  if (params.aspectRatio) {
    candidates = candidates.filter((m) =>
      m.aspectRatios.includes(params.aspectRatio!)
    );
  }
  if (params.resolution) {
    candidates = candidates.filter((m) =>
      m.resolutions.includes(params.resolution!)
    );
  }
  if (params.duration && params.kind === "video") {
    candidates = candidates.filter((m) => m.maxDuration >= params.duration!);
  }

  return candidates.length > 0 ? candidates : getModelsForKind(params.kind);
}

function scoreModel(
  model: ModelCapability,
  priority: RoutingParams["priority"],
  duration: number
): number {
  const cost = estimateCredits(model, duration);
  const costScore = 100 - cost;
  const speedScore = 100 - model.etaSeconds;
  const qualityScore =
    (model.costTier === "high" ? 90 : model.costTier === "medium" ? 60 : 30) +
    (model.id.startsWith("kling-o3") ? 25 : 0);

  switch (priority) {
    case "cost":
      return costScore * 2 + speedScore;
    case "speed":
      return speedScore * 2 + costScore;
    case "quality":
      return qualityScore * 2 + costScore * 0.5;
    default:
      return costScore * 0.7 + speedScore + qualityScore * 1.6;
  }
}

export function routeModel(params: RoutingParams): RoutingResult {
  const duration = params.duration ?? 6;
  const candidates = filterModels(params);
  const priority = params.priority ?? "balanced";

  const ranked = [...candidates].sort(
    (a, b) => scoreModel(b, priority, duration) - scoreModel(a, priority, duration)
  );

  const recommended = ranked[0];
  const alternatives = ranked.slice(1, 4);
  const estimatedCredits = estimateCredits(recommended, duration);

  const rationaleMap: Record<string, string> = {
    cost: `Lowest estimated cost (${estimatedCredits} credits) for your settings.`,
    speed: `Fastest ETA (~${recommended.etaSeconds}s) among compatible models.`,
    quality: `Best quality tier for ${recommended.bestUseCase.toLowerCase()}.`,
    balanced: `Balanced cost, speed, and quality for ${recommended.bestUseCase.toLowerCase()}.`,
  };

  return {
    recommended,
    alternatives,
    estimatedCredits,
    etaSeconds: recommended.etaSeconds,
    rationale: rationaleMap[priority],
  };
}

export function getModelById(id: string): ModelCapability | undefined {
  return MODELS.find((m) => m.id === id);
}
