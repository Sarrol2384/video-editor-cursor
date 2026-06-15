import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth<T>(
  handler: (user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<NextResponse>
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  return handler(user);
}
