"use client";

import type { PromptFieldKey } from "@/lib/promptSuggestions";
import {
  getPromptFieldMeta,
  getPromptSuggestions,
} from "@/lib/promptSuggestions";

interface PromptFieldProps {
  field: PromptFieldKey;
  value: string;
  onChange: (value: string) => void;
  /** Override label from getPromptFieldMeta. */
  label?: string;
  /** Override hint from getPromptFieldMeta. */
  hint?: string;
  rows?: number;
  placeholder?: string;
  /** Brand name — VonWillingh gets agency prompt suggestions. */
  brandName?: string;
  /** When set, replaces static suggestions (e.g. product-aware narration). */
  suggestions?: string[];
}

export function PromptField({
  field,
  value,
  onChange,
  rows = 3,
  placeholder,
  brandName,
  suggestions: suggestionsOverride,
  label: labelOverride,
  hint: hintOverride,
}: PromptFieldProps) {
  const meta = getPromptFieldMeta(field, brandName);
  const label = labelOverride ?? meta.label;
  const hint = hintOverride ?? meta.hint;
  const suggestions =
    suggestionsOverride ?? getPromptSuggestions(field, brandName);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {hint && <p className="mb-2 text-xs text-gray-500">{hint}</p>}
      <textarea
        className="input-field"
        style={{ minHeight: rows * 28 }}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-2">
        <p className="mb-1.5 text-xs font-medium text-gray-500">Suggestions</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.slice(0, 40)}
              type="button"
              onClick={() => onChange(suggestion)}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-left text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              title={suggestion}
            >
              {suggestion.length > 52 ? `${suggestion.slice(0, 52)}…` : suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
