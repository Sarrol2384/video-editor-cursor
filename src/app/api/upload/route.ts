import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { ensureUploadDir } from "@/lib/mockGen";

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

      const uploadDir = await ensureUploadDir();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${uuidv4()}.${ext}`;
      const filepath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filepath, buffer);

      const storageUrl = `/uploads/${filename}`;

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
    } catch {
      return jsonError("Upload failed", 500);
    }
  });
}
