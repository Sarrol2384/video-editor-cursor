import type { ProjectSettings } from "@/lib/types";

const MAX_EXPORT_DURATION_SEC = 60;

export function clampExportDurationSec(sec: number, fallback = 8): number {
  if (!Number.isFinite(sec) || sec <= 0) return fallback;
  return Math.min(Math.max(sec, 4), MAX_EXPORT_DURATION_SEC);
}

async function decodeNarration(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load narration audio");
  }
  const data = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(data);
  } finally {
    await ctx.close();
  }
}

/** Measure narration MP3/WAV length in seconds (browser decode). */
export async function getNarrationDurationSec(
  url: string
): Promise<number | null> {
  try {
    const buffer = await decodeNarration(url);
    return buffer.duration;
  } catch {
    return null;
  }
}

/** Export length = longest of video, narration, and duration slider (capped at 60s). */
export function resolveExportDurationSec(
  settings: ProjectSettings,
  videoDurationSec?: number | null
): number {
  const safeVideo =
    typeof videoDurationSec === "number" &&
    Number.isFinite(videoDurationSec) &&
    videoDurationSec > 0
      ? videoDurationSec
      : null;

  const safeNarration =
    typeof settings.generatedNarrationDuration === "number" &&
    Number.isFinite(settings.generatedNarrationDuration) &&
    settings.generatedNarrationDuration > 0
      ? settings.generatedNarrationDuration
      : null;

  const candidates = [settings.duration, safeVideo, safeNarration].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0
  );

  return clampExportDurationSec(
    candidates.length > 0 ? Math.max(...candidates) : settings.duration
  );
}

export function hasExportAudio(settings: ProjectSettings): boolean {
  if (settings.videoHasEmbeddedAudio) return false;
  return Boolean(settings.generatedNarrationUrl?.trim());
}

export function hasEmbeddedVideoSpeech(settings: ProjectSettings): boolean {
  return Boolean(settings.videoHasEmbeddedAudio);
}

/** Normalized gain levels (0..1) for narration + background music in export. */
export function getExportVolumeLevels(settings: ProjectSettings): {
  narrationVolume: number;
  musicVolume: number;
} {
  return {
    narrationVolume: Math.max(
      0,
      Math.min(1, (settings.narrationVolume ?? 100) / 100)
    ),
    musicVolume:
      Math.max(0, Math.min(1, (settings.musicVolume ?? 40) / 100)) * 0.35,
  };
}
