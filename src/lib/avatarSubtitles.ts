import type { ProjectSettings } from "@/lib/types";

/**
 * Kling Avatar sometimes hallucinates garbled subtitles ~70–85% down the frame.
 * Optional trim on preview/export — toggle via hideAvatarSubtitles.
 * Fraction of frame height to keep when hiding the subtitle band.
 */
export const AVATAR_SUBTITLE_CROP_RATIO = 0.72;

export function shouldHideAvatarSubtitles(settings: ProjectSettings): boolean {
  if (!settings.videoHasEmbeddedAudio) return false;
  return settings.hideAvatarSubtitles !== false;
}

export function avatarSubtitleVideoHeightPercent(): number {
  return 100 / AVATAR_SUBTITLE_CROP_RATIO;
}

/**
 * FFmpeg filter: remove Kling's garbled lower-third band, then scale/crop back
 * to the target frame (matches preview object-cover + object-top).
 */
export function ffmpegAvatarSubtitleCropFilter(
  outWidth: number,
  outHeight: number
): string {
  const r = AVATAR_SUBTITLE_CROP_RATIO;
  return (
    `crop=iw:ih*${r}:0:0,` +
    `scale=${outWidth}:${outHeight}:force_original_aspect_ratio=increase,` +
    `crop=${outWidth}:${outHeight}`
  );
}
