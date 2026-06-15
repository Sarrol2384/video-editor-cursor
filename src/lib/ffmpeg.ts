import { spawn } from "child_process";
import { existsSync } from "fs";
import ffmpegStatic from "ffmpeg-static";
import { resolveMoodConfig } from "@/lib/moodMusic";
import { ffmpegAvatarSubtitleCropFilter } from "@/lib/avatarSubtitles";

const BASE_FFMPEG_TIMEOUT_MS = 180_000;
const MUSIC_SOURCE_DURATION_SEC = 65;

export interface AudioMuxOptions {
  narrationPath?: string;
  musicMood?: string;
  narrationVolume?: number;
  musicVolume?: number;
  useEmbeddedVideoAudio?: boolean;
  /** Output length in seconds. */
  targetDurationSec?: number;
  /** Input video clip length (for finite loop count). */
  inputVideoDurationSec?: number;
  /** Trim Kling garbled subtitle band and scale to output frame. */
  cropAvatarSubtitles?: boolean;
  outputWidth?: number;
  outputHeight?: number;
}

function resolveFfmpegExecutable(): string {
  const bundled = typeof ffmpegStatic === "string" ? ffmpegStatic : null;
  if (bundled && existsSync(bundled)) {
    return bundled;
  }
  return "ffmpeg";
}

function ffmpegTimeoutMs(targetDurationSec?: number): number {
  const sec =
    typeof targetDurationSec === "number" && targetDurationSec > 0
      ? targetDurationSec
      : 30;
  return Math.max(BASE_FFMPEG_TIMEOUT_MS, Math.ceil(sec * 20_000));
}

function buildMoodMusicSource(
  mood: string,
  durationSec?: number
): { input: string; lowpass: number } {
  const config = resolveMoodConfig(mood);
  const beat = (60 / config.bpm) * 4;
  const total = beat * config.chords.length;

  const parts = config.chords.map((chord, i) => {
    const start = (i * beat).toFixed(3);
    const end = ((i + 1) * beat).toFixed(3);
    const tones = chord
      .map((freq, idx) => `${(0.12 / (idx + 1)).toFixed(3)}*sin(2*PI*${freq}*t)`)
      .join("+");
    return `between(mod(t\\,${total.toFixed(3)})\\,${start}\\,${end})*(${tones})`;
  });

  const sum = parts.join("+");
  const expr = `(${sum})*0.6*(1+0.2*sin(2*PI*0.15*t))`;
  const bedSec =
    typeof durationSec === "number" && durationSec > 0
      ? Math.min(MUSIC_SOURCE_DURATION_SEC, Math.ceil(durationSec) + 1)
      : MUSIC_SOURCE_DURATION_SEC;
  const input = `aevalsrc=exprs=${expr}:duration=${bedSec}:sample_rate=44100`;
  return { input, lowpass: config.filterFreq };
}

function clampVolume(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(2, value));
}

/** Finite video loops only — never -stream_loop -1 (causes multi-minute encodes). */
function videoInput(
  inputPath: string,
  targetDurationSec?: number,
  inputVideoDurationSec?: number
): string[] {
  if (
    !targetDurationSec ||
    !inputVideoDurationSec ||
    inputVideoDurationSec <= 0 ||
    targetDurationSec <= inputVideoDurationSec + 0.15
  ) {
    return ["-i", inputPath];
  }

  const loops = Math.ceil(targetDurationSec / inputVideoDurationSec) - 1;
  if (loops <= 0) return ["-i", inputPath];
  return ["-stream_loop", String(Math.min(loops, 30)), "-i", inputPath];
}

function videoFilterArgs(audio?: AudioMuxOptions): string[] {
  if (
    !audio?.cropAvatarSubtitles ||
    !audio.outputWidth ||
    !audio.outputHeight
  ) {
    return [];
  }
  return [
    "-vf",
    ffmpegAvatarSubtitleCropFilter(audio.outputWidth, audio.outputHeight),
  ];
}

function tailArgs(
  baseVideo: string[],
  baseAudio: string[],
  tail: string[],
  outputPath: string,
  targetDurationSec?: number
): string[] {
  const args = [...baseVideo, ...baseAudio, ...tail];
  if (
    typeof targetDurationSec === "number" &&
    Number.isFinite(targetDurationSec) &&
    targetDurationSec > 0
  ) {
    args.push("-t", String(targetDurationSec));
  }
  args.push(outputPath);
  return args;
}

function buildFfmpegArgs(
  inputPath: string,
  outputPath: string,
  audio?: AudioMuxOptions
): string[] {
  const baseVideo = ["-c:v", "libx264", "-preset", "fast", "-crf", "20"];
  const baseAudio = ["-c:a", "aac", "-b:a", "192k"];
  const tail = ["-movflags", "+faststart"];
  const targetDurationSec = audio?.targetDurationSec;
  const inputVideoDurationSec = audio?.inputVideoDurationSec;

  const narrationPath = audio?.useEmbeddedVideoAudio
    ? undefined
    : audio?.narrationPath;
  const useEmbedded = Boolean(audio?.useEmbeddedVideoAudio);
  const wantsMusic =
    Boolean(audio?.musicMood) && clampVolume(audio?.musicVolume, 0) > 0;
  const narrVol = clampVolume(audio?.narrationVolume, 1);
  const musicVol = clampVolume(audio?.musicVolume, 0);

  const vIn = videoInput(inputPath, targetDurationSec, inputVideoDurationSec);

  if (useEmbedded && wantsMusic && !narrationPath) {
    const { input: musicInput, lowpass } = buildMoodMusicSource(
      audio!.musicMood as string,
      targetDurationSec
    );
    const vf = videoFilterArgs(audio);
    return [
      "-y",
      "-i",
      inputPath,
      ...vf,
      "-f",
      "lavfi",
      "-i",
      musicInput,
      "-filter_complex",
      `[0:a]aformat=sample_fmts=fltp:channel_layouts=stereo[voice];` +
        `[1:a]volume=${musicVol},lowpass=f=${lowpass},aformat=sample_fmts=fltp:channel_layouts=stereo[m];` +
        `[voice][m]amix=inputs=2:duration=first:dropout_transition=0,volume=1.2[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
    ];
  }

  if (useEmbedded) {
    return [
      "-y",
      "-i",
      inputPath,
      ...videoFilterArgs(audio),
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
    ];
  }

  if (narrationPath && wantsMusic) {
    const { input: musicInput, lowpass } = buildMoodMusicSource(
      audio!.musicMood as string,
      targetDurationSec
    );
    return [
      "-y",
      ...vIn,
      "-i",
      narrationPath,
      "-f",
      "lavfi",
      "-i",
      musicInput,
      "-filter_complex",
      `[1:a]volume=${narrVol},aformat=sample_fmts=fltp:channel_layouts=stereo[n];` +
        `[2:a]volume=${musicVol},lowpass=f=${lowpass},aformat=sample_fmts=fltp:channel_layouts=stereo[m];` +
        `[n][m]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
    ];
  }

  if (!narrationPath && wantsMusic) {
    const { input: musicInput, lowpass } = buildMoodMusicSource(
      audio!.musicMood as string,
      targetDurationSec
    );
    return [
      "-y",
      ...vIn,
      "-f",
      "lavfi",
      "-i",
      musicInput,
      "-filter_complex",
      `[1:a]volume=${musicVol},lowpass=f=${lowpass},aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
    ];
  }

  if (narrationPath) {
    return [
      "-y",
      ...vIn,
      "-i",
      narrationPath,
      "-filter_complex",
      `[1:a]volume=${narrVol},aformat=sample_fmts=fltp:channel_layouts=stereo[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
    ];
  }

  return [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    ...tailArgs(baseVideo, baseAudio, tail, outputPath, targetDurationSec),
  ];
}

export async function convertWebmToMp4(
  inputPath: string,
  outputPath: string,
  audio?: AudioMuxOptions
): Promise<void> {
  const executable = resolveFfmpegExecutable();
  const args = buildFfmpegArgs(inputPath, outputPath, audio);
  const timeoutMs = ffmpegTimeoutMs(audio?.targetDurationSec);

  return new Promise((resolve, reject) => {
    const proc = spawn(executable, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `ffmpeg conversion timed out after ${Math.round(timeoutMs / 1000)}s`
        )
      );
    }, timeoutMs);

    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "ffmpeg could not be started. Reinstall dependencies (npm install) or install ffmpeg on PATH."
          )
        );
        return;
      }
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      const tail = stderr.trim().slice(-500);
      reject(new Error(tail || `ffmpeg exited with code ${code}`));
    });
  });
}
