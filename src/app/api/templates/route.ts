import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api-utils";

export async function GET() {
  return withAuth(async () => {
    const templates = await prisma.template.findMany({
      orderBy: { industry: "asc" },
    });
    return jsonOk({ templates });
  });
}
