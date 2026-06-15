"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ProjectSettings, TextLayer } from "@/lib/types";
import { createTextLayer } from "@/lib/types";
import { inferWorkflowMode } from "@/lib/brands";
import { buildBrandLayout, isAgencyBrand, VONWILLINGH_LOGO_URL } from "@/lib/brandLayouts";
import { CanvasPreview } from "@/components/CanvasPreview";
import { AvatarSubtitleToggle } from "@/components/AvatarSubtitleToggle";
import { shouldHideAvatarSubtitles } from "@/lib/avatarSubtitles";
import { VideoPreview } from "@/components/VideoPreview";
import { getPreviewLayout } from "@/lib/canvas-utils";
import {
  overlayAlignTransform,
  resolveTextFontFamily,
  scaleTextSize,
  TEXT_FONT_OPTIONS,
  type TextFontId,
} from "@/lib/textFonts";
import { buildTextSuggestions } from "@/lib/productSuggestions";
import { cssTextEffectStyle, resolveBackgroundFill } from "@/lib/textEffects";
import type { TextEffect } from "@/lib/types";

function overlayFontSize(layer: TextLayer, settings: ProjectSettings): number {
  const { height, displayHeight } = getPreviewLayout(
    settings.aspectRatio,
    settings.resolution,
    { compact: true }
  );
  return scaleTextSize(layer.fontSize, height) * (displayHeight / height);
}

interface TextLayerEditorProps {
  imageUrl: string;
  settings: ProjectSettings;
  onChange: (updates: Partial<ProjectSettings>) => void;
  videoUrl?: string;
}

export function TextLayerEditor({
  imageUrl,
  settings,
  onChange,
  videoUrl,
}: TextLayerEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    settings.textLayers[0]?.id ?? null
  );
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const layers = settings.textLayers;
  const selected = layers.find((l) => l.id === selectedId) ?? layers[0] ?? null;

  const textSuggestions = useMemo(() => {
    const layer = layers.find((l) => l.id === selectedId) ?? layers[0];
    return layer ? buildTextSuggestions(settings, layer) : [];
  }, [
    layers,
    selectedId,
    settings.benefitsPrompt,
    settings.scenePrompt,
    settings.subjectPrompt,
    settings.productName,
    settings.pharmacyName,
    settings.workflowMode,
    settings.brandId,
    settings.narrationScript,
  ]);

  const updateLayers = useCallback(
    (newLayers: TextLayer[]) => {
      onChange({ textLayers: newLayers });
    },
    [onChange]
  );

  const updateLayer = useCallback(
    (id: string, updates: Partial<TextLayer>) => {
      updateLayers(
        layers.map((l) => (l.id === id ? { ...l, ...updates } : l))
      );
    },
    [layers, updateLayers]
  );

  function handlePointerDown(e: React.PointerEvent, layer: TextLayer) {
    e.preventDefault();
    setSelectedId(layer.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({
      id: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragging.startX) / rect.width;
    const dy = (e.clientY - dragging.startY) / rect.height;
    updateLayer(dragging.id, {
      x: Math.max(0.02, Math.min(0.98, dragging.origX + dx)),
      y: Math.max(0.02, Math.min(0.98, dragging.origY + dy)),
    });
  }

  function handlePointerUp() {
    setDragging(null);
  }

  function addLayer() {
    const layer = createTextLayer();
    updateLayers([...layers, layer]);
    setSelectedId(layer.id);
  }

  function duplicateLayer() {
    if (!selected) return;
    const copy = createTextLayer({
      ...selected,
      id: crypto.randomUUID(),
      x: selected.x + 0.03,
      y: selected.y + 0.03,
      text: `${selected.text} (copy)`,
    });
    updateLayers([...layers, copy]);
    setSelectedId(copy.id);
  }

  function deleteLayer() {
    if (!selected) return;
    const next = layers.filter((l) => l.id !== selected.id);
    updateLayers(next);
    setSelectedId(next[0]?.id ?? null);
  }

  function addDefaultLayers() {
    const seeded = buildBrandLayout(settings.pharmacyName);
    updateLayers(seeded);
    setSelectedId(seeded[0]?.id ?? null);
  }

  const agency =
    isAgencyBrand(settings.pharmacyName) ||
    inferWorkflowMode(settings) === "agency";

  const overlay = (
    <div
      ref={overlayRef}
      className="absolute inset-0 touch-pan-y"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {layers.map((layer) => {
        const isSelected = selectedId === layer.id;
        const boxClass = `absolute cursor-move touch-none rounded border-2 transition-colors ${
          isSelected
            ? "border-brand-500 bg-brand-500/10"
            : "border-transparent hover:border-brand-300 hover:bg-white/10"
        }`;

        if (layer.layerType === "image" && layer.imageUrl) {
          const widthPct = (layer.imageWidth || 0.25) * 100;
          return (
            <div
              key={layer.id}
              className={`${boxClass} p-1`}
              style={{
                left: `${layer.x * 100}%`,
                top: `${layer.y * 100}%`,
                transform: overlayAlignTransform(layer.align),
                width: `${widthPct}%`,
              }}
              onPointerDown={(e) => handlePointerDown(e, layer)}
              onClick={() => setSelectedId(layer.id)}
            >
              <img
                src={layer.imageUrl}
                alt="Logo"
                className="pointer-events-none h-auto w-full"
                draggable={false}
              />
            </div>
          );
        }

        const maxWidthPct = (layer.maxWidth ?? 0.42) * 100;
        return (
          <div
            key={layer.id}
            className={`${boxClass} px-2 py-1`}
            style={{
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              transform: overlayAlignTransform(layer.align),
              textAlign: layer.align,
              color: layer.color,
              fontWeight: layer.fontWeight,
              fontFamily: resolveTextFontFamily(layer.fontFamily),
              fontSize: overlayFontSize(layer, settings),
              lineHeight: 1.25,
              whiteSpace: "normal",
              wordBreak: "break-word",
              width: `${maxWidthPct}%`,
              boxSizing: "border-box",
              ...(layer.background
                ? {
                    backgroundColor: resolveBackgroundFill(
                      layer.backgroundColor,
                      layer.backgroundOpacity
                    ),
                    borderRadius: 4,
                  }
                : {}),
              ...cssTextEffectStyle(layer.textEffect, layer.color, layer.glowColor),
            }}
            onPointerDown={(e) => handlePointerDown(e, layer)}
            onClick={() => setSelectedId(layer.id)}
          >
            {layer.text || "(empty)"}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {settings.videoHasEmbeddedAudio && settings.generatedVideoUrl && (
        <AvatarSubtitleToggle settings={settings} onChange={onChange} compact />
      )}
      <div className="grid gap-4 min-[560px]:grid-cols-2 min-[560px]:items-start">
        <div className="sticky top-16 z-10 shrink-0 bg-white py-1 min-[560px]:top-20">
          {videoUrl ? (
            <VideoPreview
              videoUrl={videoUrl}
              settings={settings}
              overlay={layers.length > 0 ? overlay : undefined}
              compact
            />
          ) : (
            <CanvasPreview
              imageUrl={imageUrl}
              settings={settings}
              playing={false}
              showPlayToggle={!settings.freezeProduct}
              skipTextLayers={layers.length > 0}
              overlay={layers.length > 0 ? overlay : undefined}
              compact
            />
          )}
          <p className="mt-2 text-xs text-gray-500">
            Frame: {settings.aspectRatio} ·{" "}
            {settings.imageFit === "cover" ? "Fill (cropped)" : "Fit (full image)"}.
            {" "}Drag text layers on the preview to reposition them.
            {videoUrl &&
              settings.videoHasEmbeddedAudio &&
              (shouldHideAvatarSubtitles(settings)
                ? " Subtitle band trimmed — uncheck Hide AI subtitle band for full frame."
                : " Full frame — tick Hide AI subtitle band if you see garbled text at the bottom.")}
            {!videoUrl && settings.freezeProduct
              ? " Still image — generate video to preview motion."
              : ""}
          </p>
        </div>

        <div className="min-h-0 space-y-4 max-h-[calc(100vh-22rem)] overflow-y-auto overscroll-y-contain pr-1 min-[560px]:max-h-[calc(100vh-7.5rem)]">
          <p className="text-xs text-gray-500 min-[560px]:hidden">
            Scroll this panel for all text options — preview stays pinned above.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addLayer} className="btn-primary text-sm">
              Add text
            </button>
            <button
              type="button"
              onClick={duplicateLayer}
              disabled={!selected}
              className="btn-secondary text-sm"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={deleteLayer}
              disabled={!selected}
              className="btn-secondary text-sm text-red-600"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={addDefaultLayers}
              className="btn-secondary text-sm"
            >
              {agency ? "Add agency layout" : "Add pharmacy layout"}
            </button>
          </div>

          {layers.length === 0 && (
            <div className="rounded-lg border border-dashed border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-800">
              <p className="font-medium">No on-screen text yet</p>
              <p className="mt-1 text-brand-700">
                Click <strong>Add text</strong> for a single line, or{" "}
                <strong>{agency ? "Add agency layout" : "Add pharmacy layout"}</strong>{" "}
                for headline and CTA.
              </p>
            </div>
          )}

          {layers.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-3">
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Select layer
              </label>
              <select
                className="input-field mb-3"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {layers.map((l, i) => (
                  <option key={l.id} value={l.id}>
                    Layer {i + 1}:{" "}
                    {l.layerType === "image"
                      ? agency
                        ? "Brand logo"
                        : "Pharmacy logo"
                      : l.text.slice(0, 30) || "(empty)"}
                  </option>
                ))}
              </select>

              {selected && (
                <div className="space-y-3">
                  {selected.layerType === "image" ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Logo width: {Math.round((selected.imageWidth || 0.25) * 100)}%
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        value={Math.round((selected.imageWidth || 0.25) * 100)}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            imageWidth: parseInt(e.target.value, 10) / 100,
                          })
                        }
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {selected.imageUrl === VONWILLINGH_LOGO_URL
                          ? "VonWillingh logo — drag on the preview to reposition."
                          : "Brand logo — drag on the preview to reposition."}
                      </p>
                      <div className="mt-3">
                        <label className="mb-1 block text-sm font-medium">Align</label>
                        <select
                          className="input-field"
                          value={selected.align}
                          onChange={(e) =>
                            updateLayer(selected.id, {
                              align: e.target.value as TextLayer["align"],
                            })
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Text</label>
                    <textarea
                      className="input-field min-h-[72px]"
                      rows={3}
                      value={selected.text}
                      onChange={(e) =>
                        updateLayer(selected.id, { text: e.target.value })
                      }
                    />
                    {textSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1.5 text-xs font-medium text-gray-500">
                          Suggestions
                          {agency
                            ? " (matched to your service)"
                            : " (matched to your product)"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {textSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() =>
                                updateLayer(selected.id, { text: suggestion })
                              }
                              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Font</label>
                    <select
                      className="input-field"
                      value={selected.fontFamily || "system"}
                      onChange={(e) =>
                        updateLayer(selected.id, {
                          fontFamily: e.target.value as TextFontId,
                        })
                      }
                    >
                      {TEXT_FONT_OPTIONS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Size: {selected.fontSize}px
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={8}
                        max={300}
                        value={Math.min(selected.fontSize, 300)}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            fontSize: parseInt(e.target.value, 10),
                          })
                        }
                        className="min-w-0 flex-1"
                      />
                      <input
                        type="number"
                        min={8}
                        max={999}
                        step={1}
                        value={selected.fontSize}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          if (!Number.isNaN(next)) {
                            updateLayer(selected.id, {
                              fontSize: Math.max(8, Math.min(999, next)),
                            });
                          }
                        }}
                        className="input-field w-20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Drag the slider or type any size up to 999px.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Box width: {Math.round((selected.maxWidth ?? 0.42) * 100)}%
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={15}
                        max={100}
                        value={Math.round((selected.maxWidth ?? 0.42) * 100)}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            maxWidth: parseInt(e.target.value, 10) / 100,
                          })
                        }
                        className="min-w-0 flex-1"
                      />
                      <input
                        type="number"
                        min={15}
                        max={100}
                        value={Math.round((selected.maxWidth ?? 0.42) * 100)}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          if (!Number.isNaN(next)) {
                            updateLayer(selected.id, {
                              maxWidth: Math.max(0.15, Math.min(1, next / 100)),
                            });
                          }
                        }}
                        className="input-field w-20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Sets the text area width. Long text wraps; short headlines
                      use this width for positioning. Use Size for bigger letters.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Text effect</label>
                    <select
                      className="input-field"
                      value={selected.textEffect || "none"}
                      onChange={(e) =>
                        updateLayer(selected.id, {
                          textEffect: e.target.value as TextEffect,
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="glow">Glow</option>
                      <option value="outline">Outline (good on busy scenes)</option>
                      <option value="shadow">Drop shadow</option>
                    </select>
                  </div>

                  {selected.textEffect === "glow" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">Glow colour</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={selected.glowColor || "#ffffff"}
                          onChange={(e) =>
                            updateLayer(selected.id, { glowColor: e.target.value })
                          }
                          className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          className="input-field flex-1"
                          placeholder="#ffffff"
                          value={selected.glowColor || ""}
                          onChange={(e) =>
                            updateLayer(selected.id, { glowColor: e.target.value })
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Pick any glow colour — white on dark text, red brand glow, etc.
                        Leave empty for auto contrast.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium">Color</label>
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) =>
                        updateLayer(selected.id, { color: e.target.value })
                      }
                      className="h-10 w-full cursor-pointer rounded border border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Align</label>
                      <select
                        className="input-field"
                        value={selected.align}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            align: e.target.value as TextLayer["align"],
                          })
                        }
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Weight</label>
                      <select
                        className="input-field"
                        value={selected.fontWeight}
                        onChange={(e) =>
                          updateLayer(selected.id, {
                            fontWeight: e.target.value as TextLayer["fontWeight"],
                          })
                        }
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">Text background</span>
                      <input
                        type="checkbox"
                        checked={selected.background}
                        onChange={(e) =>
                          updateLayer(selected.id, { background: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                    </label>
                    {selected.background && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Background colour
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={selected.backgroundColor || "#000000"}
                              onChange={(e) =>
                                updateLayer(selected.id, {
                                  backgroundColor: e.target.value,
                                })
                              }
                              className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              className="input-field flex-1"
                              value={selected.backgroundColor || "#000000"}
                              onChange={(e) =>
                                updateLayer(selected.id, {
                                  backgroundColor: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Transparency:{" "}
                            {Math.round((selected.backgroundOpacity ?? 0.65) * 100)}%
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((selected.backgroundOpacity ?? 0.65) * 100)}
                            onChange={(e) =>
                              updateLayer(selected.id, {
                                backgroundOpacity:
                                  parseInt(e.target.value, 10) / 100,
                              })
                            }
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            0% = fully transparent, 100% = solid colour.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
