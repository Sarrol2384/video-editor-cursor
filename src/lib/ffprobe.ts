import { spawn } from "child_process";
import { existsSync } from "fs";
import ffmpegStatic from "ffmpeg-static";

function resolveFfmpegExecutable(): string {
  const bundled = typeof ffmpegStatic === "string" ? ffmpegStatic : null;
  if (bundled && existsSync(bundled)) return bundled;
  return "ffmpeg";
}

/** Parse `Duration: HH:MM:SS.ms` from ffmpeg stderr. */
export async function probeMediaDurationSec(
  filePath: string
): Promise<number | null> {
  const executable = resolveFfmpegExecutable();

  return new Promise((resolve) => {
    const proc = spawn(executable, ["-i", filePath, "-f", "null", "-"], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const match = stderr.match(
        /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/
      );
      if (!match) {
        resolve(null);
        return;
      }
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      if (!Number.isFinite(hours + minutes + seconds)) {
        resolve(null);
        return;
      }
      resolve(hours * 3600 + minutes * 60 + seconds);
    });
  });
}
