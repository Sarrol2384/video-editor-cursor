/**
 * Kling Avatar v2 prompt — performance guidance only.
 *
 * fal recommends short prompts (expression + movement). Scene and subject are
 * already in the source image; long scene/marketing copy in the prompt often
 * causes garbled on-screen subtitle hallucinations.
 *
 * Speech comes from the audio track, not the prompt.
 */

/** Kling Avatar lip-sync length limits (seconds). */
export const AVATAR_MIN_DURATION_SEC = 3;
export const AVATAR_MAX_DURATION_SEC = 60;

export function clampAvatarDurationSec(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return AVATAR_MIN_DURATION_SEC;
  return Math.min(
    Math.max(Math.ceil(sec), AVATAR_MIN_DURATION_SEC),
    AVATAR_MAX_DURATION_SEC
  );
}

export function resolveAvatarDurationSec(settings: {
  generatedNarrationDuration?: number;
  duration: number;
}): number {
  const narr = settings.generatedNarrationDuration;
  if (typeof narr === "number" && narr > 0) {
    return clampAvatarDurationSec(narr);
  }
  return clampAvatarDurationSec(settings.duration || 8);
}

/** Rough word budget at natural speaking pace (~130–150 wpm). */
export function avatarScriptWordBudget(maxSec = AVATAR_MAX_DURATION_SEC): number {
  return Math.round(maxSec * 2.3);
}

export function buildTalkingAvatarPrompt(): string {
  return [
    "Speaking naturally to camera with a confident, friendly expression.",
    "Subtle head movement, steady eye contact, professional presenter energy.",
    "Absolutely no visible text, subtitles, captions, titles, or words in the frame.",
  ].join(" ");
}
