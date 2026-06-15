import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, jsonOk, jsonError } from "@/lib/api-utils";
import { DEFAULT_SETTINGS, parseSettings } from "@/lib/types";
import {
  BRAND_BY_INDUSTRY,
  getBrand,
  isBrandId,
  settingsForBrand,
} from "@/lib/brands";

export async function GET() {
  return withAuth(async (user) => {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        template: true,
        assets: { orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { assets: true, jobs: true } },
      },
    });

    return jsonOk({
      projects: projects.map((p) => ({
        ...p,
        settings: parseSettings(p.settings, p.name),
      })),
    });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const { name, templateId, brandId: bodyBrandId } = body;

      let settings = { ...DEFAULT_SETTINGS };

      if (bodyBrandId && isBrandId(bodyBrandId)) {
        settings = { ...settings, ...settingsForBrand(bodyBrandId) };
      }

      if (templateId) {
        const template = await prisma.template.findUnique({
          where: { id: templateId },
        });
        if (template) {
          const templateParams = JSON.parse(template.defaultParams || "{}");
          settings = { ...settings, ...templateParams };
          if (template.promptScaffold) {
            settings.scenePrompt = template.promptScaffold;
            settings.backgroundPrompt = template.promptScaffold;
          }
          const mappedBrand = BRAND_BY_INDUSTRY[template.industry];
          if (mappedBrand && !bodyBrandId) {
            settings = { ...settings, ...settingsForBrand(mappedBrand) };
          }
        }
      }

      const brand = getBrand(settings.brandId);
      const projectName =
        name || (brand ? `New ${brand.name} post` : "Untitled Project");

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          name: projectName,
          templateId: templateId || undefined,
          settings: JSON.stringify(settings),
        },
        include: { template: true },
      });

      return jsonOk({
        project: { ...project, settings: parseSettings(project.settings, project.name) },
      });
    } catch {
      return jsonError("Failed to create project", 500);
    }
  });
}
