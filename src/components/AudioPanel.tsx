"use client";

import { useMemo } from "react";
import type { ProjectSettings } from "@/lib/types";
import type { AgencyPostFormat } from "@/lib/agencyPostFormat";
import { PromptField } from "@/components/PromptField";
import { buildNarrationSuggestions } from "@/lib/productSuggestions";
import { getVoiceLabel, isGeneratedNarrationStale, isGeneratedNarrationVoiceUnknown } from "@/lib/voiceMapping";

const VOICES = [
  { id: "professional-f", label: "Professional (Female)" },
  { id: "professional-m", label: "Professional (Male)" },
  { id: "warm-f", label: "Warm (Female)" },
  { id: "warm-m", label: "Warm (Male)" },
  { id: "energetic-f", label: "Energetic (Female)" },
  { id: "energetic-m", label: "Energetic (Male)" },
];

const MOODS = [
  { id: "uplifting", label: "Uplifting" },
  { id: "calm", label: "Calm" },
  { id: "professional", label: "Professional" },
  { id: "energetic", label: "Energetic" },
];

function agencyScriptHelper(format: AgencyPostFormat): string {
  switch (format) {
    case "talking-head":
      return "This is what the person will say on camera (lip-sync).";
    case "cinematic":
      return "Voice-over played over the video at export.";
    case "static":
      return "Optional — skip if you only export PNG.";
  }
}

interface AudioPanelProps {
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
  onPreviewNarration?: () => void;
  previewing?: boolean;
  agencyPostFormat?: AgencyPostFormat;
}

export function AudioPanel({
  settings,
  onChange,
  onPreviewNarration,
  previewing = false,
  agencyPostFormat,
}: AudioPanelProps) {
  const narrationSuggestions = useMemo(
    () => buildNarrationSuggestions(settings),
    [
      settings.benefitsPrompt,
      settings.scenePrompt,
      settings.subjectPrompt,
      settings.productName,
      settings.pharmacyName,
      settings.narrationScript,
    ]
  );

  const scriptLabel = agencyPostFormat ? "Spoken script" : undefined;
  const scriptHint = agencyPostFormat
    ? agencyScriptHelper(agencyPostFormat)
    : undefined;

  const canCopyCaption =
    agencyPostFormat &&
    settings.benefitsPrompt?.trim() &&
    !settings.narrationScript?.trim();

  const narrationStale =
    isGeneratedNarrationStale(settings) ||
    isGeneratedNarrationVoiceUnknown(settings);

  return (
    <div className="space-y-5">
      <PromptField
        field="narrationScript"
        value={settings.narrationScript || ""}
        onChange={(narrationScript) => onChange({ narrationScript })}
        rows={4}
        label={scriptLabel}
        hint={scriptHint}
        placeholder={
          agencyPostFormat
            ? "Write what will be spoken in the video..."
            : "Enter your product description or ad script..."
        }
        suggestions={narrationSuggestions}
      />
      {canCopyCaption && (
        <button
          type="button"
          onClick={() =>
            onChange({ narrationScript: settings.benefitsPrompt?.trim() })
          }
          className="btn-secondary text-sm"
        >
          Use on-screen caption as starting script
        </button>
      )}
      {onPreviewNarration && (
        <button
          type="button"
          onClick={onPreviewNarration}
          className="btn-secondary text-sm"
          disabled={!settings.narrationScript || previewing}
        >
          {previewing
            ? "Generating preview..."
            : "Preview selected voice + music"}
        </button>
      )}

      <p className="text-xs text-gray-500">
        <strong>Preview selected voice</strong> uses your current voice pick and
        does not spend credits. After you regenerate,{" "}
        <strong>Play saved narration</strong> plays the stored file below.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Voice</label>
        <div className="flex flex-wrap gap-2">
          <select
            className="input-field min-w-0 flex-1"
            value={settings.voiceId || "professional-f"}
            onChange={(e) => onChange({ voiceId: e.target.value })}
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          {onPreviewNarration && (
            <button
              type="button"
              onClick={onPreviewNarration}
              className="btn-secondary shrink-0 text-sm"
              disabled={!settings.narrationScript || previewing}
            >
              {previewing ? "…" : "Listen"}
            </button>
          )}
        </div>
        {narrationStale && (
          <p className="mt-1 text-xs text-amber-700">
            Voice changed to {getVoiceLabel(settings.voiceId)} — preview or
            regenerate to update the saved file.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Background Music Mood</label>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ musicMood: m.id })}
              className={`rounded-lg border px-3 py-2 text-sm ${
                settings.musicMood === m.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Narration Volume: {settings.narrationVolume ?? 100}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.narrationVolume ?? 100}
          onChange={(e) => onChange({ narrationVolume: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Music Volume: {settings.musicVolume ?? 40}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.musicVolume ?? 40}
          onChange={(e) => onChange({ musicVolume: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
