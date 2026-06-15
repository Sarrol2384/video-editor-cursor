"use client";

import { useRef, useState } from "react";
import {
  avatarSubtitleVideoHeightPercent,
} from "@/lib/avatarSubtitles";

interface ShareVideoPlayerProps {
  videoUrl: string;
  aspectRatio: string;
  videoHasEmbeddedAudio: boolean;
  hideAvatarSubtitles: boolean;
  imageFit: "contain" | "cover";
  isPortrait: boolean;
}

export function ShareVideoPlayer({
  videoUrl,
  videoHasEmbeddedAudio,
  hideAvatarSubtitles,
  imageFit,
  isPortrait,
}: ShareVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const hideSubs = videoHasEmbeddedAudio && hideAvatarSubtitles;
  const objectFit = imageFit === "cover" ? "object-cover" : "object-contain";

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative mx-auto overflow-hidden rounded-xl bg-black ${
          isPortrait ? "max-w-sm" : "max-w-2xl"
        }`}
      >
        <div className={`w-full ${hideSubs ? "overflow-hidden" : ""}`}>
          <video
            ref={videoRef}
            src={videoUrl}
            className={
              hideSubs
                ? "pointer-events-none block w-full object-cover object-top"
                : `pointer-events-none block h-auto w-full ${objectFit}`
            }
            style={
              hideSubs
                ? { height: `${avatarSubtitleVideoHeightPercent()}%` }
                : undefined
            }
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        </div>
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-lg bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          {playing ? "Pause" : "Play video"}
        </button>
      </div>
    </div>
  );
}
