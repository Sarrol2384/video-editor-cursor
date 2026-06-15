import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { applyBrandDefaults } from "@/lib/brands";
import { parseSettings } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
      select: {
        id: true,
        name: true,
        step: true,
        status: true,
        settings: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) return jsonError("Project not found", 404);

    return jsonOk({
      project: {
        ...project,
        settings: parseSettings(project.settings, project.name),
      },
    });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    try {
      const existing = await prisma.project.findFirst({
        where: { id: params.id, userId: user.id },
      });
      if (!existing) return jsonError("Project not found", 404);

      const body = await req.json();
      const currentSettings = parseSettings(existing.settings, existing.name);
      const merged = body.settings
        ? { ...currentSettings, ...body.settings }
        : currentSettings;
      for (const [key, value] of Object.entries(body.settings ?? {})) {
        if (value === null) {
          delete (merged as Record<string, unknown>)[key];
        }
      }
      const newSettings = applyBrandDefaults(
        merged,
        body.name ?? existing.name
      );

      const project = await prisma.project.update({
        where: { id: params.id },
        data: {
          name: body.name ?? existing.name,
          step: body.step ?? existing.step,
          status: body.status ?? existing.status,
          settings: JSON.stringify(newSettings),
        },
        include: { template: true, assets: true },
      });

      return jsonOk({
        project: { ...project, settings: parseSettings(project.settings, project.name) },
      });
    } catch {
      return jsonError("Failed to update project", 500);
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    const existing = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return jsonError("Project not found", 404);

    await prisma.project.delete({ where: { id: params.id } });
    return jsonOk({ success: true });
  });
}
