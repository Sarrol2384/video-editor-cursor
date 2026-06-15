import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { parseSettings } from "@/lib/types";
import { BrandLogo } from "@/components/BrandLogo";
import { ProjectListCard } from "@/components/ProjectListCard";
import { BRAND_LIST, projectMatchesBrand } from "@/lib/brands";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { template: true },
  });

  const parsed = projects.map((p) => ({
    ...p,
    settings: parseSettings(p.settings, p.name),
  }));

  const brandCounts = Object.fromEntries(
    BRAND_LIST.map((b) => [
      b.id,
      parsed.filter((p) => projectMatchesBrand(p.settings, b.id, p.name)).length,
    ])
  ) as Record<string, number>;

  const recent = parsed.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar credits={user.credits} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Pick a business to create and manage video posts
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Your businesses</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {BRAND_LIST.map((brand) => (
              <Link
                key={brand.id}
                href={`/business/${brand.id}`}
                className="card transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <BrandLogo
                    src={brand.logoUrl}
                    alt={brand.name}
                    size="lg"
                    wide={brand.logoWide}
                    darkBg={brand.logoDarkBg}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {brand.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{brand.description}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {brandCounts[brand.id] ?? 0} project
                  {(brandCounts[brand.id] ?? 0) === 1 ? "" : "s"}
                </p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-600">
                  Open workspace →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent across all businesses
              </h2>
              <Link href="/library" className="text-sm text-brand-600 hover:underline">
                View library
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((p) => (
                <ProjectListCard key={p.id} projectId={p.id} projectName={p.name}>
                  <h3 className="font-medium text-gray-900">{p.name}</h3>
                  <p className="mt-1 text-xs text-brand-600">
                    {p.settings.pharmacyName || p.settings.brandId}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Step {p.step + 1} of 5 · {p.status}
                  </p>
                </ProjectListCard>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
