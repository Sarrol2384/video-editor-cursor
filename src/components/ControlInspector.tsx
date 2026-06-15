"use client";

import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import { resolveAgencyPostFormat } from "@/lib/agencyPostFormat";
import { PromptField } from "@/components/PromptField";

interface ControlInspectorProps {
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
}

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"];
const RESOLUTIONS = ["720p", "1080p", "4K"];
const MOTION_LEVELS = ["low", "medium", "high"] as const;

export function ControlInspector({ settings, onChange }: ControlInspectorProps) {
  const agency = inferWorkflowMode(settings) === "agency";
  const postFormat = agency ? resolveAgencyPostFormat(settings) : null;
  const showMotionPrompt = !agency || postFormat === "cinematic";

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Aspect Ratio</label>
        <select
          className="input-field"
          value={settings.aspectRatio}
          onChange={(e) => onChange({ aspectRatio: e.target.value })}
        >
          {ASPECT_RATIOS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Duration: {settings.duration}s
        </label>
        <input
          type="range"
          min={4}
          max={
            settings.generatedNarrationDuration
              ? Math.min(60, Math.ceil(settings.generatedNarrationDuration) + 4)
              : 16
          }
          value={settings.duration}
          onChange={(e) => onChange({ duration: parseInt(e.target.value) })}
          className="w-full"
        />
        {settings.generatedNarrationDuration != null && (
          <p className="mt-1 text-xs text-gray-500">
            Narration is {settings.generatedNarrationDuration.toFixed(1)}s — set
            duration to at least {Math.ceil(settings.generatedNarrationDuration)}
            s before generating video, or export will extend automatically.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Resolution</label>
        <select
          className="input-field"
          value={settings.resolution}
          onChange={(e) => onChange({ resolution: e.target.value })}
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Image Framing</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ imageFit: "contain" })}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm leading-none ${
              settings.imageFit === "contain"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => onChange({ imageFit: "cover" })}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm leading-none ${
              settings.imageFit === "cover"
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Fill
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Fit shows the full ad image with black bars if needed. Fill crops to
          fill the {settings.aspectRatio} frame. Changes apply to the preview
          immediately.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Motion Intensity</label>
        <div className="flex gap-2">
          {MOTION_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ motionIntensity: level })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize leading-none ${
                settings.motionIntensity === level
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Controls AI video camera motion. Medium or High adds visible movement.
          Use Kling O3 Standard for best quality.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h4 className="mb-3 text-sm font-semibold text-brand-600">Business Controls</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Freeze Product</span>
            <input
              type="checkbox"
              checked={settings.freezeProduct}
              onChange={(e) => onChange({ freezeProduct: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Freeze Text</span>
            <input
              type="checkbox"
              checked={settings.freezeText}
              onChange={(e) => onChange({ freezeText: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </label>
        </div>
      </div>

      {showMotionPrompt && (
        <PromptField
          field="motionPrompt"
          value={settings.motionPrompt}
          onChange={(motionPrompt) => onChange({ motionPrompt })}
          brandName={settings.pharmacyName}
          rows={3}
        />
      )}

      <PromptField
        field="backgroundPrompt"
        value={settings.backgroundPrompt}
        onChange={(backgroundPrompt) => onChange({ backgroundPrompt })}
        brandName={settings.pharmacyName}
        rows={2}
      />

      <PromptField
        field="subjectPrompt"
        value={settings.subjectPrompt}
        onChange={(subjectPrompt) => onChange({ subjectPrompt })}
        brandName={settings.pharmacyName}
        rows={2}
      />
    </div>
  );
}
