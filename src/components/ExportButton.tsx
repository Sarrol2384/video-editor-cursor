"use client";

import { useRef, useState } from "react";
import type { ProjectSettings } from "@/lib/types";
import {
  getAspectDimensions,
  getCanvasBaseWidth,
  getExportVideoBitrate,
  loadImage,
  loadOverlayImages,
} from "@/lib/canvas-utils";
import { renderFrame, renderVideoFrame } from "@/lib/canvas-renderer";
import { stopActiveAudioPreview } from "@/lib/audioPreview";
import {
  hasExportAudio,
  hasEmbeddedVideoSpeech,
  resolveExportDurationSec,
} from "@/lib/exportAudio";
import { waitForExportFonts } from "@/lib/textFonts";
import { isAgencyWorkflow } from "@/lib/studioWorkflow";
import { AvatarSubtitleToggle } from "@/components/AvatarSubtitleToggle";

interface ExportButtonProps {
  imageUrl: string;
  settings: ProjectSettings;
  projectId: string;
  videoUrl?: string;
  onExported?: (url: string) => void;
  onChange?: (updates: Partial<ProjectSettings>) => void;
}

type ExportPhase =
  | "idle"
  | "preparing"
  | "loading"
  | "rendering"
  | "converting";

const VIDEO_LOAD_TIMEOUT_MS = 12_000;
const ASSET_LOAD_TIMEOUT_MS = 12_000;

function pickVideoRecorderMimeType(withAudio: boolean): string {
  const candidates = withAudio
    ? [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ]
    : [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function rejectOnAbort(signal?: AbortSignal): Promise<never> | null {
  if (!signal) return null;
  if (signal.aborted) {
    return Promise.reject(new DOMException("Export cancelled", "AbortError"));
  }
  return new Promise((_, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new DOMException("Export cancelled", "AbortError")),
      { once: true }
    );
  });
}

async function loadVideoElement(
  srcUrl: string,
  signal?: AbortSignal
): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.src = srcUrl;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const abortPromise = rejectOnAbort(signal);
  const readyPromise = new Promise<HTMLVideoElement>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        reject(new Error("Video has no duration metadata"));
        return;
      }
      resolve(video);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to load generated video"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.load();
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Video load timed out — try again")),
      VIDEO_LOAD_TIMEOUT_MS
    );
  });

  const racers: Promise<HTMLVideoElement>[] = [readyPromise, timeoutPromise];
  if (abortPromise) racers.push(abortPromise as Promise<HTMLVideoElement>);

  return Promise.race(racers);
}

export function ExportButton({
  imageUrl,
  settings,
  projectId,
  videoUrl,
  onExported,
  onChange,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasAudio = hasExportAudio(settings);
  const embeddedSpeech = hasEmbeddedVideoSpeech(settings);
  const narrDuration = settings.generatedNarrationDuration;
  const needsTextBurnIn = settings.textLayers.length > 0;
  const agency = isAgencyWorkflow(settings);

  async function renderStillFrame(): Promise<HTMLCanvasElement> {
    const [img, overlayImages] = await Promise.all([
      loadImage(imageUrl, ASSET_LOAD_TIMEOUT_MS),
      loadOverlayImages(settings.textLayers, ASSET_LOAD_TIMEOUT_MS),
    ]);

    const baseWidth = getCanvasBaseWidth(settings.resolution);
    const { width, height } = getAspectDimensions(
      settings.aspectRatio,
      baseWidth
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    renderFrame(ctx, img, settings, 0, width, height, { overlayImages });
    return canvas;
  }

  async function handleExportPng() {
    if (!imageUrl) return;

    stopActiveAudioPreview();
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;

    setExporting(true);
    setProgress(0);
    setPhase("preparing");
    setError(null);

    try {
      setPhase("loading");
      setProgress(30);
      if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");

      const canvas = await renderStillFrame();
      setProgress(80);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
          "image/png"
        );
      });

      const url = URL.createObjectURL(blob);
      downloadUrl(url, `post-${projectId.slice(0, 8)}.png`);
      URL.revokeObjectURL(url);
      setProgress(100);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Export cancelled.");
      } else {
        console.error("PNG export failed:", err);
        setError(err instanceof Error ? err.message : "PNG export failed");
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
      setPhase("idle");
    }
  }

  async function recordVideoOnly(
    canvas: HTMLCanvasElement,
    durationSec: number,
    width: number,
    height: number,
    draw: (progressPct: number) => void,
    signal?: AbortSignal,
    audioStream?: MediaStream
  ): Promise<Blob> {
    const canvasStream = canvas.captureStream(30);
    const recordStream =
      audioStream && audioStream.getAudioTracks().length > 0
        ? new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ])
        : canvasStream;

    return new Promise<Blob>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Export cancelled", "AbortError"));
        return;
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(recordStream, {
        mimeType: pickVideoRecorderMimeType(recordStream.getAudioTracks().length > 0),
        videoBitsPerSecond: getExportVideoBitrate(width, height),
      });

      const onAbort = () => {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
        reject(new DOMException("Export cancelled", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        signal?.removeEventListener("abort", onAbort);
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
      recorder.onerror = () => {
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("MediaRecorder error"));
      };

      setPhase("rendering");
      const durationMs = durationSec * 1000;
      const startTime = performance.now();
      recorder.start(100);

      const tick = () => {
        if (signal?.aborted) {
          onAbort();
          return;
        }

        const elapsed = performance.now() - startTime;
        const progressPct = Math.min(elapsed / durationMs, 1);
        setProgress(Math.round(10 + progressPct * 80));
        draw(progressPct);

        if (elapsed < durationMs) {
          requestAnimationFrame(tick);
        } else {
          recorder.stop();
        }
      };

      requestAnimationFrame(tick);
    });
  }

  async function exportFromImage(
    exportDurationSec: number,
    signal?: AbortSignal
  ): Promise<Blob> {
    setPhase("loading");
    setProgress(15);

    const [img, overlayImages] = await Promise.all([
      loadImage(imageUrl, ASSET_LOAD_TIMEOUT_MS),
      loadOverlayImages(settings.textLayers, ASSET_LOAD_TIMEOUT_MS),
    ]);

    const baseWidth = getCanvasBaseWidth(settings.resolution);
    const { width, height } = getAspectDimensions(
      settings.aspectRatio,
      baseWidth
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    return recordVideoOnly(
      canvas,
      exportDurationSec,
      width,
      height,
      (progressPct) => {
        renderFrame(ctx, img, settings, progressPct, width, height, {
          overlayImages,
        });
      },
      signal
    );
  }

  async function exportFromVideo(
    video: HTMLVideoElement,
    exportDurationSec: number,
    sourceVideoDurationSec: number,
    signal?: AbortSignal
  ): Promise<Blob> {
    setPhase("loading");
    setProgress(15);

    if (needsTextBurnIn) {
      await waitForExportFonts(settings.textLayers);
    }

    const overlayImages = await loadOverlayImages(
      settings.textLayers,
      ASSET_LOAD_TIMEOUT_MS
    );

    const shouldLoop =
      !embeddedSpeech &&
      exportDurationSec > sourceVideoDurationSec + 0.05;
    video.loop = shouldLoop;
    video.currentTime = 0;

    const recordDurationSec = embeddedSpeech
      ? sourceVideoDurationSec
      : exportDurationSec;

    const baseWidth = getCanvasBaseWidth(settings.resolution);
    const { width, height } = getAspectDimensions(
      settings.aspectRatio,
      baseWidth
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const canvasStream = canvas.captureStream(30);

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Export cancelled", "AbortError"));
        return;
      }

      const startRecording = async () => {
        if (embeddedSpeech) {
          video.muted = true;
        }

        try {
          await video.play();
        } catch {
          /* draw frames even if autoplay blocked */
        }

        const recordStream = canvasStream;

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(recordStream, {
          mimeType: pickVideoRecorderMimeType(
            recordStream.getAudioTracks().length > 0
          ),
          videoBitsPerSecond: getExportVideoBitrate(width, height),
        });

        const onAbort = () => {
          video.pause();
          video.muted = true;
          try {
            recorder.stop();
          } catch {
            /* ignore */
          }
          reject(new DOMException("Export cancelled", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          signal?.removeEventListener("abort", onAbort);
          video.pause();
          video.muted = true;
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
        recorder.onerror = () => {
          signal?.removeEventListener("abort", onAbort);
          reject(new Error("MediaRecorder error"));
        };

        setPhase("rendering");
        const durationMs = recordDurationSec * 1000;
        const startTime = performance.now();
        recorder.start(100);

        const tick = () => {
          if (signal?.aborted) {
            onAbort();
            return;
          }

          const elapsed = performance.now() - startTime;
          const progressPct = Math.min(elapsed / durationMs, 1);
          setProgress(Math.round(10 + progressPct * 80));

          if (embeddedSpeech) {
            const videoProgress =
              sourceVideoDurationSec > 0
                ? Math.min(video.currentTime / sourceVideoDurationSec, 1)
                : progressPct;
            renderVideoFrame(
              ctx,
              video,
              settings,
              videoProgress,
              width,
              height,
              overlayImages
            );
          } else {
            if (sourceVideoDurationSec > 0) {
              const videoProgress = shouldLoop
                ? (elapsed % (sourceVideoDurationSec * 1000)) /
                  (sourceVideoDurationSec * 1000)
                : progressPct;
              video.currentTime = Math.min(
                videoProgress * sourceVideoDurationSec,
                Math.max(0, sourceVideoDurationSec - 0.04)
              );
            }
            renderVideoFrame(
              ctx,
              video,
              settings,
              progressPct,
              width,
              height,
              overlayImages
            );
          }

          const finished = embeddedSpeech
            ? video.ended || elapsed >= durationMs
            : elapsed >= durationMs;

          if (!finished) {
            requestAnimationFrame(tick);
          } else {
            recorder.stop();
          }
        };

        requestAnimationFrame(tick);
      };

      void startRecording().catch(reject);
    });
  }

  /** Skip canvas re-encode when there is no text to burn in. */
  async function fetchExistingVideoBlob(
    srcUrl: string,
    signal?: AbortSignal
  ): Promise<Blob> {
    setPhase("loading");
    setProgress(20);
    const response = await fetch(srcUrl, { signal });
    if (!response.ok) {
      throw new Error("Failed to fetch generated video");
    }
    return response.blob();
  }

  async function postExportForm(
    formData: FormData,
    signal?: AbortSignal
  ): Promise<string> {
    setPhase("converting");
    setProgress(90);

    const response = await fetch(`/api/projects/${projectId}/export`, {
      method: "POST",
      body: formData,
      signal,
    });

    const data = (await response.json()) as {
      url?: string;
      filename?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || "MP4 conversion failed");
    }

    if (!data.url) {
      throw new Error("Export succeeded but no download URL was returned");
    }

    return data.url;
  }

  async function exportLipSyncOnServer(
    options: { rawOnly?: boolean },
    signal?: AbortSignal
  ): Promise<string> {
    const formData = new FormData();
    if (options.rawOnly) {
      formData.append("rawOnly", "1");
    } else {
      formData.append("lipSyncExport", "1");
    }
    return postExportForm(formData, signal);
  }

  async function uploadAndConvert(
    videoBlob: Blob,
    signal?: AbortSignal,
    options?: { canvasExport?: boolean; exportDurationSec?: number }
  ): Promise<string> {
    setPhase("converting");
    setProgress(95);

    const isMp4 = videoBlob.type.includes("mp4") || videoUrl?.endsWith(".mp4");
    const filename = isMp4 ? "export.mp4" : "export.webm";

    const formData = new FormData();
    formData.append("video", videoBlob, filename);
    if (options?.canvasExport) {
      formData.append("canvasExport", "1");
    }
    if (
      options?.exportDurationSec != null &&
      Number.isFinite(options.exportDurationSec)
    ) {
      formData.append("exportDurationSec", String(options.exportDurationSec));
    }

    return postExportForm(formData, signal);
  }

  function downloadUrl(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  function handleCancelExport() {
    abortRef.current?.abort();
  }

  async function handleExport() {
    if (!imageUrl && !videoUrl) return;

    stopActiveAudioPreview();
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;

    setExporting(true);
    setProgress(0);
    setPhase("preparing");
    setError(null);

    try {
      setProgress(5);

      if (embeddedSpeech && videoUrl) {
        setProgress(40);
        setPhase("converting");
        const mp4Url = await exportLipSyncOnServer({}, signal);
        downloadUrl(mp4Url, `ad-${projectId.slice(0, 8)}.mp4`);
        onExported?.(mp4Url);
        setProgress(100);
        return;
      }

      let videoBlob: Blob;
      let videoDurationSec: number | null = null;
      let canvasExport = false;
      let exportDurationSec = resolveExportDurationSec(settings, null);

      if (videoUrl && !needsTextBurnIn) {
        const video = await loadVideoElement(videoUrl, signal);
        videoDurationSec = video.duration;
        exportDurationSec = resolveExportDurationSec(settings, videoDurationSec);
        videoBlob = await fetchExistingVideoBlob(videoUrl, signal);
      } else if (videoUrl) {
        canvasExport = true;
        const video = await loadVideoElement(videoUrl, signal);
        videoDurationSec = video.duration;
        exportDurationSec = resolveExportDurationSec(settings, videoDurationSec);
        setProgress(10);
        videoBlob = await exportFromVideo(
          video,
          exportDurationSec,
          videoDurationSec,
          signal
        );
      } else {
        canvasExport = true;
        if (needsTextBurnIn) {
          await waitForExportFonts(settings.textLayers);
        }
        exportDurationSec = resolveExportDurationSec(settings, null);
        setProgress(10);
        videoBlob = await exportFromImage(exportDurationSec, signal);
      }

      const mp4Url = await uploadAndConvert(videoBlob, signal, {
        canvasExport,
        exportDurationSec,
      });
      downloadUrl(mp4Url, `ad-${projectId.slice(0, 8)}.mp4`);
      onExported?.(mp4Url);
      setProgress(100);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Export cancelled.");
      } else {
        console.error("Export failed:", err);
        setError(err instanceof Error ? err.message : "Export failed");
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
      setPhase("idle");
    }
  }

  async function downloadRawVideo() {
    if (!videoUrl) return;
    stopActiveAudioPreview();
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;

    setExporting(true);
    setProgress(0);
    setPhase("converting");
    setError(null);

    try {
      setProgress(40);
      const mp4Url = await exportLipSyncOnServer({ rawOnly: true }, signal);
      downloadUrl(mp4Url, `ad-${projectId.slice(0, 8)}-raw.mp4`);
      setProgress(100);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Export cancelled.");
      } else {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    } finally {
      abortRef.current = null;
      setExporting(false);
      setPhase("idle");
    }
  }

  const phaseLabel =
    phase === "preparing"
      ? "Preparing…"
      : phase === "loading"
        ? "Loading video & text…"
        : phase === "rendering"
          ? `Rendering… ${progress}%`
          : phase === "converting"
            ? "Adding audio & converting to MP4…"
            : exporting
              ? `Exporting… ${progress}%`
              : null;

  return (
    <div className="space-y-3">
      {!hasAudio && !embeddedSpeech && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {agency
            ? "No narration yet — use Export PNG for a static image post, or add audio and export MP4."
            : "No narration yet — export will include text only. Generate audio on the Audio step first for narration and music."}
        </p>
      )}

      {embeddedSpeech && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          Export keeps the original Kling lip-sync video on the server (no browser
          re-encode). Garbled subtitles are cropped when{" "}
          <strong>Hide AI subtitle band</strong> is on. Optional background music
          is mixed at export. On-screen text/logo overlays are preview-only for
          talking-head — use Export PNG or edit externally if you need them baked in.
        </p>
      )}

      {embeddedSpeech && onChange && (
        <AvatarSubtitleToggle settings={settings} onChange={onChange} compact />
      )}

      {hasAudio && narrDuration != null && narrDuration > settings.duration && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Narration is {narrDuration.toFixed(1)}s — longer than your{" "}
          {settings.duration}s duration setting. Export will use{" "}
          {Math.ceil(narrDuration)}s so the full voice-over is included.
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleExportPng()}
        disabled={exporting || !imageUrl}
        className="btn-secondary w-full py-3 text-base"
      >
        {exporting && phase === "loading"
          ? "Exporting PNG…"
          : "Export PNG (static post)"}
      </button>

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || (!imageUrl && !videoUrl)}
        className="btn-primary w-full py-3 text-base"
      >
        {exporting ? phaseLabel : agency ? "Export MP4 (lip-sync)" : "Export MP4 (text + audio)"}
      </button>

      {exporting && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleCancelExport}
            className="btn-secondary w-full text-sm"
          >
            Cancel export
          </button>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {videoUrl && !exporting && (
        <button
          type="button"
          onClick={downloadRawVideo}
          className="btn-secondary w-full text-sm"
        >
          Download cropped lip-sync video (.mp4)
        </button>
      )}

      <p className="text-center text-xs text-gray-500">
        {embeddedSpeech
          ? "Server export from your Kling clip — lip-sync preserved, subtitles cropped, optional music at "
          : "Burns text onto your video, mixes narration + music on the server, then converts to MP4 at "}
        {settings.resolution}.
      </p>
    </div>
  );
}
