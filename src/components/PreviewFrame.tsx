"use client";

import type { ReactNode } from "react";

interface PreviewFrameProps {
  displayWidth: number;
  displayHeight: number;
  children: ReactNode;
  overlay?: ReactNode;
}

/** Fixed-size preview box so canvas/video are not CSS-stretched (which breaks Fit vs Fill). */
export function PreviewFrame({
  displayWidth,
  displayHeight,
  children,
  overlay,
}: PreviewFrameProps) {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xl border border-gray-200 bg-black shadow-lg"
      style={{ width: displayWidth, height: displayHeight }}
    >
      {children}
      {overlay}
    </div>
  );
}
