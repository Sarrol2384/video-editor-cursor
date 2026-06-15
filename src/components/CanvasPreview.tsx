"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProjectSettings } from "@/lib/types";
import { getPreviewLayout, loadImage } from "@/lib/canvas-utils";
import { renderFrame } from "@/lib/canvas-renderer";
import { PreviewFrame } from "@/components/PreviewFrame";

interface CanvasPreviewProps {
  imageUrl: string;
  settings: ProjectSettings;
  playing?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  showPlayToggle?: boolean;
  /** When true, text is shown only via DOM overlay (avoids double-render in editor). */
  skipTextLayers?: boolean;
  overlay?: ReactNode;
  /** Smaller preview for the text editor so controls fit on screen. */
  compact?: boolean;
}

export function CanvasPreview({
  imageUrl,
  settings,
  playing: playingProp,
  onCanvasReady,
  showPlayToggle = true,
  skipTextLayers = false,
  overlay,
  compact = false,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [playing, setPlaying] = useState(playingProp ?? true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { width, height, displayWidth, displayHeight } = getPreviewLayout(
    settings.aspectRatio,
    settings.resolution,
    { compact }
  );

  useEffect(() => {
    if (playingProp !== undefined) setPlaying(playingProp);
  }, [playingProp]);

  useEffect(() => {
    if (!imageUrl) return;
    loadImage(imageUrl)
      .then((img) => {
        imgRef.current = img;
        setImageLoaded(true);
      })
      .catch(() => setImageLoaded(false));
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !imgRef.current) return;

    onCanvasReady?.(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const duration = settings.duration * 1000;

    function drawFrame(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = (elapsed % duration) / duration;

      renderFrame(ctx!, img, settings, progress, width, height, {
        skipTextLayers,
      });

      if (playing) {
        animRef.current = requestAnimationFrame(drawFrame);
      }
    }

    if (playing) {
      startTimeRef.current = 0;
      animRef.current = requestAnimationFrame(drawFrame);
    } else {
      const progress = startTimeRef.current
        ? ((performance.now() - startTimeRef.current) % duration) / duration
        : 0;
      renderFrame(ctx, img, settings, progress, width, height, { skipTextLayers });
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [
    imageLoaded,
    settings,
    width,
    height,
    playing,
    onCanvasReady,
    skipTextLayers,
    settings.imageFit,
    settings.aspectRatio,
  ]);

  return (
    <div className="space-y-2">
      {showPlayToggle && imageLoaded && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      )}
      <PreviewFrame
        displayWidth={displayWidth}
        displayHeight={displayHeight}
        overlay={overlay}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block h-full w-full"
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Loading preview...
          </div>
        )}
      </PreviewFrame>
    </div>
  );
}
