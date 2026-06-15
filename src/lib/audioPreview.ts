import { MoodMusicPlayer } from "@/lib/moodMusic";

export interface MixedAudioOptions {
  narrationUrl: string;
  musicMood: string;
  narrationVolume: number;
  musicVolume: number;
}

export interface BrowserNarrationOptions {
  script: string;
  voiceId: string;
  musicMood: string;
  narrationVolume: number;
  musicVolume: number;
}

const FEMALE_HINTS = [
  "female",
  "zira",
  "hazel",
  "samantha",
  "karen",
  "aria",
  "jenny",
  "susan",
];
const MALE_HINTS = ["male", "david", "mark", "james", "guy", "ryan", "george"];

const VOICE_STYLES: Record<string, { rate: number; pitch: number }> = {
  "professional-f": { rate: 0.96, pitch: 1.05 },
  "professional-m": { rate: 0.94, pitch: 0.82 },
  "warm-f": { rate: 0.86, pitch: 1.0 },
  "warm-m": { rate: 0.88, pitch: 0.78 },
  "energetic-f": { rate: 1.12, pitch: 1.12 },
  "energetic-m": { rate: 1.1, pitch: 0.9 },
};

function getEnglishVoices(): SpeechSynthesisVoice[] {
  const voices = speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return english.length > 0 ? english : voices;
}

function pickBrowserVoice(voiceId: string): SpeechSynthesisVoice | undefined {
  const voices = getEnglishVoices();
  if (voices.length === 0) return undefined;

  const female = voiceId.endsWith("-f");
  const male = voiceId.endsWith("-m");
  const hints = female ? FEMALE_HINTS : male ? MALE_HINTS : [];

  const genderMatches = voices.filter((v) =>
    hints.some((hint) => v.name.toLowerCase().includes(hint))
  );

  if (genderMatches.length > 0) {
    const toneIndex = ["professional", "warm", "energetic"].indexOf(
      voiceId.split("-")[0]
    );
    const index = Math.max(0, toneIndex) % genderMatches.length;
    return genderMatches[index];
  }

  return voices[0];
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const onChange = () => {
      speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener("voiceschanged", onChange);
    setTimeout(() => {
      speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(speechSynthesis.getVoices());
    }, 300);
  });
}

let activeSession: AudioPreviewSession | null = null;

export class AudioPreviewSession {
  private moodPlayer: MoodMusicPlayer | null = null;
  private narration: HTMLAudioElement | null = null;

  async play(options: MixedAudioOptions): Promise<void> {
    this.stop();

    this.moodPlayer = new MoodMusicPlayer(options.musicMood);
    const musicLevel = (options.musicVolume / 100) * 0.35;
    await this.moodPlayer.start(musicLevel);

    this.narration = new Audio(options.narrationUrl);
    this.narration.volume = Math.max(0, Math.min(1, options.narrationVolume / 100));

    await new Promise<void>((resolve, reject) => {
      if (!this.narration) return reject(new Error("Narration element missing"));

      this.narration.onended = () => {
        this.stop();
        resolve();
      };
      this.narration.onerror = () => {
        this.stop();
        reject(new Error("Failed to play narration audio"));
      };

      void this.narration.play().catch(reject);
    });
  }

  stop(): void {
    if (this.narration) {
      this.narration.pause();
      this.narration.onended = null;
      this.narration.onerror = null;
      this.narration = null;
    }
    this.moodPlayer?.stop();
    this.moodPlayer = null;
  }
}

export function stopActiveAudioPreview(): void {
  activeSession?.stop();
  activeSession = null;
}

export async function playMixedAudioPreview(
  options: MixedAudioOptions
): Promise<void> {
  stopActiveAudioPreview();
  activeSession = new AudioPreviewSession();
  await activeSession.play(options);
  activeSession = null;
}

export async function playBrowserNarrationPreview(
  options: BrowserNarrationOptions
): Promise<void> {
  stopActiveAudioPreview();

  const moodPlayer = new MoodMusicPlayer(options.musicMood);
  const musicLevel = (options.musicVolume / 100) * 0.35;
  await moodPlayer.start(musicLevel);

  await waitForVoices();
  const utterance = new SpeechSynthesisUtterance(options.script);
  const voice = pickBrowserVoice(options.voiceId);
  if (voice) utterance.voice = voice;

  const style = VOICE_STYLES[options.voiceId] || VOICE_STYLES["professional-f"];
  utterance.rate = style.rate;
  utterance.pitch = style.pitch;
  utterance.volume = Math.max(0, Math.min(1, options.narrationVolume / 100));

  await new Promise<void>((resolve) => {
    utterance.onend = () => {
      moodPlayer.stop();
      resolve();
    };
    utterance.onerror = () => {
      moodPlayer.stop();
      resolve();
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}
