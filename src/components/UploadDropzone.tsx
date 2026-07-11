"use client";

import { useCallback, useState } from "react";

interface UploadDropzoneProps {
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  currentImage?: string;
  loading?: boolean;
}

export function UploadDropzone({
  onUpload,
  onRemove,
  currentImage,
  loading,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) await onUpload(file);
    },
    [onUpload]
  );

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUpload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        dragOver
          ? "border-brand-500 bg-brand-50"
          : "border-gray-300 bg-gray-50 hover:border-brand-400"
      }`}
    >
      {currentImage ? (
        <div className="pointer-events-none relative text-center">
          <img
            src={currentImage}
            alt="Uploaded product"
            className="mx-auto max-h-48 rounded-lg object-contain shadow-md"
          />
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={loading}
              className="pointer-events-auto absolute right-0 top-0 z-10 rounded-full bg-white p-1.5 text-gray-500 shadow-md ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Remove photo"
              aria-label="Remove photo"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <p className="mt-4 text-sm text-gray-600">
            {onRemove
              ? "Drop another to replace, or remove to start over."
              : "Image uploaded. Drop another to replace."}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">
            Upload Product Photo
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Product photo only — we&apos;ll place your exact product in an AI scene
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Drag & drop or click to browse (JPEG, PNG, WebP)
          </p>
        </div>
      )}

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="absolute inset-0 z-0 cursor-pointer opacity-0"
        disabled={loading}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
          <div className="text-sm font-medium text-brand-600">Uploading...</div>
        </div>
      )}
    </div>
  );
}
