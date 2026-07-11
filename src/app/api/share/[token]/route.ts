import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-utils";
import { parseSettings } from "@/lib/types";
import { resolveCtaQrUrl } from "@/lib/qrOverlay";
import { toAbsoluteMediaUrl } from "@/lib/appUrl";
import { shouldHideAvatarSubtitles } from "@/lib/avatarSubtitles";

function findProjectByShareToken(token: string) {
  return prisma.project.findMany({
    select: { id: true, name: true, settings: true },
  }).then((projects) =>
    projects.find((p) => {
      try {
        const parsed = JSON.parse(p.settings) as { shareToken?: string };
        return parsed.shareToken === token;
      } catch {
        return false;
      }
    })
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token?.trim();
  if (!token) return jsonError("Invalid share link", 400);

  const row = await findProjectByShareToken(token);
  if (!row) return jsonError("Share link not found", 404);

  const settings = parseSettings(row.settings, row.name);
  const relativeVideoUrl =
    settings.shareExportUrl?.trim() ||
    settings.generatedVideoUrl?.trim() ||
    "";

  if (!relativeVideoUrl) {
    return jsonError("No video available for this share link yet", 404);
  }

  const videoUrl = toAbsoluteMediaUrl(relativeVideoUrl);
  const hideAvatarSubtitles = shouldHideAvatarSubtitles(settings);

  const linkedCtas = settings.textLayers
    .filter((layer) => layer.linkUrl?.trim() && layer.layerType !== "image")
    .map((layer) => ({
      id: layer.id,
      label: layer.text || "Open link",
      x: layer.x,
      y: layer.y,
      linkUrl: resolveCtaQrUrl(layer) || layer.linkUrl!.trim(),
      linkType: layer.linkType || "custom",
      configured: true,
    }));

  const ctas =
    linkedCtas.length > 0
      ? linkedCtas
      : settings.textLayers
          .filter(
            (layer) =>
              layer.layerType !== "image" &&
              layer.text?.trim() &&
              layer.y >= 0.75
          )
          .map((layer) => ({
            id: layer.id,
            label: layer.text || "Call to action",
            x: layer.x,
            y: layer.y,
            linkUrl: null as string | null,
            linkType: layer.linkType || "custom",
            configured: false,
          }));

  return jsonOk({
    projectName: row.name,
    videoUrl,
    aspectRatio: settings.aspectRatio,
    pharmacyName: settings.pharmacyName,
    videoHasEmbeddedAudio: Boolean(settings.videoHasEmbeddedAudio),
    hideAvatarSubtitles,
    imageFit: settings.imageFit || "contain",
    ctas,
  });
}
