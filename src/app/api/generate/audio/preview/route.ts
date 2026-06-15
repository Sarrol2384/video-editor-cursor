import { NextRequest } from "next/server";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { isFalConfigured, runXaiTts } from "@/lib/falClient";
import { mapVoiceToXai } from "@/lib/voiceMapping";

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    try {
      const body = await req.json();
      const { script, voiceId } = body;

      if (!script?.trim()) {
        return jsonError("Narration script is required");
      }

      if (!isFalConfigured()) {
        return jsonError(
          "AI voice preview requires FAL_KEY. Add your key to .env and restart the server.",
          503
        );
      }

      const voice = mapVoiceToXai(voiceId);
      const narrationUrl = await runXaiTts({
        text: script.trim(),
        voice,
      });

      return jsonOk({ narrationUrl, voice });
    } catch (err) {
      console.error("Audio preview failed:", err);
      const message =
        err instanceof Error ? err.message : "Audio preview failed";
      const status =
        message.toLowerCase().includes("balance") ||
        message.toLowerCase().includes("forbidden")
          ? 403
          : 500;
      return jsonError(message, status);
    }
  });
}
