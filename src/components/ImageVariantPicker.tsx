"use client";

import { getAspectCssRatio } from "@/lib/aspectRatio";

interface Variant {
  id: string;
  style: string;
  label: string;
  filter: string;
  background: string;
  storageUrl?: string;
}

interface ImageVariantPickerProps {
  sourceImage: string;
  variants: Variant[];
  selectedId?: string;
  aspectRatio?: string;
  imageFit?: "contain" | "cover";
  onSelect: (variant: Variant) => void;
}

export function ImageVariantPicker({
  sourceImage,
  variants,
  selectedId,
  aspectRatio = "1:1",
  imageFit = "contain",
  onSelect,
}: ImageVariantPickerProps) {
  const objectFit = imageFit === "cover" ? "object-cover" : "object-contain";
  return (
    <div
      className={
        variants.length === 1
          ? "mx-auto max-w-xs"
          : "grid grid-cols-2 gap-4 sm:grid-cols-4"
      }
    >
      {variants.map((v) => {
        const previewUrl = v.storageUrl || sourceImage;
        const isGenerated = Boolean(v.storageUrl);

        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v)}
            className={`overflow-hidden rounded-lg border-2 transition-all ${
              selectedId === v.id
                ? "border-brand-500 ring-2 ring-brand-200"
                : "border-gray-200 hover:border-brand-300"
            }`}
          >
            <div
              className="relative bg-gray-100"
              style={{
                aspectRatio: getAspectCssRatio(aspectRatio),
                ...(!isGenerated ? { background: v.background } : {}),
              }}
            >
              <img
                src={previewUrl}
                alt={v.label}
                className={`h-full w-full ${objectFit} bg-black`}
                style={!isGenerated && v.filter ? { filter: v.filter } : undefined}
              />
              {isGenerated && (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  AI
                </span>
              )}
            </div>
            {v.label && variants.length > 1 && (
              <div className="bg-white px-2 py-1.5 text-center text-xs font-medium text-gray-700">
                {v.label}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
