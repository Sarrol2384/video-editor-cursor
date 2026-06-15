"use client";

import { useEffect, useState } from "react";

interface Model {
  id: string;
  name: string;
  provider: string;
  creditsPerSecond: number;
  baseCredits: number;
  etaSeconds: number;
  costTier: string;
  bestUseCase: string;
  maxDuration: number;
}

interface Routing {
  recommended: Model;
  alternatives: Model[];
  estimatedCredits: number;
  etaSeconds: number;
  rationale: string;
}

interface ModelPickerProps {
  kind?: string;
  aspectRatio?: string;
  duration?: number;
  resolution?: string;
  priority?: string;
  selectedModelId?: string;
  videoMode?: "motion" | "avatar";
  onSelect: (modelId: string) => void;
}

export function ModelPicker({
  kind = "video",
  aspectRatio,
  duration = 8,
  resolution,
  priority = "balanced",
  selectedModelId,
  videoMode,
  onSelect,
}: ModelPickerProps) {
  const [routing, setRouting] = useState<Routing | null>(null);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({
      kind,
      duration: String(duration),
      priority,
    });
    if (aspectRatio) params.set("aspectRatio", aspectRatio);
    if (resolution) params.set("resolution", resolution);
    if (kind === "video" && videoMode) params.set("videoMode", videoMode);

    fetch(`/api/models?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRouting(data.routing);
        setModels(data.models || []);
        if (!selectedModelId && data.routing?.recommended) {
          onSelect(data.routing.recommended.id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, aspectRatio, duration, resolution, priority, videoMode, selectedModelId]);

  const activeId = selectedModelId || routing?.recommended?.id;

  return (
    <div className="space-y-4">
      {routing && (
        <div className="rounded-lg bg-brand-50 p-3 text-sm">
          <p className="font-medium text-brand-700">
            Recommended: {routing.recommended.name}
          </p>
          <p className="mt-1 text-brand-600">{routing.rationale}</p>
          <p className="mt-1 text-xs text-brand-500">
            ~{routing.estimatedCredits} credits &middot; ETA ~{routing.etaSeconds}s
          </p>
        </div>
      )}

      <div className="space-y-2">
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`w-full rounded-lg border p-3 text-left transition-all ${
              activeId === m.id
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-brand-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{m.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.costTier === "high"
                    ? "bg-red-100 text-red-700"
                    : m.costTier === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {m.costTier}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{m.bestUseCase}</p>
            <p className="mt-1 text-xs text-gray-400">
              {m.baseCredits + m.creditsPerSecond * Math.min(duration, m.maxDuration || duration)} credits
              &middot; ~{m.etaSeconds}s
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
