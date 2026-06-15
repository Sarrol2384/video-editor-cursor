"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShareVideoPlayer } from "@/components/ShareVideoPlayer";

interface ShareCta {
  id: string;
  label: string;
  x: number;
  y: number;
  linkUrl: string | null;
  linkType: string;
  configured?: boolean;
}

interface SharePayload {
  projectName: string;
  videoUrl: string;
  aspectRatio: string;
  pharmacyName?: string;
  videoHasEmbeddedAudio: boolean;
  hideAvatarSubtitles: boolean;
  imageFit: "contain" | "cover";
  ctas: ShareCta[];
}

function ctaButtonLabel(cta: ShareCta): string {
  if (cta.linkType === "whatsapp") return "Chat on WhatsApp";
  if (cta.linkType === "phone") return "Call us";
  if (cta.linkType === "website") return cta.label || "Visit website";
  return cta.label || "Open link";
}

export default function SharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/share/${token}`)
      .then(async (res) => {
        const body = (await res.json()) as SharePayload & { error?: string };
        if (!res.ok) throw new Error(body.error || "Failed to load");
        setData(body);
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Link unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  const isPortrait = data.aspectRatio === "9:16" || data.aspectRatio === "3:4";
  const linkedCtas = data.ctas.filter((cta) => cta.configured !== false && cta.linkUrl);
  const unconfiguredCtas = data.ctas.filter((cta) => cta.configured === false);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-gray-950 px-4 py-8 text-white">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {data.pharmacyName || "Video share"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{data.projectName}</h1>
      </header>

      <ShareVideoPlayer
        videoUrl={data.videoUrl}
        aspectRatio={data.aspectRatio}
        videoHasEmbeddedAudio={data.videoHasEmbeddedAudio}
        hideAvatarSubtitles={data.hideAvatarSubtitles}
        imageFit={data.imageFit}
        isPortrait={isPortrait}
      />

      {linkedCtas.length > 0 && (
        <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-3">
          {linkedCtas.map((cta) => (
            <a
              key={cta.id}
              href={cta.linkUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold hover:bg-teal-500"
            >
              {ctaButtonLabel(cta)}
            </a>
          ))}
        </div>
      )}

      {unconfiguredCtas.length > 0 && linkedCtas.length === 0 && (
        <div className="relative z-10 mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          <p className="font-medium">Call-to-action not linked yet</p>
          <p className="mt-1 text-xs text-amber-200/90">
            The creator needs to add a WhatsApp or website link on the CTA text
            layer in the studio (Text step → Call-to-action link).
          </p>
          <p className="mt-2 text-xs text-gray-400">
            On-screen text: &ldquo;{unconfiguredCtas[0]?.label}&rdquo;
          </p>
        </div>
      )}

      {linkedCtas.length > 0 && (
        <p className="relative z-10 mt-8 text-center text-xs text-gray-500">
          Tap a button to open WhatsApp, phone, or website in your browser.
        </p>
      )}
    </main>
  );
}
