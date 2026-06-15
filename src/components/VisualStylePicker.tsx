"use client";

import type { ImageStyle } from "@/lib/mockGen";
import type { WorkflowMode } from "@/lib/brands";
import {
  findVisualStyleSuggestion,
  getVisualStyleSuggestions,
  type VisualStyleSuggestion,
} from "@/lib/imageStyleSuggestions";

interface VisualStylePickerProps {
  workflow?: WorkflowMode | boolean;
  /** @deprecated Use workflow instead */
  agency?: boolean;
  imageStyle?: string;
  visualStyleId?: string;
  onChange: (update: {
    imageStyle: ImageStyle;
    visualStyleId: string;
  }) => void;
}

export function VisualStylePicker({
  workflow,
  agency,
  imageStyle,
  visualStyleId,
  onChange,
}: VisualStylePickerProps) {
  const resolvedWorkflow = workflow ?? (agency ? "agency" : "pharmacy");
  const suggestions = getVisualStyleSuggestions(resolvedWorkflow);
  const selected = findVisualStyleSuggestion(visualStyleId, resolvedWorkflow);

  function apply(suggestion: VisualStyleSuggestion) {
    onChange({
      imageStyle: suggestion.imageStyle,
      visualStyleId: suggestion.id,
    });
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Visual style</label>
      <p className="mb-2 text-xs text-gray-500">
        Lighting and mood for the generated photo — no text is added to the image.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((suggestion) => {
          const isSelected = visualStyleId
            ? suggestion.id === visualStyleId
            : !visualStyleId &&
              imageStyle === suggestion.imageStyle &&
              suggestion.id ===
                suggestions.find((x) => x.imageStyle === imageStyle)?.id;

          return (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => apply(suggestion)}
              title={suggestion.hint}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {suggestion.label}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-gray-500">{selected.hint}</p>
      )}
    </div>
  );
}
