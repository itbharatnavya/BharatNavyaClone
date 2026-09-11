"use client";

// Recruiter's own job postings — every status, not just active (mirrors Directory's
// ListingsTab against getMyListings). Edit routes to /post-job?jobId= (that page now
// doubles as create+edit); Pause/Close are direct status patches; each row's
// application count deep-links into the Applications tab pre-filtered to that job.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";
import { getMyJobs, updateJob } from "@/lib/api";
import { jobLocation } from "@/lib/recruitmentDesign";
import type { Job, JobStatus } from "@/lib/types";

function statusBadge(status: JobStatus): { bg: string; color: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "#DCFCE7", color: "#166534", label: "Active" };
    case "paused":
      return { bg: "#FEF3C7", color: "#92400E", label: "Paused" };
    case "closed":
      return { bg: "#F1F5F9", color: "#475569", label: "Closed" };
    case "draft":
      return { bg: "#E0E7FF", color: "#3730A3", label: "Draft" };
    default:
      return { bg: "#F1F5F9", color: "#475569", label: status };
  }
}

// "Expired" is deliberately not a stored status (build plan Phase 5) — it's derived
// client-side from expiresAt so the backend's status enum stays simple
// (active|paused|closed|draft).
function isExpired(job: Job): boolean {
  return job.status === "active" && !!job.expiresAt && new Date(job.expiresAt).getTime() < Date.now();
}

export default function MyJobsTab({ onViewApplications }: { onViewApplications: (jobId: string) => void }) {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    getMyJobs()
      .then(setJobs)
      .catch(() => addToast("Could not load your jobs.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(job: Job, status: "active" | "paused" | "closed") {
    setBusyId(job.id);
    try {
      await updateJob(job.id, { status });
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not update job.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card card-flat card-pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>My jobs</h3>
        <Button variant="green" size="sm" href="/post-job">+ Post a job</Button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Loading…</p>
      ) : jobs.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>You haven't posted any jobs yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((job) => {
            const st = statusBadge(job.status);
            const expired = isExpired(job);
            return (
              <div key={job.id} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Link href={`/job/${job.id}`} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
                    {job.title}
                  </Link>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
                    {jobLocation(job)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onViewApplications(job.id)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--brand)" }}
                >
                  {job.applicationCount} application{job.applicationCount === 1 ? "" : "s"}
                </button>
                {expired && (
                  <span className="badge" style={{ background: "#FEE2E2", color: "#991B1B", flexShrink: 0 }}>Expired</span>
                )}
                <span className="badge" style={{ background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Button variant="secondary" size="sm" href={`/post-job?jobId=${job.id}`}>Edit</Button>
                  {job.status !== "closed" && job.status !== "draft" && (
                    <Button variant="secondary" size="sm" onClick={() => setStatus(job, job.status === "paused" ? "active" : "paused")} disabled={busyId === job.id}>
                      {job.status === "paused" ? "Resume" : "Pause"}
                    </Button>
                  )}
                  {job.status !== "closed" && job.status !== "draft" && (
                    <Button variant="ghost" size="sm" onClick={() => setStatus(job, "closed")} disabled={busyId === job.id}>Close</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
