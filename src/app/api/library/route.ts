import { prisma } from "@/lib/db";
import { withAuth, jsonOk } from "@/lib/api-utils";

export async function GET() {
  return withAuth(async (user) => {
    const assets = await prisma.asset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return jsonOk({ assets });
  });
}
