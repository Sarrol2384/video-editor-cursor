import path from "path";
import os from "os";
import fs from "fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export const STORAGE_BUCKET = "uploads";

let supabase: SupabaseClient | null = null;
let bucketReady = false;

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

export function isRemoteMediaUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function requireSupabaseOnVercel() {
  if (process.env.VERCEL && !isSupabaseStorageConfigured()) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

function getSupabaseAdmin(): SupabaseClient {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const client = getSupabaseAdmin();
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }
  const exists = buckets?.some((bucket) => bucket.name === STORAGE_BUCKET);
  if (!exists) {
    const { error } = await client.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Failed to create storage bucket: ${error.message}`);
    }
  }
  bucketReady = true;
}

export function contentTypeForFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export async function ensureTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), "video-studio-uploads");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Local fallback when Supabase Storage is not configured (dev only). */
async function ensureLocalUploadDir(): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadBuffer(
  buffer: Buffer,
  filename: string,
  contentType?: string
): Promise<string> {
  requireSupabaseOnVercel();
  const mime = contentType || contentTypeForFilename(filename);

  if (isSupabaseStorageConfigured()) {
    await ensureBucket();
    const client = getSupabaseAdmin();
    const { error } = await client.storage.from(STORAGE_BUCKET).upload(
      filename,
      new Uint8Array(buffer),
      {
        contentType: mime,
        upsert: true,
      }
    );
    if (error) {
      throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  const dir = await ensureLocalUploadDir();
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function saveUploadFromUrl(
  url: string,
  extension: string
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${url} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const filename = `${uuidv4()}${ext}`;
  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    contentTypeForFilename(filename);
  return saveUploadBuffer(buffer, filename, contentType);
}

export async function materializeLocalFile(
  urlOrPath: string
): Promise<{ filePath: string; cleanup: boolean }> {
  if (isRemoteMediaUrl(urlOrPath)) {
    const response = await fetch(urlOrPath);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${urlOrPath} (${response.status})`);
    }
    const parsed = new URL(urlOrPath);
    const ext = path.extname(parsed.pathname) || ".bin";
    const dir = await ensureTempDir();
    const filePath = path.join(dir, `${uuidv4()}${ext}`);
    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    return { filePath, cleanup: true };
  }

  if (!urlOrPath.startsWith("/uploads/")) {
    throw new Error("Invalid media path");
  }
  const filePath = path.join(
    process.cwd(),
    "public",
    urlOrPath.replace(/^\//, "")
  );
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(
      `Local media file not found (${urlOrPath}). Re-generate this asset so it is stored in Supabase Storage.`
    );
  }
  return {
    filePath,
    cleanup: false,
  };
}
