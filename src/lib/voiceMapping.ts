/** xAI TTS voices exposed on fal.ai */
export type XaiVoice = "eve" | "ara" | "rex" | "sal" | "leo";

const VOICE_MAP: Record<string, XaiVoice> = {
  "professional-f": "ara",
  "professional-m": "rex",
  "warm-f": "ara",
  "warm-m": "rex",
  "energetic-f": "eve",
  "energetic-m": "leo",
};

export function mapVoiceToXai(voiceId?: string): XaiVoice {
  if (!voiceId) return "ara";
  return VOICE_MAP[voiceId] || "ara";
}

export function getVoiceLabel(voiceId?: string): string {
  const labels: Record<string, string> = {
    "professional-f": "Professional (Female)",
    "professional-m": "Professional (Male)",
    "warm-f": "Warm (Female)",
    "warm-m": "Warm (Male)",
    "energetic-f": "Energetic (Female)",
    "energetic-m": "Energetic (Male)",
  };
  return labels[voiceId || "professional-f"] || "Professional (Female)";
}

export function isGeneratedNarrationStale(settings: {
  generatedNarrationUrl?: string;
  voiceId?: string;
  generatedNarrationVoiceId?: string;
}): boolean {
  if (!settings.generatedNarrationUrl) return false;
  const current = settings.voiceId || "professional-f";
  const generated = settings.generatedNarrationVoiceId;
  return Boolean(generated && generated !== current);
}

export function isGeneratedNarrationVoiceUnknown(settings: {
  generatedNarrationUrl?: string;
  generatedNarrationVoiceId?: string;
}): boolean {
  return Boolean(
    settings.generatedNarrationUrl && !settings.generatedNarrationVoiceId
  );
}
