type MoodId = "uplifting" | "calm" | "professional" | "energetic";

interface MoodConfig {
  bpm: number;
  chords: number[][];
  wave: OscillatorType;
  filterFreq: number;
  pulseGain: number;
}

const MOOD_CONFIGS: Record<MoodId, MoodConfig> = {
  uplifting: {
    bpm: 120,
    chords: [
      [261.63, 329.63, 392.0],
      [293.66, 369.99, 440.0],
      [329.63, 415.3, 493.88],
      [349.23, 440.0, 523.25],
    ],
    wave: "triangle",
    filterFreq: 2200,
    pulseGain: 0.08,
  },
  calm: {
    bpm: 72,
    chords: [
      [220.0, 261.63, 329.63],
      [196.0, 246.94, 293.66],
      [174.61, 220.0, 261.63],
      [196.0, 233.08, 293.66],
    ],
    wave: "sine",
    filterFreq: 1200,
    pulseGain: 0.05,
  },
  professional: {
    bpm: 96,
    chords: [
      [196.0, 246.94, 293.66],
      [220.0, 261.63, 329.63],
      [174.61, 220.0, 261.63],
      [196.0, 233.08, 293.66],
    ],
    wave: "triangle",
    filterFreq: 1600,
    pulseGain: 0.06,
  },
  energetic: {
    bpm: 132,
    chords: [
      [196.0, 246.94, 293.66],
      [220.0, 277.18, 329.63],
      [246.94, 311.13, 369.99],
      [261.63, 329.63, 392.0],
    ],
    wave: "sawtooth",
    filterFreq: 2800,
    pulseGain: 0.1,
  },
};

export const MOOD_LOOP_SEC = 8;

export function resolveMoodConfig(mood?: string): MoodConfig {
  const id = (mood || "professional") as MoodId;
  return MOOD_CONFIGS[id] || MOOD_CONFIGS.professional;
}

function scheduleMoodOscillators(
  offline: OfflineAudioContext,
  config: MoodConfig,
  durationSec: number,
  volume: number,
  destination: AudioNode
): void {
  const filter = offline.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = config.filterFreq;

  const masterGain = offline.createGain();
  masterGain.gain.value = Math.max(0, Math.min(1, volume));
  filter.connect(masterGain);
  masterGain.connect(destination);

  const beatSec = (60 / config.bpm) * 4;
  let chordIndex = 0;
  for (let t = 0; t < durationSec; t += beatSec) {
    const chord = config.chords[chordIndex % config.chords.length];
    chordIndex += 1;
    const chordEnd = Math.min(t + beatSec, durationSec);

    chord.forEach((freq, index) => {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      osc.type = config.wave;
      osc.frequency.value = freq;
      gain.gain.value = config.pulseGain / (index + 1);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(t);
      osc.stop(chordEnd);
    });
  }
}

/** One chord-progression loop (~8s) for tiled export mixing. */
export async function renderMoodMusicLoop(
  mood: string,
  volume: number,
  sampleRate = 44100
): Promise<AudioBuffer> {
  return renderMoodMusicBuffer(mood, MOOD_LOOP_SEC, volume, sampleRate);
}

/** Render procedural mood bed for a given duration (offline). */
export async function renderMoodMusicBuffer(
  mood: string,
  durationSec: number,
  volume: number,
  sampleRate = 44100
): Promise<AudioBuffer> {
  const config = resolveMoodConfig(mood);
  const length = Math.max(1, Math.ceil(durationSec * sampleRate));
  const offline = new OfflineAudioContext(2, length, sampleRate);

  scheduleMoodOscillators(
    offline,
    config,
    durationSec,
    volume,
    offline.destination
  );

  return offline.startRendering();
}

/**
 * Looped procedural background bed for preview and playback.
 */
export class MoodMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private chordIndex = 0;

  constructor(private mood: string) {}

  async start(volume: number): Promise<void> {
    this.stop();

    this.ctx = new AudioContext();
    await this.ctx.resume();

    const config = resolveMoodConfig(this.mood);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = config.filterFreq;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));

    filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const playChord = () => {
      if (!this.ctx) return;

      this.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      });
      this.oscillators = [];

      const chord = config.chords[this.chordIndex % config.chords.length];
      this.chordIndex += 1;

      chord.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = config.wave;
        osc.frequency.value = freq;
        gain.gain.value = config.pulseGain / (index + 1);
        osc.connect(gain);
        gain.connect(filter);
        osc.start();
        this.oscillators.push(osc);
      });
    };

    playChord();
    const beatMs = (60_000 / config.bpm) * 4;
    this.intervalId = setInterval(playChord, beatMs);
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    });
    this.oscillators = [];

    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }

    this.masterGain = null;
    this.chordIndex = 0;
  }
}
