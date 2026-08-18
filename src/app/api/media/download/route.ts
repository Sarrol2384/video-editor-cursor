import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

function isAllowedMediaUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const supabase = process.env.SUPABASE_URL?.replace(/\/$/, "");
    if (supabase) {
      const host = new URL(supabase).host;
      if (url.host === host && url.pathname.includes("/storage/")) {
        return true;
      }
    }

    // Legacy same-origin /uploads paths (local only).
    if (url.pathname.startsWith("/uploads/")) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Proxy remote exports so the browser can force a file download.
 * Cross-origin Storage URLs ignore the HTML download attribute.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  const filenameParam = req.nextUrl.searchParams.get("filename") || "export.mp4";
  const filename = filenameParam.replace(/[^\w.\-]+/g, "_").slice(0, 120);

  if (!rawUrl || !isAllowedMediaUrl(rawUrl)) {
    return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
  }

  const upstream = await fetch(rawUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Failed to fetch media (${upstream.status})` },
      { status: 502 }
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
