"use client";

// Recruitment job browse/search — filters sidebar + JobResults list, following the
// same "own page, own fetch" shape as Directory's category/search pages but with
// Recruitment's own components throughout (see RECRUITMENT.md, frontend-design-guide.md
// color-to-module mapping).

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import RoleSearchBar from "@/components/recruitment/RoleSearchBar";
import JobFilters, { JobFilterState } from "@/components/recruitment/JobFilters";
import JobResults from "@/components/recruitment/JobResults";
import AdSlider from "@/components/AdSlider";
import { getJobFunctions } from "@/lib/api";
import type { JobFunction } from "@/lib/types";
import SearchContextSwitch from "@/components/SearchContextSwitch";

function JobsBrowseInner() {
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || "";
  const urlCity = searchParams.get("city") || "";

  const [q, setQ] = useState(urlQ);
  const [filters, setFilters] = useState<JobFilterState>(urlCity ? { city: urlCity } : {});
  const [page, setPage] = useState(1);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);

  // RoleSearchBar navigates to this same route with new ?q=/?city= params (e.g. used
  // again from this very page) — react to that rather than only reading them once.
  useEffect(() => {
    setQ(urlQ);
    setFilters((prev) => ({ ...prev, city: urlCity || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlCity]);

  useEffect(() => {
    getJobFunctions().then(setJobFunctions).catch(() => {});
  }, []);

  // Reset to page 1 whenever the query or filters change.
  useEffect(() => {
    setPage(1);
  }, [q, JSON.stringify(filters)]);

  function handlePageChange(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="container-bs section-pad-sm">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Recruitment", href: "/recruitment" }, { label: "Browse roles" }]}
      />

      <div style={{ marginTop: 18, marginBottom: 28 }}>
        <RoleSearchBar
          query={q}
          onQueryChange={setQ}
          city={filters.city || ""}
          onCityChange={(c) => setFilters((prev) => ({ ...prev, city: c || undefined }))}
        />
      </div>

      <SearchContextSwitch destination="directory" query={q} city={filters.city} />

      <div className="rj-layout">
        <aside className="rj-aside">
          <JobFilters value={filters} onChange={setFilters} jobFunctions={jobFunctions} />
        </aside>
        <div className="rj-main">
          <AdSlider placement="recruitment_search_top" />
          <JobResults q={q} filters={filters} page={page} onPageChange={handlePageChange} />
        </div>
      </div>

      <style jsx>{`
        .rj-layout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 28px;
          align-items: start;
          margin-top: 8px;
        }
        .rj-aside {
          position: sticky;
          top: 96px;
        }
        @media (max-width: 860px) {
          .rj-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .rj-aside {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}

export default function RecruitmentJobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsBrowseInner />
    </Suspense>
  );
}
