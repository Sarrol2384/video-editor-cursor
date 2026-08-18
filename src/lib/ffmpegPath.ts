import path from "path";
import { chmodSync, existsSync } from "fs";
import ffmpegStatic from "ffmpeg-static";

function packageExportPath(): string | null {
  const bundledUnknown: unknown = ffmpegStatic as unknown;
  if (typeof bundledUnknown === "string" && bundledUnknown.length > 0) {
    return bundledUnknown;
  }
  if (bundledUnknown && typeof bundledUnknown === "object") {
    const record = bundledUnknown as Record<string, unknown>;
    if (typeof record.default === "string" && record.default.length > 0) {
      return record.default;
    }
    if (typeof record.path === "string" && record.path.length > 0) {
      return record.path;
    }
  }
  return null;
}

/** Candidate absolute paths for the ffmpeg-static binary. */
export function ffmpegCandidatePaths(): string[] {
  const binaryName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const fromPkg = packageExportPath();
  const cwd = process.cwd();

  return Array.from(
    new Set(
      [
        fromPkg,
        path.join(cwd, "node_modules", "ffmpeg-static", binaryName),
        path.join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"),
        // NFT sometimes nests the package under the serverless function root.
        path.join(cwd, ".next", "server", "node_modules", "ffmpeg-static", binaryName),
        path.join(cwd, ".next", "server", "node_modules", "ffmpeg-static", "ffmpeg"),
      ].filter((p): p is string => typeof p === "string" && p.length > 0)
    )
  );
}

/**
 * Resolve a runnable ffmpeg binary for local + Vercel Node runtimes.
 * On Linux we chmod +x because packaged binaries are often not executable.
 */
export function resolveFfmpegExecutable(): string {
  const candidates = ffmpegCandidatePaths();
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      chmodSync(candidate, 0o755);
    } catch {
      // Windows or already executable — ignore.
    }
    return candidate;
  }
  return candidates[0] || "ffmpeg";
}
