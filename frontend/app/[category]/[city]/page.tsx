"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryLanding from "@/components/discovery/CategoryLanding";
import { parseDiscoverySeed } from "@/components/discovery/hooks";

// URL city segment → human display name (e.g. "navi-mumbai" → "Navi Mumbai").
function prettifyCity(raw: string): string {
  return decodeURIComponent(raw)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function CategoryCityInner({ slug, city }: { slug: string; city: string }) {
  const sp = useSearchParams();
  const seed = parseDiscoverySeed(sp);
  // City is structural on this route (in the path), so don't seed it as a
  // removable filter — keep everything else the hero may have passed.
  const initialFilters = { ...seed.initialFilters, city: undefined };
  return (
    <CategoryLanding
      slug={slug}
      city={city}
      initialFilters={initialFilters}
      query={seed.query}
    />
  );
}

export default function CategoryCityPage({
  params,
}: {
  params: { category: string; city: string };
}) {
  const city = prettifyCity(params.city);
  return (
    <Suspense fallback={<CategoryLanding slug={params.category} city={city} />}>
      <CategoryCityInner slug={params.category} city={city} />
    </Suspense>
  );
}
