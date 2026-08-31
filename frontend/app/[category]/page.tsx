"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CategoryLanding from "@/components/discovery/CategoryLanding";
import { parseDiscoverySeed } from "@/components/discovery/hooks";

// Reads the AI-hero search params (?city&type&budget&q …) and seeds them as
// removable filter state. useSearchParams must live under a Suspense boundary.
function CategoryInner({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const seed = parseDiscoverySeed(sp);
  return (
    <CategoryLanding slug={slug} initialFilters={seed.initialFilters} query={seed.query} />
  );
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  return (
    <Suspense fallback={<CategoryLanding slug={params.category} />}>
      <CategoryInner slug={params.category} />
    </Suspense>
  );
}
