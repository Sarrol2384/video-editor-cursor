"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Stepper } from "@/components/Stepper";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ImageVariantPicker } from "@/components/ImageVariantPicker";
import type { ProjectSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { buildBrandLayout } from "@/lib/brandLayouts";
import {
  playBrowserNarrationPreview,
  playMixedAudioPreview,
  stopActiveAudioPreview,
} from "@/lib/audioPreview";
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { getNarrationDurationSec } from "@/lib/exportAudio";
import { estimateCredits, getModelById, isAvatarVideoModel } from "@/lib/models";
import { AGENCY_STOCK_IMAGE_URL, inferWorkflowMode } from "@/lib/brands";
import {
  type AgencyPostFormat,
  agencyNarrationRequired,
  resolveAgencyPostFormat,
  settingsForAgencyPostFormat,
} from "@/lib/agencyPostFormat";
import {
  getStepLabels,
  isAgencyWorkflow,
  isFashionWorkflow,
  isPipelineStepComplete,
  maxReachableStep,
  resolveStudioStep,
  shouldClearVideoForImageChange,
} from "@/lib/studioWorkflow";

function getAudioCreditCost(duration: number): number {
  const model = getModelById("xai-tts");
  return model ? estimateCredits(model, duration) : 0;
}

const EnhancePanel = dynamic(
  () => import("@/components/EnhancePanel").then((m) => m.EnhancePanel),
  { loading: () => <PanelSkeleton /> }
);
const ControlInspector = dynamic(
  () => import("@/components/ControlInspector").then((m) => m.ControlInspector),
  { loading: () => <PanelSkeleton /> }
);
const ModelPicker = dynamic(
  () => import("@/components/ModelPicker").then((m) => m.ModelPicker),
  { loading: () => <PanelSkeleton /> }
);
const AudioPanel = dynamic(
  () => import("@/components/AudioPanel").then((m) => m.AudioPanel),
  { loading: () => <PanelSkeleton /> }
);
const AudioPlayer = dynamic(
  () => import("@/components/AudioPlayer").then((m) => m.AudioPlayer),
  { loading: () => <PanelSkeleton /> }
);
const TextLayerEditor = dynamic(
  () => import("@/components/TextLayerEditor").then((m) => m.TextLayerEditor),
  { loading: () => <PanelSkeleton tall /> }
);
const ExportButton = dynamic(
  () => import("@/components/ExportButton").then((m) => m.ExportButton),
  { loading: () => <PanelSkeleton /> }
);
const AvatarSubtitleToggle = dynamic(
  () =>
    import("@/components/AvatarSubtitleToggle").then((m) => m.AvatarSubtitleToggle),
  { loading: () => null }
);

function PanelSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-100 ${tall ? "h-64" : "h-24"}`}
    />
  );
}

interface Variant {
  id: string;
  style: string;
  label: string;
  filter: string;
  background: string;
  storageUrl?: string;
}

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<ProjectSettings>({ ...DEFAULT_SETTINGS });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [message, setMessage] = useState("");
  const [imageProvider, setImageProvider] = useState<string | null>(null);
  const seededTextLayersRef = useRef(false);
  const imageGenAbortRef = useRef<AbortController | null>(null);

  const imageUrl =
    settings.selectedImageUrl || settings.sourceImageUrl || "";

  const selectedVideoModel = getModelById(
    settings.selectedModelId || "kling-o3-standard"
  );

  const loadProject = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError("");

    try {
      const [projRes, meRes] = await Promise.all([
        fetchWithTimeout(`/api/projects/${projectId}`),
        fetchWithTimeout("/api/auth/me").catch(() => null),
      ]);

      let projData: { project?: { name: string; step?: number; settings?: ProjectSettings } };
      try {
        projData = await projRes.json();
      } catch {
        setError("Failed to load project");
        return;
      }

      if (!projRes.ok) {
        router.push("/dashboard");
        return;
      }

      if (!projData.project) {
        setError("Failed to load project");
        return;
      }

      setProjectName(projData.project.name);
      const loadedSettings =
        projData.project.settings || { ...DEFAULT_SETTINGS };
      setSettings(loadedSettings);
      const savedStep = projData.project.step || 0;
      setStep(resolveStudioStep(savedStep, loadedSettings));

      if (meRes?.ok) {
        try {
          const meData = await meRes.json();
          setCredits(meData.user?.credits ?? 0);
        } catch {
          // Credits are optional
        }
      }
    } catch (err) {
      if (err instanceof FetchTimeoutError) {
        setError(
          "Loading timed out. Check that the dev server is running (see terminal port) and try again."
        );
      } else {
        setError("Failed to load project. Is the dev server running?");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (seededTextLayersRef.current || step < 2 || !imageUrl) return;
    if (settings.textLayers.length > 0) return;

    seededTextLayersRef.current = true;
    const layers = buildBrandLayout(settings.pharmacyName);
    void saveSettings({ textLayers: layers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, imageUrl, settings.textLayers.length]);

  async function saveSettings(updates: Partial<ProjectSettings>, newStep?: number) {
    let merged!: ProjectSettings;
    let apiSettings!: Record<string, unknown>;
    setSettings((prev) => {
      const clearVideo =
        shouldClearVideoForImageChange(prev, updates) ||
        Boolean(
          updates.generatedVideoUrl === null ||
            updates.videoHasEmbeddedAudio === null
        );
      merged = { ...prev, ...updates };
      if (clearVideo) {
        delete merged.generatedVideoUrl;
        delete merged.videoHasEmbeddedAudio;
      }
      apiSettings = clearVideo
        ? {
            ...merged,
            generatedVideoUrl: null,
            videoHasEmbeddedAudio: null,
          }
        : { ...merged };
      return merged;
    });
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: apiSettings,
        step: newStep ?? step,
      }),
    });
  }

  async function handleApproveImageAndContinue() {
    const updates: Partial<ProjectSettings> = {};

    if (selectedVariant) {
      updates.selectedImageVariantId = selectedVariant.id;
      updates.selectedImageUrl =
        selectedVariant.storageUrl || settings.sourceImageUrl;
      updates.imageStyle = selectedVariant.style;
    } else if (!settings.selectedImageUrl && settings.sourceImageUrl) {
      updates.selectedImageUrl = settings.sourceImageUrl;
    }

    await saveSettings(updates, 2);
    setStep(2);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      await saveSettings({ sourceImageUrl: data.asset.storageUrl }, 0);
      setMessage("Image uploaded successfully!");
      setStep(1);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function cancelImageGeneration() {
    imageGenAbortRef.current?.abort();
    imageGenAbortRef.current = null;
    setGenerating(false);
    setMessage("");
    setError("Ad creative generation cancelled.");
  }

  async function handleUseUploadedImageSkipAi() {
    if (!settings.sourceImageUrl) return;
    setError("");
    await saveSettings({
      selectedImageUrl: settings.sourceImageUrl,
    });
    setMessage("Using your uploaded image — AI generation skipped.");
    setStep(2);
  }

  async function handleGenerateImages() {
    if (!settings.sourceImageUrl) return;
    imageGenAbortRef.current?.abort();
    const abortController = new AbortController();
    imageGenAbortRef.current = abortController;
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          sourceImageUrl: settings.sourceImageUrl,
          modelId:
            settings.selectedImageModelId ||
            (inferWorkflowMode(settings) === "agency" ||
            inferWorkflowMode(settings) === "fashion"
              ? "nano-banana-2"
              : "nano-banana"),
          settings,
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const data = await res.json();

      if (abortController.signal.aborted) return;

      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }
      setVariants(data.variants);
      setCredits(data.credits);
      setImageProvider(data.provider || null);

      const generated = data.variants?.[0];
      if (generated) {
        setSelectedVariant(generated);
        await saveSettings({
          selectedImageVariantId: generated.id,
          selectedImageUrl: generated.storageUrl || settings.sourceImageUrl,
          imageStyle: generated.style,
        });
      } else if (data.settings) {
        setSettings(data.settings);
      }

      if (data.warning) {
        setError(data.warning);
      } else {
        const providerLabel =
          data.provider === "bria"
            ? "Bria Product Shot"
            : data.provider === "nano-banana-2"
              ? "Nano Banana 2"
              : data.provider === "nano-banana"
                ? "Nano Banana"
                : "mock preview";
        setMessage(
          `Ad creative generated via ${providerLabel}. Not happy? Click regenerate.`
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Ad creative generation cancelled.");
        return;
      }
      setError("Image generation failed");
    } finally {
      if (imageGenAbortRef.current === abortController) {
        imageGenAbortRef.current = null;
      }
      if (!abortController.signal.aborted) {
        setGenerating(false);
      }
    }
  }

  async function handleSelectVariant(variant: Variant) {
    setSelectedVariant(variant);
    await saveSettings({
      selectedImageVariantId: variant.id,
      selectedImageUrl: variant.storageUrl || settings.sourceImageUrl,
      imageStyle: variant.style,
    });
    setMessage(`Selected ${variant.label} ad creative`);
  }

  async function handleGenerateVideo() {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          modelId: settings.selectedModelId,
          settings,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Video generation failed");
        return;
      }
      setSettings(data.settings);
      setCredits(data.credits);
      setStep(4);
      setMessage("Video generated! Review text and export when ready.");
    } catch {
      setError("Video generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const audioCreditCost = getAudioCreditCost(settings.duration ?? 8);
  const canAffordAudio = credits >= audioCreditCost;
  const reachableStep = maxReachableStep(settings);
  const agency = isAgencyWorkflow(settings);
  const fashion = isFashionWorkflow(settings);
  const postFormat = agency ? resolveAgencyPostFormat(settings) : null;
  const stepLabels = getStepLabels(settings);
  const videoMode =
    agency && postFormat === "talking-head"
      ? "avatar"
      : settings.videoGenerationMode || "motion";
  const isTalkingHead = agency && postFormat === "talking-head";
  const avatarNarrationDuration =
    settings.generatedNarrationDuration ?? settings.duration ?? 8;

  function handlePostFormatChange(format: AgencyPostFormat) {
    if (format === postFormat) return;
    if (
      settings.generatedVideoUrl &&
      !window.confirm(
        "Changing post format updates video model settings. Your existing video stays until you regenerate. Continue?"
      )
    ) {
      return;
    }
    void saveSettings(settingsForAgencyPostFormat(format));
  }

  async function handleStartFromPrompts() {
    await saveSettings({
      sourceImageUrl: AGENCY_STOCK_IMAGE_URL,
      selectedImageUrl: AGENCY_STOCK_IMAGE_URL,
    });
    setStep(1);
    setMessage("Using blank canvas — edit prompts and generate your scene.");
  }

  async function handleGenerateAudio() {
    setGenerating(true);
    setError("");
    setAudioError("");
    setMessage("");

    if (!canAffordAudio) {
      setAudioError(
        `Not enough credits. Narration costs ${audioCreditCost} credits; you have ${credits}.`
      );
      setGenerating(false);
      return;
    }

    try {
      const res = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          script: settings.narrationScript,
          voiceId: settings.voiceId,
          musicMood: settings.musicMood,
          duration: settings.duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Audio generation failed";
        setAudioError(msg);
        setError(msg);
        return;
      }
      let nextSettings = data.settings as ProjectSettings;
      if (nextSettings.generatedNarrationUrl) {
        const narrDuration = await getNarrationDurationSec(
          nextSettings.generatedNarrationUrl
        );
        if (narrDuration) {
          const matchedDuration = Math.min(
            60,
            Math.max(nextSettings.duration ?? 8, Math.ceil(narrDuration))
          );
          nextSettings = {
            ...nextSettings,
            generatedNarrationDuration: narrDuration,
            duration: matchedDuration,
          };
          await saveSettings({
            generatedNarrationDuration: narrDuration,
            duration: matchedDuration,
          });
        }
      }
      setSettings(nextSettings);
      setCredits(data.credits);
      setStep(3);
      setMessage(
        nextSettings.generatedNarrationDuration
          ? `Audio is ${nextSettings.generatedNarrationDuration.toFixed(1)}s — video duration set to ${nextSettings.duration}s. Generate video next.`
          : "Audio generated! Generate video next."
      );
    } catch {
      const msg = "Audio generation failed";
      setAudioError(msg);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreviewNarration() {
    if (!settings.narrationScript || previewing) return;

    setPreviewing(true);
    setError("");
    stopActiveAudioPreview();

    try {
      const res = await fetch("/api/generate/audio/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: settings.narrationScript,
          voiceId: settings.voiceId || "professional-f",
        }),
      });
      const data = await res.json();
      const previewOptions = {
        musicMood: settings.musicMood || "professional",
        narrationVolume: settings.narrationVolume ?? 100,
        musicVolume: settings.musicVolume ?? 40,
      };

      if (!res.ok) {
        const billingIssue =
          res.status === 403 ||
          String(data.error || "").toLowerCase().includes("balance");

        if (billingIssue || res.status === 503) {
          await playBrowserNarrationPreview({
            script: settings.narrationScript,
            voiceId: settings.voiceId || "professional-f",
            ...previewOptions,
          });
          setMessage(
            billingIssue
              ? "fal.ai balance exhausted — using browser voice + mood music. Top up at fal.ai/dashboard/billing for AI voices."
              : "Using browser voice + mood music (FAL_KEY not configured)."
          );
          return;
        }

        setError(data.error || "Audio preview failed");
        return;
      }

      await playMixedAudioPreview({
        narrationUrl: data.narrationUrl,
        ...previewOptions,
      });
    } catch {
      setError("Audio preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  function handleStepClick(s: number) {
    if (s <= maxReachableStep(settings)) setStep(s);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading project…</p>
      </div>
    );
  }

  if (error && !projectName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <p className="max-w-md text-center text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => void loadProject()} className="btn-primary">
          Retry
        </button>
        <p className="max-w-md text-center text-xs text-gray-500">
          In dev, confirm the terminal URL matches your browser (e.g. port 3001 vs 3002).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar credits={credits} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{projectName}</h1>
            <p className="text-sm text-gray-500">
              {settings.pharmacyName}
              {settings.brandId && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/business/${settings.brandId}`}
                    className="text-brand-600 hover:underline"
                  >
                    Back to workspace
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <Stepper
          currentStep={step}
          maxReachableStep={reachableStep}
          steps={stepLabels}
          isStepComplete={(id) => isPipelineStepComplete(id, settings)}
          onStepClick={handleStepClick}
        />

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {step >= 2 && step <= 4 && imageUrl && (
            <div className="card lg:col-span-3">
              <h2 className="mb-4 text-lg font-semibold">Video Preview & Text</h2>
              {step === 2 && (
                <p className="mb-3 text-sm text-gray-600">
                  {agency && postFormat === "talking-head"
                    ? "Write your spoken script and generate voice — the person will lip-sync to this on camera in step 3."
                    : agency && postFormat === "cinematic"
                      ? "Write your spoken script and generate voice-over — it plays over the animated scene at export."
                      : agency && postFormat === "static"
                        ? "Voice is optional for static posts. Add text overlays above, then export PNG."
                        : "Write your narration script and generate audio first — you will see how long it is, then generate video to match."}
                </p>
              )}
              {step === 3 && !settings.generatedVideoUrl && postFormat !== "static" && (
                <p className="mb-3 text-xs text-gray-500">
                  {agency && postFormat === "talking-head"
                    ? "Kling Avatar lip-syncs to your spoken script. Generate video when ready."
                    : agency && postFormat === "cinematic"
                      ? `Kling O3 animates your scene (${settings.duration}s). Voice-over is mixed at export.`
                      : `Showing a preview of your approved image. Video duration is set to ${settings.duration}s to fit your narration. Click Generate Video to create the animated ad.`}
                </p>
              )}
              {step === 3 && postFormat === "static" && (
                <p className="mb-3 text-sm text-gray-600">
                  Static image post — add headlines and call-to-action text above, then
                  skip to Export for PNG.
                </p>
              )}
              {step === 3 && settings.generatedVideoUrl && (
                <p className="mb-3 text-sm text-gray-600">
                  Add headlines, prices, and call-to-action text on your video.
                  Use <strong>Add text</strong> on the right, scroll the panel for
                  all options, and drag text on the preview to reposition it.
                </p>
              )}
              {step === 4 && (
                <p className="mb-3 text-sm text-gray-600">
                  Final check of on-screen text before export. If you changed motion
                  settings, use <strong>Regenerate Video</strong> in the right panel
                  first, then export.
                </p>
              )}
              <TextLayerEditor
                imageUrl={imageUrl}
                videoUrl={settings.generatedVideoUrl}
                settings={settings}
                onChange={(u) => saveSettings(u)}
              />
            </div>
          )}

          {/* Left panel - main content */}
          <div className="lg:col-span-2 space-y-6">
            {step === 0 && (
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">
                  {agency
                    ? "Image source"
                    : fashion
                      ? "Upload clothing photo"
                      : "Upload Product Photo"}
                </h2>
                {agency && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                      Post format
                    </h3>
                    <p className="mb-3 text-sm text-gray-600">
                      Choose how this post will be delivered — this sets the script
                      and video steps for the project.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          {
                            id: "static" as const,
                            title: "Static image post",
                            desc: "PNG with text overlays — no video.",
                          },
                          {
                            id: "cinematic" as const,
                            title: "Cinematic video",
                            desc: "Scene animation + voice-over at export.",
                          },
                          {
                            id: "talking-head" as const,
                            title: "Talking-head video",
                            desc: "Presenter lip-syncs your spoken script.",
                          },
                        ] as const
                      ).map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => handlePostFormatChange(card.id)}
                          className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                            postFormat === card.id
                              ? "border-brand-500 bg-brand-50 text-brand-800"
                              : "border-gray-200 hover:border-brand-300"
                          }`}
                        >
                          <span className="font-medium">{card.title}</span>
                          <p className="mt-0.5 text-xs opacity-80">{card.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {agency && (
                  <p className="mb-4 text-sm text-gray-600">
                    Upload a specific asset, or start from prompts with a blank
                    canvas and let Nano Banana build the scene.
                  </p>
                )}
                {fashion && (
                  <p className="mb-4 text-sm text-gray-600">
                    Upload a flat lay, mannequin shot, or detail photo of the garment
                    or accessory. We&apos;ll place it on a model in your chosen scene.
                  </p>
                )}
                <UploadDropzone
                  onUpload={handleUpload}
                  currentImage={settings.sourceImageUrl}
                  loading={uploading}
                />
                {agency && (
                  <button
                    type="button"
                    onClick={() => void handleStartFromPrompts()}
                    className="btn-secondary mt-4 w-full"
                  >
                    Start from prompts (no upload)
                  </button>
                )}
                {settings.sourceImageUrl && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-primary mt-4 w-full"
                  >
                    {agency
                      ? "Continue to Create"
                      : fashion
                        ? "Continue to Model shot"
                        : "Continue to Enhance"}
                  </button>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="mb-4 text-lg font-semibold">
                    {agency
                      ? "Create scene from prompts"
                      : fashion
                        ? "Generate model wearing your piece"
                        : "Create Ad from Product Photo"}
                  </h2>
                  {settings.sourceImageUrl && (
                    <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={settings.sourceImageUrl}
                        alt="Uploaded product"
                        className="mx-auto max-h-48 object-contain"
                      />
                    </div>
                  )}
                  {settings.sourceImageUrl && (
                    <>
                      {generating ? (
                        <div className="mb-4 flex gap-2">
                          <button
                            type="button"
                            disabled
                            className="btn-primary min-w-0 flex-1 opacity-80"
                          >
                            Generating ad creative...
                          </button>
                          <button
                            type="button"
                            onClick={cancelImageGeneration}
                            className="btn-secondary shrink-0 text-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateImages}
                          className="btn-primary mb-4 w-full"
                        >
                          {variants.length > 0
                            ? fashion
                              ? "Regenerate Model Shot (15 credits)"
                              : "Regenerate Ad Creative (15 credits)"
                            : fashion
                              ? "Generate Model Shot (15 credits)"
                              : "Generate Ad Creative (15 credits)"}
                        </button>
                      )}
                      {(agency || fashion) &&
                        settings.sourceImageUrl !== AGENCY_STOCK_IMAGE_URL &&
                        !generating && (
                          <button
                            type="button"
                            onClick={() => void handleUseUploadedImageSkipAi()}
                            className="btn-secondary mb-4 w-full"
                          >
                            Use uploaded image — skip AI
                          </button>
                        )}
                      <p className="mb-4 text-xs text-gray-500">
                        {agency
                          ? "Generate builds a scene from your prompts (15 credits). Already have a finished post? Skip AI and use your upload."
                          : fashion
                            ? "Generate places your garment on a model (15 credits). Already have a finished photo? Skip AI and use your upload."
                            : "Creates one image per click (15 credits). Regenerate if you want a different result, or cancel while generating."}
                      </p>
                      {imageProvider === "mock" && (
                        <p className="mb-4 text-xs text-amber-700">
                          API unavailable — showing mock style previews. Check FAL_KEY and fal.ai balance.
                        </p>
                      )}
                      {imageProvider === "aikit" && (
                        <p className="mb-4 text-xs text-amber-700">
                          Backup generator used — it may not keep your exact
                          product. Top up fal.ai for product-accurate Nano Banana.
                        </p>
                      )}
                      {variants.length > 0 && (
                        <>
                          <ImageVariantPicker
                            sourceImage={settings.sourceImageUrl}
                            variants={variants}
                            aspectRatio={settings.aspectRatio}
                            imageFit={settings.imageFit}
                            selectedId={selectedVariant?.id || settings.selectedImageVariantId}
                            onSelect={handleSelectVariant}
                          />
                          <button
                            type="button"
                            onClick={() => void handleApproveImageAndContinue()}
                            disabled={!selectedVariant && !settings.sourceImageUrl}
                            className="btn-primary mt-4 w-full"
                          >
                            {agency
                              ? "Approve & continue"
                              : fashion
                                ? "Approve & Continue to Audio"
                                : "Approve & Continue to Audio"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">
                  {agency ? "Script & voice" : "Audio & Music"}
                </h2>
                {agency && postFormat && (
                  <p className="mb-4 rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm text-brand-800">
                    {postFormat === "talking-head"
                      ? "Spoken script is required — this is what the person says on camera."
                      : postFormat === "cinematic"
                        ? "Spoken script becomes voice-over over your animated scene."
                        : "Voice is optional — skip if you only export a static PNG."}
                  </p>
                )}
                {settings.generatedNarrationUrl && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    Narration is ready. Continue to Video, or regenerate below
                    if you changed the script or voice.
                  </div>
                )}
                <AudioPanel
                  settings={settings}
                  onChange={(u) => saveSettings(u)}
                  onPreviewNarration={handlePreviewNarration}
                  previewing={previewing}
                  agencyPostFormat={agency ? postFormat ?? undefined : undefined}
                />
                {settings.generatedNarrationUrl && (
                  <div className="mt-4">
                    <AudioPlayer
                      settings={settings}
                      narrationUrl={settings.generatedNarrationUrl}
                      onNarrationDuration={(sec) =>
                        void saveSettings({ generatedNarrationDuration: sec })
                      }
                      onMatchDuration={(sec) =>
                        void saveSettings({ duration: sec })
                      }
                    />
                  </div>
                )}
                {audioError && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {audioError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  disabled={
                    generating ||
                    previewing ||
                    !settings.narrationScript?.trim() ||
                    !canAffordAudio
                  }
                  className="btn-primary mt-4 w-full"
                >
                  {generating
                    ? "Generating narration..."
                    : settings.generatedNarrationUrl
                      ? "Regenerate Audio"
                      : "Generate Audio"}
                </button>
                {!canAffordAudio && (
                  <p className="mt-2 text-xs text-red-600">
                    You need {audioCreditCost} credits but only have {credits}.
                  </p>
                )}
                {canAffordAudio && (
                  <p className="mt-2 text-xs text-gray-500">
                    Uses {audioCreditCost} credits. Background music is mixed in
                    when you preview, play, or export.
                  </p>
                )}
                {settings.generatedNarrationUrl && (
                  <button
                    type="button"
                    onClick={() => setStep(agency && postFormat === "static" ? 4 : 3)}
                    className="btn-secondary mt-3 w-full"
                  >
                    {agency && postFormat === "static"
                      ? "Continue to Export →"
                      : agency
                        ? "Continue to Video →"
                        : "Continue to Video →"}
                  </button>
                )}
                {agency && postFormat === "static" && !settings.generatedNarrationUrl && (
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="btn-secondary mt-3 w-full"
                  >
                    Skip voice — export static post →
                  </button>
                )}
              </div>
            )}

            {step === 4 && imageUrl && (
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">Export</h2>
                <p className="mb-3 text-xs text-gray-500">
                  Export uses your current generated video. To apply new motion
                  settings, click <strong>Regenerate Video</strong> in the panel
                  on the right, then export again.
                </p>
                <ExportButton
                  imageUrl={imageUrl}
                  videoUrl={settings.generatedVideoUrl}
                  settings={settings}
                  projectId={projectId}
                  onChange={(u) => void saveSettings(u)}
                />
              </div>
            )}
          </div>

          {/* Right panel - controls */}
          <div className="space-y-6">
            {step === 1 && settings.sourceImageUrl && (
              <div className="card">
                <h3 className="mb-4 font-semibold text-gray-900">
                  {fashion ? "Model Shot Prompts" : "Ad Creative Prompts"}
                </h3>
                <EnhancePanel
                  settings={settings}
                  onChange={(u) => saveSettings(u)}
                />
              </div>
            )}

            {step >= 2 && (
              <div className="card">
                <h3 className="mb-4 font-semibold text-gray-900">Video Controls</h3>
                <ControlInspector
                  settings={settings}
                  onChange={(u) => saveSettings(u)}
                />
              </div>
            )}

            {step === 3 && agency && postFormat === "static" && (
              <div className="card">
                <h3 className="mb-3 font-semibold text-gray-900">Static image post</h3>
                <p className="mb-4 text-sm text-gray-600">
                  No video generation needed. Add text overlays in the preview above,
                  then export PNG on the Export step.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="btn-primary w-full"
                >
                  Skip to Export →
                </button>
              </div>
            )}

            {(step === 3 || step === 4) &&
              !(agency && postFormat === "static") && (
              <>
                {agency && postFormat && (
                  <div className="card">
                    <h3 className="mb-2 font-semibold text-gray-900">Video format</h3>
                    <p className="text-sm text-brand-800">
                      {postFormat === "talking-head"
                        ? "Talking-head — Kling Avatar lip-syncs to your spoken script."
                        : "Cinematic — Kling O3 animates your scene; voice-over plays at export."}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Change format on step Image if you need a different post type.
                    </p>
                    {postFormat === "talking-head" &&
                      settings.videoHasEmbeddedAudio &&
                      settings.generatedVideoUrl && (
                        <div className="mt-4">
                          <AvatarSubtitleToggle
                            settings={settings}
                            onChange={(u) => void saveSettings(u)}
                            compact
                          />
                        </div>
                      )}
                  </div>
                )}
                <div className="card">
                  <h3 className="mb-4 font-semibold text-gray-900">AI Model</h3>
                  <ModelPicker
                    kind="video"
                    aspectRatio={settings.aspectRatio}
                    duration={
                      isTalkingHead ? avatarNarrationDuration : settings.duration
                    }
                    resolution={settings.resolution}
                    priority={settings.priority}
                    videoMode={agency ? videoMode : undefined}
                    selectedModelId={settings.selectedModelId}
                    onSelect={(id) => {
                      if (
                        agency &&
                        postFormat === "talking-head" &&
                        !isAvatarVideoModel(id)
                      ) {
                        return;
                      }
                      if (
                        agency &&
                        postFormat === "cinematic" &&
                        isAvatarVideoModel(id)
                      ) {
                        return;
                      }
                      saveSettings({
                        selectedModelId: id,
                        videoGenerationMode: isAvatarVideoModel(id)
                          ? "avatar"
                          : "motion",
                        videoHasEmbeddedAudio: isAvatarVideoModel(id)
                          ? settings.videoHasEmbeddedAudio
                          : false,
                      });
                    }}
                  />
                </div>
                {settings.selectedModelId === "veo-3-1-fast" &&
                  !["16:9", "9:16"].includes(settings.aspectRatio) && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Veo 3 only supports 16:9 or 9:16. Your frame is{" "}
                    {settings.aspectRatio} — use Kling O3 Standard for square
                    ads, or change aspect ratio to 9:16 before generating.
                  </p>
                )}
                {settings.selectedModelId === "kling-v3" && (
                  <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                    Kling V3 is the older model. Select Kling O3 Standard above
                    for better quality and motion.
                  </p>
                )}
                {!settings.generatedNarrationUrl && !agency && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Generate narration on the Audio step first so video length
                    matches your voice-over.
                  </p>
                )}
                {agency &&
                  agencyNarrationRequired(settings) &&
                  !settings.generatedNarrationUrl && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {isTalkingHead
                      ? "Generate voice on the Script & voice step first — the person will lip-sync to your script."
                      : "Generate voice on the Script & voice step first — it plays over the video at export."}
                  </p>
                )}
                {isTalkingHead && settings.generatedNarrationUrl && (
                  <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                    Narration ready ({Math.round(avatarNarrationDuration)}s). Video
                    length follows your voice track.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={
                    generating ||
                    !imageUrl ||
                    (!agency && !settings.generatedNarrationUrl) ||
                    (agency &&
                      agencyNarrationRequired(settings) &&
                      !settings.generatedNarrationUrl)
                  }
                  className="btn-primary w-full py-3"
                >
                  {generating
                    ? `Generating with ${selectedVideoModel?.name || "AI"}… (2–4 min)`
                    : settings.generatedVideoUrl
                      ? `Regenerate Video (${selectedVideoModel?.name || "AI"})`
                      : isTalkingHead
                        ? `Generate Talking-Head Video (${selectedVideoModel?.name || "AI"})`
                        : `Generate Video (${selectedVideoModel?.name || "AI"})`}
                </button>
                {generating && (
                  <p className="text-center text-xs text-gray-500">
                    Calling {selectedVideoModel?.name || "the AI video model"}.
                    Please keep this tab open.
                  </p>
                )}
                {agency && postFormat === "cinematic" && (
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="btn-secondary mt-3 w-full"
                  >
                    Skip video — export with voice-over only →
                  </button>
                )}
              </>
            )}

            {step >= 2 && (
              <div className="card text-sm text-gray-500">
                <h4 className="font-medium text-gray-700">Pipeline Status</h4>
                <ul className="mt-2 space-y-1">
                  <li>{settings.sourceImageUrl ? "✓" : "○"} Image uploaded</li>
                  <li>{settings.selectedImageUrl || selectedVariant ? "✓" : "○"} Image enhanced</li>
                  <li>{settings.generatedNarrationUrl ? "✓" : "○"} Audio added</li>
                  <li>{settings.generatedVideoUrl ? "✓" : "○"} Video generated</li>
                  <li>○ Exported</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
