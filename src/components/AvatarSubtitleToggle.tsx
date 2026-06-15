"use client";

import type { ProjectSettings } from "@/lib/types";
import { shouldHideAvatarSubtitles } from "@/lib/avatarSubtitles";

interface AvatarSubtitleToggleProps {
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
  compact?: boolean;
}

export function AvatarSubtitleToggle({
  settings,
  onChange,
  compact = false,
}: AvatarSubtitleToggleProps) {
  if (!settings.videoHasEmbeddedAudio) return null;

  const enabled = shouldHideAvatarSubtitles(settings);

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange({ hideAvatarSubtitles: e.target.checked })}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
      />
      <span className="text-sm">
        <span className="font-medium text-gray-900">Hide AI subtitle band</span>
        <span className="mt-0.5 block text-xs text-gray-600">
          Trims the lower third where Kling sometimes burns in garbled text. Turn
          off to keep the full frame when your video is clean.
        </span>
      </span>
    </label>
  );
}
