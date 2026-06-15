const FAL_ASPECT_RATIOS = new Set([
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
]);

const APP_ASPECT_RATIOS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4"]);

/** Map app aspect ratio to a value accepted by fal nano-banana edit. */
export function normalizeAspectRatioForFal(ratio?: string): string {
  if (!ratio || ratio === "auto") return "auto";
  if (FAL_ASPECT_RATIOS.has(ratio)) return ratio;
  if (APP_ASPECT_RATIOS.has(ratio)) return ratio;
  return "auto";
}

/** Map app aspect ratio to a value accepted by the aikit Nano Banana API. */
export function normalizeAspectRatioForAikit(ratio?: string): string {
  if (ratio && APP_ASPECT_RATIOS.has(ratio)) return ratio;
  return "1:1";
}

export function getAspectCssRatio(ratio?: string): string {
  const map: Record<string, string> = {
    "1:1": "1 / 1",
    "16:9": "16 / 9",
    "9:16": "9 / 16",
    "4:3": "4 / 3",
    "3:4": "3 / 4",
    "21:9": "21 / 9",
  };
  return map[ratio || "1:1"] || "1 / 1";
}

/** Reinforce target canvas shape in image model prompts. */
export function getAspectFramingHint(ratio?: string): string {
  switch (ratio) {
    case "9:16":
      return "CRITICAL: Vertical portrait composition, 9:16 aspect ratio, tall frame filled edge to edge — designed for TikTok and Reels. Do not output landscape or letterboxed 16:9.";
    case "16:9":
      return "Horizontal landscape composition, 16:9 aspect ratio, widescreen frame filled edge to edge.";
    case "1:1":
      return "Square 1:1 composition, centered framing for social feed posts.";
    case "4:3":
      return "4:3 landscape composition, classic photo proportions.";
    case "3:4":
      return "3:4 portrait composition, vertical but less tall than 9:16.";
    default:
      return "";
  }
}
