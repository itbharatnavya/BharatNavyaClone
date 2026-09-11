"use client";

// components/admin/JobsAdminTab.tsx — admin visibility over every Recruitment job,
// regardless of status or employer-approval (the public job list only shows active
// jobs from approved employers). Pause/activate/close reuse the existing
// PUT /api/jobs/:id (lib/api.ts's updateJob — isOwnerOrAdmin already lets an admin
// patch status). Deliberately no review/verification-queue state machine — see
// ADMIN-CONSOLE.md / RECRUITMENT.md: that's explicitly deferred future scope.

import React, { useEffect, useState } from "react";
import { adminGetJobs, type AdminJobRow } from "./adminApi";
import { updateJob } from "@/lib/api";
import {
  SectionHeader,
  FilterTabs,
  AdminTable,
  Row,
  Td,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  fmtDate,
} from "./ui";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "active" | "paused" | "closed" | "draft";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
  { value: "draft", label: "Draft" },
];

export default function JobsAdminTab() {
  const { addToast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const page = await adminGetJobs({ status, limit: 50 });
      setJobs(page.jobs);
      setTotal(page.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function setJobStatus(job: AdminJobRow, next: "active" | "paused" | "closed") {
    setBusyId(job.id);
    try {
      await updateJob(job.id, { status: next });
      addToast(`${job.title} marked ${next}`, "success");
      await load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Jobs"
        subtitle="Visibility across every job posting, regardless of status."
        actions={<span className="text-sm text-muted">{total} job{total === 1 ? "" : "s"}</span>}
      />

      <div className="mb-4">
        <FilterTabs tabs={STATUS_TABS} value={status} onChange={(v) => setStatus(v as StatusFilter)} />
      </div>

      {loading ? (
        <LoadingState label="Loading jobs…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs" hint="No jobs match this filter." />
      ) : (
        <AdminTable columns={["Job", "Employer", "Status", "Posted", "Applications", "Actions"]}>
          {jobs.map((j) => {
            const busy = busyId === j.id;
            return (
              <Row key={j.id}>
                <Td>
                  <div className="font-semibold text-ink">{j.title}</div>
                  <div className="text-xs text-faint">
                    {j.location?.city || "—"}
                    {j.location?.workplaceType === "hybrid" ? " · Hybrid" : (j.location?.workplaceType === "remote" || j.location?.remote) ? " · Remote" : ""}
                  </div>
                </Td>
                <Td>
                  <div className="text-ink">{j.employerCompany}</div>
                  {j.employerStatus !== "approved" && (
                    <Pill tone="amber">{j.employerStatus || "unknown"}</Pill>
                  )}
                </Td>
                <Td>
                  <Pill status={j.status}>{j.status}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-muted">{fmtDate(j.postedAt)}</Td>
                <Td className="text-muted">{j.applicationCount ?? 0}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {j.status !== "active" && (
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() => setJobStatus(j, "active")}
                      >
                        Activate
                      </Button>
                    )}
                    {j.status !== "paused" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setJobStatus(j, "paused")}
                      >
                        Pause
                      </Button>
                    )}
                    {j.status !== "closed" && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => setJobStatus(j, "closed")}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </Td>
              </Row>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
