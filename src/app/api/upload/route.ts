import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { saveUploadBuffer } from "@/lib/storage";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const projectId = formData.get("projectId") as string | null;

      if (!file) return jsonError("No file provided");

      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        return jsonError("Only JPEG, PNG, WebP, and GIF images are allowed");
      }

      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${uuidv4()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageUrl = await saveUploadBuffer(buffer, filename, file.type);

      const asset = await prisma.asset.create({
        data: {
          userId: user.id,
          projectId: projectId || undefined,
          type: "image",
          source: "upload",
          storageUrl,
          metadata: JSON.stringify({
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        },
      });

      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });
        if (project) {
          const current = JSON.parse(project.settings || "{}");
          await prisma.project.update({
            where: { id: projectId },
            data: {
              settings: JSON.stringify({
                ...current,
                sourceImageUrl: storageUrl,
              }),
            },
          });
        }
      }

      return jsonOk({ asset });
    } catch (err) {
      console.error("Upload failed:", err);
      return jsonError(
        err instanceof Error ? err.message : "Upload failed",
        500
      );
    }
  });
}
