import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { AssetCard } from "@/components/AssetCard";
import { ProjectListCard } from "@/components/ProjectListCard";

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const assets = await prisma.asset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { template: true, _count: { select: { assets: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar credits={user.credits} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Asset Library</h1>
        <p className="mt-1 text-gray-600">
          All your uploaded and generated assets
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">All Assets</h2>
          {assets.length === 0 ? (
            <div className="card mt-4 text-center text-gray-500">
              No assets yet. Create a project to get started.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectListCard key={p.id} projectId={p.id} projectName={p.name}>
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                {p.template && (
                  <p className="mt-1 text-xs text-brand-600">{p.template.name}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {p._count.assets} assets &middot; Step {p.step + 1}/5
                </p>
              </ProjectListCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
