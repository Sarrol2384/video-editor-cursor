/** Public base URL for share links and absolute media URLs. */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Turn a storage path or URL into an absolute URL for share pages. */
export function toAbsoluteMediaUrl(storageUrl: string): string {
  const trimmed = storageUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = getPublicAppUrl();
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** Client-safe share base URL (NEXT_PUBLIC_APP_URL or current origin in dev). */
export function getClientShareBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
