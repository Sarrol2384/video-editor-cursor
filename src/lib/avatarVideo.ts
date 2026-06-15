/**
 * Kling Avatar v2 prompt — performance guidance only.
 *
 * fal recommends short prompts (expression + movement). Scene and subject are
 * already in the source image; long scene/marketing copy in the prompt often
 * causes garbled on-screen subtitle hallucinations.
 *
 * Speech comes from the audio track, not the prompt.
 */
export function buildTalkingAvatarPrompt(): string {
  return [
    "Speaking naturally to camera with a confident, friendly expression.",
    "Subtle head movement, steady eye contact, professional presenter energy.",
    "Absolutely no visible text, subtitles, captions, titles, or words in the frame.",
  ].join(" ");
}
