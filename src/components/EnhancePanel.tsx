"use client";

import { useState } from "react";
import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import { isAgencyBrand, isFashionBrand } from "@/lib/brandLayouts";
import { resolveAgencyPostFormat } from "@/lib/agencyPostFormat";
import {
  getAgencyServiceNameSuggestions,
  getFashionProductNameSuggestions,
  getPromptSuggestionsForField,
  hasValidAiSuggestions,
  isAiSuggestionsStale,
  shouldShowProductSuggestions,
} from "@/lib/productSuggestions";
import { PRODUCT_PROMPT_CREDIT_COST } from "@/lib/creditCosts";
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { PromptField } from "@/components/PromptField";
import { ModelPicker } from "@/components/ModelPicker";
import { VisualStylePicker } from "@/components/VisualStylePicker";

interface EnhancePanelProps {
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
  projectId?: string;
  sourceImageUrl?: string;
  credits?: number;
  onCreditsChange?: (credits: number) => void;
}

export function EnhancePanel({
  settings,
  onChange,
  projectId,
  sourceImageUrl,
  credits = 0,
  onCreditsChange,
}: EnhancePanelProps) {
  const workflow = inferWorkflowMode(settings);
  const agency = workflow === "agency" || isAgencyBrand(settings.pharmacyName);
  const fashion = workflow === "fashion" || isFashionBrand(settings.pharmacyName);
  const pharmacy = !agency && !fashion;
  const brandName = settings.pharmacyName;
  const postFormat = agency ? resolveAgencyPostFormat(settings) : null;
  const [captionOpen, setCaptionOpen] = useState(postFormat !== "talking-head");
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [promptError, setPromptError] = useState("");

  const showPromptSuggestions = shouldShowProductSuggestions(settings);
  const aiReady = hasValidAiSuggestions(settings);
  const aiStale = isAiSuggestionsStale(settings);

  const canGeneratePrompts =
    pharmacy &&
    Boolean(projectId) &&
    Boolean(sourceImageUrl) &&
    Boolean(settings.productName?.trim()) &&
    credits >= PRODUCT_PROMPT_CREDIT_COST;

  function fieldSuggestions(field: Parameters<typeof getPromptSuggestionsForField>[1]) {
    if (pharmacy) {
      return getPromptSuggestionsForField(settings, field, brandName);
    }
    return undefined;
  }

  async function handleGenerateProductPrompts() {
    if (!projectId || !sourceImageUrl || !settings.productName?.trim()) return;

    setGeneratingPrompts(true);
    setPromptError("");
    try {
      const res = await fetchWithTimeout(
        "/api/generate/product-prompts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            productName: settings.productName.trim(),
            sourceImageUrl,
            pharmacyName: settings.pharmacyName,
          }),
        },
        180_000
      );
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Failed to generate prompts";
        setPromptError(
          /408|timeout/i.test(msg)
            ? "Analysis timed out — the AI is still slow sometimes. Please try again."
            : msg
        );
        return;
      }

      onChange({
        aiPromptSuggestions: data.suggestions,
        aiProductContext: data.productContext,
      });
      if (typeof data.credits === "number") {
        onCreditsChange?.(data.credits);
      }
    } catch (err) {
      setPromptError(
        err instanceof FetchTimeoutError
          ? "Analysis timed out after 3 minutes — please try again."
          : "Failed to generate prompts"
      );
    } finally {
      setGeneratingPrompts(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-sm text-brand-800">
        {agency ? (
          <>
            Upload a hero image or start from prompts. VonWillingh posts use{" "}
            <strong>Nano Banana 2</strong> with your logo as a reference — branding can
            appear on merchandise, apparel, packaging, or props in the scene.
            Coloured South African professionals are the default cast.
          </>
        ) : fashion ? (
          <>
            Upload a photo of the clothing piece — flat lay, mannequin, or detail shot.
            <strong> Nano Banana 2</strong> places the exact garment on a model in your
            chosen scene, with the Pomegranate logo as a subtle reference on tags or props.
            Add captions and logo overlays on the Text step.
          </>
        ) : (
          <>
            Upload your product photo only — we&apos;ll build a neutral home scene around your
            pack. No logos, signs, or pharmacy names are drawn into the image (add those as
            text overlays later). People are mostly Coloured South African, sometimes Black
            South African.
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {agency ? "Service or offer name" : fashion ? "Garment or piece name" : "Product name"}
          </label>
          <input
            type="text"
            className="input-field"
            placeholder={
              agency
                ? "e.g. Starter Website Package"
                : fashion
                  ? "e.g. Pattern Bomber Jacket"
                  : "e.g. Centrex Sleep Support"
            }
            value={settings.productName || ""}
            onChange={(e) => onChange({ productName: e.target.value })}
          />
          {agency && (
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium text-gray-500">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {getAgencyServiceNameSuggestions().map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange({ productName: suggestion })}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {fashion && (
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium text-gray-500">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {getFashionProductNameSuggestions().map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange({ productName: suggestion })}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {pharmacy && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => void handleGenerateProductPrompts()}
                disabled={!canGeneratePrompts || generatingPrompts}
                className="btn-primary w-full text-sm"
              >
                {generatingPrompts
                  ? "Analyzing product… (can take up to 60s)"
                  : aiReady
                    ? `Regenerate prompts (${PRODUCT_PROMPT_CREDIT_COST} credit)`
                    : `Generate prompts (${PRODUCT_PROMPT_CREDIT_COST} credit)`}
              </button>
              {!settings.productName?.trim() && (
                <p className="text-xs text-gray-500">
                  Enter the product name from your packaging first.
                </p>
              )}
              {settings.productName?.trim() && credits < PRODUCT_PROMPT_CREDIT_COST && (
                <p className="text-xs text-red-600">
                  You need {PRODUCT_PROMPT_CREDIT_COST} credit but only have {credits}.
                </p>
              )}
              {promptError && (
                <p className="text-xs text-red-600">{promptError}</p>
              )}
              {aiStale && (
                <p className="text-xs text-amber-700">
                  Product name changed — regenerate prompts for updated suggestions.
                </p>
              )}
              {aiReady && settings.aiProductContext && (
                <p className="text-xs text-brand-800">
                  Detected:{" "}
                  <strong>
                    {settings.aiProductContext.category ||
                      settings.aiProductContext.identifiedName}
                  </strong>
                  {settings.aiProductContext.targetAudience
                    ? ` — ${settings.aiProductContext.targetAudience}`
                    : ""}
                </p>
              )}
              {showPromptSuggestions && !aiReady && !aiStale && !generatingPrompts && (
                <p className="text-xs text-gray-500">
                  Click Generate prompts to read your pack photo and get tailored
                  suggestions. Static chips appear as fallback until then.
                </p>
              )}
            </div>
          )}
          {!pharmacy && (
            <p className="mt-1 text-xs text-gray-500">
              {showPromptSuggestions
                ? "Used in narration and text suggestions."
                : "Enter the name from your packaging first — then tailored suggestions appear below."}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Business / brand name</label>
          <input
            type="text"
            className="input-field"
            placeholder={agency ? "VonWillingh Online" : fashion ? "Pomegranate" : "e.g. E-KEM PHARMACY"}
            value={settings.pharmacyName || ""}
            onChange={(e) => onChange({ pharmacyName: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            {agency
              ? "Agency prompts and layout apply when the name includes VonWillingh."
              : fashion
                ? "Fashion prompts and Pomegranate layout apply when the name includes Pomegranate."
                : "Shown in on-screen text and narration."}
          </p>
        </div>
      </div>

      <PromptField
        field="scenePrompt"
        value={settings.scenePrompt || ""}
        onChange={(scenePrompt) => onChange({ scenePrompt })}
        brandName={brandName}
        rows={3}
        showSuggestions={showPromptSuggestions}
        suggestions={fieldSuggestions("scenePrompt")}
      />

      {agency && postFormat === "talking-head" && !captionOpen ? (
        <button
          type="button"
          onClick={() => setCaptionOpen(true)}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-sm text-gray-600 hover:border-brand-300 hover:bg-brand-50/50"
        >
          + On-screen caption (optional)
        </button>
      ) : (
        <>
          <PromptField
            field="benefitsPrompt"
            value={settings.benefitsPrompt || ""}
            onChange={(benefitsPrompt) => onChange({ benefitsPrompt })}
            brandName={brandName}
            rows={3}
            showSuggestions={showPromptSuggestions}
            suggestions={fieldSuggestions("benefitsPrompt")}
          />
          {agency && (
            <p className="-mt-2 text-xs text-amber-800">
              On-screen caption is for movable text on the Export step only — it is
              never burned into the generated photo and is not spoken automatically.
            </p>
          )}
          {agency && postFormat === "talking-head" && (
            <button
              type="button"
              onClick={() => setCaptionOpen(false)}
              className="-mt-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Hide caption field
            </button>
          )}
        </>
      )}
      {fashion && (
        <p className="-mt-2 text-xs text-amber-800">
          Key message is for narration and text overlays only — not drawn into the model
          photo. The Pomegranate logo is added on the Text step or via logo reference on
          tags.
        </p>
      )}

      <PromptField
        field="subjectPrompt"
        value={settings.subjectPrompt || ""}
        onChange={(subjectPrompt) => onChange({ subjectPrompt })}
        brandName={brandName}
        rows={2}
        showSuggestions={showPromptSuggestions}
        suggestions={fieldSuggestions("subjectPrompt")}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Aspect Ratio</label>
        <select
          className="input-field"
          value={settings.aspectRatio}
          onChange={(e) => onChange({ aspectRatio: e.target.value })}
        >
          {["9:16", "16:9", "1:1", "4:3", "3:4"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {agency
            ? "TikTok/Reels: 9:16. Facebook feed: 1:1. Use a separate project per format."
            : "Used for video and export. Ad image generation keeps your product photo framing so the packaging stays accurate."}
        </p>
      </div>

      <VisualStylePicker
        workflow={workflow}
        imageStyle={settings.imageStyle}
        visualStyleId={settings.visualStyleId}
        onChange={(update) => onChange(update)}
      />

      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Image Model</h4>
        <ModelPicker
          kind="image"
          aspectRatio={settings.aspectRatio}
          selectedModelId={
            settings.selectedImageModelId ||
            (fashion || agency ? "nano-banana-2" : "nano-banana")
          }
          onSelect={(id) => onChange({ selectedImageModelId: id })}
        />
      </div>
    </div>
  );
}
