import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { parseSettings } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ProjectListCard } from "@/components/ProjectListCard";
import { BRANDS, isBrandId, projectMatchesBrand } from "@/lib/brands";

interface BusinessHubPageProps {
  params: Promise<{ brandId: string }>;
}

export default async function BusinessHubPage({ params }: BusinessHubPageProps) {
  const { brandId } = await params;
  if (!isBrandId(brandId)) notFound();

  const brand = BRANDS[brandId];
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [projects, templates] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { template: true },
    }),
    prisma.template.findMany({
      where: { industry: brand.templateIndustry },
      orderBy: { name: "asc" },
    }),
  ]);

  const brandProjects = projects
    .map((p) => ({ ...p, settings: parseSettings(p.settings, p.name) }))
    .filter((p) => projectMatchesBrand(p.settings, brandId, p.name));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar credits={user.credits} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-brand-600 hover:underline"
        >
          ← All businesses
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <BrandLogo
              src={brand.logoUrl}
              alt={brand.name}
              size="lg"
              wide={brand.logoWide}
              darkBg={brand.logoDarkBg}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
              <p className="mt-1 max-w-xl text-gray-600">{brand.hubBlurb}</p>
            </div>
          </div>
          <Link
            href={`/studio/new?brand=${brandId}`}
            className="btn-primary shrink-0"
          >
            + New post
          </Link>
        </div>

        {templates.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick start templates
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Link
                  key={t.id}
                  href={`/studio/new?brand=${brandId}&template=${t.id}`}
                  className="card transition-shadow hover:shadow-md"
                >
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                    {t.industry}
                  </span>
                  <h3 className="mt-2 font-medium text-gray-900">{t.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {brand.name} projects
          </h2>
          {brandProjects.length === 0 ? (
            <div className="card mt-4 text-center text-gray-500">
              No projects yet. Click <strong>+ New post</strong> or pick a template
              above.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brandProjects.map((p) => (
                <ProjectListCard key={p.id} projectId={p.id} projectName={p.name}>
                  <h3 className="font-medium text-gray-900">{p.name}</h3>
                  {p.template && (
                    <p className="mt-1 text-xs text-brand-600">{p.template.name}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Step {p.step + 1} of 5 · {p.status}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {p.settings.aspectRatio} · {p.settings.workflowMode}
                  </p>
                </ProjectListCard>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
