"use client";

// JobResults — owns its own fetch (mirrors Directory's DiscoveryResults: takes a query
// shape, not pre-fetched data) against GET /api/jobs, renders the list + pagination.
// Deliberately a plain vertical list of JobCard rows (job-board convention), not
// Directory's `repeat(auto-fill, minmax(230px,1fr))` image-tile grid.

import React, { useEffect, useState } from "react";
import { getJobs } from "@/lib/api";
import type { Job, JobsResponse } from "@/lib/types";
import type { JobFilterState } from "./JobFilters";
import JobCard from "./JobCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/discovery/EmptyState";

export interface JobResultsProps {
  q?: string;
  filters: JobFilterState;
  page: number;
  onPageChange: (page: number) => void;
  limit?: number;
}

function BriefcaseSearchIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

function SkeletonRow() {
  return (
    <div className="card card-flat" style={{ padding: 18, display: "flex", gap: 16 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 16, width: "40%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 13, width: "25%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 13, width: "60%", borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function JobResults({ q, filters, page, onPageChange, limit = 10 }: JobResultsProps) {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getJobs({ q, ...filters, page, limit })
      .then((r) => alive && setData(r))
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load roles.");
        setData(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filterKey, page, limit]);

  if (error) {
    return <EmptyState icon={<BriefcaseSearchIcon />} title="Couldn't load roles" message={error} />;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  const jobs: Job[] = data?.jobs || [];

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<BriefcaseSearchIcon />}
        title="No roles match these filters"
        message="Try widening the location, clearing the salary range, or searching a broader role."
      />
    );
  }

  return (
    <div>
      <p className="jr-count">
        {data?.total ?? jobs.length} role{(data?.total ?? jobs.length) === 1 ? "" : "s"} found
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
        </div>
      )}
      <style jsx>{`
        .jr-count {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 14px;
        }
      `}</style>
    </div>
  );
}
