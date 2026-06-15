import { getSessionUser } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({ user });
}
