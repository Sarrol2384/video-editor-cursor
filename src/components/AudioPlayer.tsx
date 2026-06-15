"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectSettings } from "@/lib/types";
import { playMixedAudioPreview, stopActiveAudioPreview } from "@/lib/audioPreview";
import { getNarrationDurationSec } from "@/lib/exportAudio";
import {
  getVoiceLabel,
  isGeneratedNarrationStale,
  isGeneratedNarrationVoiceUnknown,
} from "@/lib/voiceMapping";

interface AudioPlayerProps {
  settings: ProjectSettings;
  narrationUrl: string;
  onNarrationDuration?: (seconds: number) => void;
  onMatchDuration?: (seconds: number) => void;
}

export function AudioPlayer({
  settings,
  narrationUrl,
  onNarrationDuration,
  onMatchDuration,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [narrationSec, setNarrationSec] = useState<number | null>(
    settings.generatedNarrationDuration ?? null
  );
  const mountedRef = useRef(true);
  const stale = isGeneratedNarrationStale(settings);
  const voiceUnknown = isGeneratedNarrationVoiceUnknown(settings);
  const playbackVoiceId =
    settings.generatedNarrationVoiceId || settings.voiceId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopActiveAudioPreview();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const duration = await getNarrationDurationSec(narrationUrl);
      if (cancelled || duration === null) return;
      setNarrationSec(duration);
      onNarrationDuration?.(duration);
    })();
    return () => {
      cancelled = true;
    };
  }, [narrationUrl, onNarrationDuration]);

  async function handlePlay() {
    setPlaying(true);
    try {
      await playMixedAudioPreview({
        narrationUrl,
        musicMood: settings.musicMood || "professional",
        narrationVolume: settings.narrationVolume ?? 100,
        musicVolume: settings.musicVolume ?? 40,
      });
    } finally {
      if (mountedRef.current) setPlaying(false);
    }
  }

  function handleStop() {
    stopActiveAudioPreview();
    setPlaying(false);
  }

  const roundedNarr = narrationSec != null ? Math.ceil(narrationSec) : null;
  const durationShort =
    roundedNarr != null && roundedNarr > settings.duration;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">Generated audio mix</p>
      <p className="mt-1 text-xs text-gray-500">
        Voice in file: {getVoiceLabel(playbackVoiceId)} &middot; Mood:{" "}
        {settings.musicMood || "professional"}
        {narrationSec != null && (
          <>
            {" "}
            &middot; Narration length:{" "}
            <strong>{narrationSec.toFixed(1)}s</strong>
          </>
        )}
      </p>
      {stale && (
        <p className="mt-2 text-xs text-amber-800">
          You selected <strong>{getVoiceLabel(settings.voiceId)}</strong> but
          this file was generated with{" "}
          <strong>
            {getVoiceLabel(settings.generatedNarrationVoiceId)}
          </strong>
          . Use <strong>Preview selected voice</strong> above to hear the new
          voice, or click <strong>Regenerate Audio</strong> to replace this file.
        </p>
      )}
      {voiceUnknown && !stale && (
        <p className="mt-2 text-xs text-amber-800">
          This saved file was created before voice tracking was added. If you
          changed the voice, use <strong>Preview selected voice</strong> or{" "}
          <strong>Regenerate Audio</strong> — do not rely on{" "}
          <strong>Play saved narration</strong> for the new voice.
        </p>
      )}
      {durationShort && roundedNarr != null && (
        <p className="mt-2 text-xs text-amber-800">
          Your video duration is set to {settings.duration}s but narration needs
          about {roundedNarr}s. Export will use the longer length automatically,
          or raise <strong>Duration</strong> in Video Controls before
          regenerating video.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          className="btn-primary text-sm"
        >
          {playing ? "Playing..." : "Play saved narration + music"}
        </button>
        {playing && (
          <button type="button" onClick={handleStop} className="btn-secondary text-sm">
            Stop
          </button>
        )}
        {roundedNarr != null && onMatchDuration && (
          <button
            type="button"
            onClick={() => onMatchDuration(roundedNarr)}
            className="btn-secondary text-sm"
          >
            Use {roundedNarr}s for video duration
          </button>
        )}
      </div>
    </div>
  );
}
