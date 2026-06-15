"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ProjectSettings } from "@/lib/types";
import { getPreviewLayout } from "@/lib/canvas-utils";
import {
  avatarSubtitleVideoHeightPercent,
  shouldHideAvatarSubtitles,
} from "@/lib/avatarSubtitles";
import { PreviewFrame } from "@/components/PreviewFrame";

interface VideoPreviewProps {
  videoUrl: string;
  settings: ProjectSettings;
  overlay?: ReactNode;
  videoRef?: React.RefObject<HTMLVideoElement>;
  /** Smaller preview for the text editor so controls fit on screen. */
  compact?: boolean;
}

export function VideoPreview({
  videoUrl,
  settings,
  overlay,
  videoRef,
  compact = false,
}: VideoPreviewProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || internalRef;
  const { displayWidth, displayHeight } = getPreviewLayout(
    settings.aspectRatio,
    settings.resolution,
    { compact }
  );
  const hideSubs = shouldHideAvatarSubtitles(settings);
  const objectFit = settings.imageFit === "cover" ? "object-cover" : "object-contain";

  useEffect(() => {
    const video = ref.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, [videoUrl, ref, hideSubs]);

  return (
    <PreviewFrame
      displayWidth={displayWidth}
      displayHeight={displayHeight}
      overlay={overlay}
    >
      <div
        className={`h-full w-full ${hideSubs ? "overflow-hidden" : ""}`}
      >
        <video
          key={videoUrl}
          ref={ref}
          src={videoUrl}
          className={
            hideSubs
              ? "block w-full object-cover object-top"
              : `block h-full w-full ${objectFit}`
          }
          style={
            hideSubs
              ? { height: `${avatarSubtitleVideoHeightPercent()}%` }
              : undefined
          }
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          crossOrigin="anonymous"
        />
      </div>
    </PreviewFrame>
  );
}
