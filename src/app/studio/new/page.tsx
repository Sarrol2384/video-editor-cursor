"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRANDS, isBrandId } from "@/lib/brands";

export default function NewStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const brandParam = searchParams.get("brand");

  useEffect(() => {
    async function create() {
      const brandId =
        brandParam && isBrandId(brandParam) ? brandParam : undefined;
      const brand = brandId ? BRANDS[brandId] : undefined;

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brand ? `New ${brand.name} post` : "New Project",
          templateId: templateId || undefined,
          brandId,
        }),
      });
      const data = await res.json();
      if (data.project) {
        router.replace(`/studio/${data.project.id}`);
      } else {
        router.replace("/dashboard");
      }
    }
    create();
  }, [router, templateId, brandParam]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="mt-4 text-gray-600">Creating project...</p>
      </div>
    </div>
  );
}
