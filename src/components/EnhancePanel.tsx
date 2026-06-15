"use client";

import { useState } from "react";
import type { ProjectSettings } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import { isAgencyBrand, isFashionBrand } from "@/lib/brandLayouts";
import { resolveAgencyPostFormat } from "@/lib/agencyPostFormat";
import {
  getAgencyServiceNameSuggestions,
  getFashionProductNameSuggestions,
} from "@/lib/productSuggestions";
import { PromptField } from "@/components/PromptField";
import { ModelPicker } from "@/components/ModelPicker";
import { VisualStylePicker } from "@/components/VisualStylePicker";

interface EnhancePanelProps {
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
}

export function EnhancePanel({ settings, onChange }: EnhancePanelProps) {
  const workflow = inferWorkflowMode(settings);
  const agency = workflow === "agency" || isAgencyBrand(settings.pharmacyName);
  const fashion = workflow === "fashion" || isFashionBrand(settings.pharmacyName);
  const brandName = settings.pharmacyName;
  const postFormat = agency ? resolveAgencyPostFormat(settings) : null;
  const [captionOpen, setCaptionOpen] = useState(postFormat !== "talking-head");

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
          "Upload your product photo only — we'll generate a full advertisement image with a lifestyle scene around your product using Nano Banana."
        )}
      </div>

      <PromptField
        field="scenePrompt"
        value={settings.scenePrompt || ""}
        onChange={(scenePrompt) => onChange({ scenePrompt })}
        brandName={brandName}
        rows={3}
      />

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
          <p className="mt-1 text-xs text-gray-500">
            Used in narration and text suggestions.
          </p>
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
