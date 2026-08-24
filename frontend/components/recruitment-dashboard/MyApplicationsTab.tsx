"use client";

// Candidate's own applications — status pipeline + history (enhancement doc §3).
// Unconditional per the doc: any candidate sees this, no employer-side gating.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { getMyApplications } from "@/lib/api";
import type { Application, ApplicationStatus } from "@/lib/types";

const PIPELINE: ApplicationStatus[] = ["applied", "viewed", "shortlisted", "interview", "hired"];
const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

function statusColor(status: ApplicationStatus): { bg: string; color: string } {
  switch (status) {
    case "hired":
      return { bg: "#DCFCE7", color: "#166534" };
    case "rejected":
      return { bg: "#FEE2E2", color: "#991B1B" };
    case "shortlisted":
    case "interview":
      return { bg: "#DBEAFE", color: "#1E40AF" };
    default:
      return { bg: "#F1F5F9", color: "#475569" };
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function PipelineTrack({ status }: { status: ApplicationStatus }) {
  if (status === "rejected") {
    return <div style={{ fontSize: 12.5, color: "#991B1B", fontWeight: 600 }}>Not moving forward</div>;
  }
  const idx = PIPELINE.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {PIPELINE.map((s, i) => (
        <React.Fragment key={s}>
          <div
            title={STATUS_LABEL[s]}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i <= idx ? "var(--tricolor-green)" : "var(--border)",
              flexShrink: 0,
            }}
          />
          {i < PIPELINE.length - 1 && (
            <div style={{ width: 16, height: 2, background: i < idx ? "var(--tricolor-green)" : "var(--border)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function MyApplicationsTab() {
  const { addToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getMyApplications()
      .then(setApplications)
      .catch(() => addToast("Could not load your applications.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <div className="card card-flat card-pad">
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>My applications</h3>

      {loading ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>Loading…</p>
      ) : applications.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
          You haven't applied to any roles yet. <Link href="/recruitment/jobs" style={{ color: "var(--brand)" }}>Browse open roles</Link>.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {applications.map((app) => {
            const sc = statusColor(app.status);
            const expanded = expandedId === app.id;
            return (
              <div key={app.id} className="card" style={{ padding: 14 }}>
                <div
                  style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }}
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Link href={`/job/${app.jobId}`} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }} onClick={(e) => e.stopPropagation()}>
                      {app.job?.title || "Role"}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>Applied {formatDate(app.appliedAt)}</div>
                  </div>
                  <PipelineTrack status={app.status} />
                  <span className="badge" style={{ background: sc.bg, color: sc.color }}>{STATUS_LABEL[app.status]}</span>
                </div>

                {expanded && app.statusHistory && app.statusHistory.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: 13 }}>History</strong>
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13, color: "var(--muted)" }}>
                      {app.statusHistory.map((h, i) => (
                        <li key={i}>{STATUS_LABEL[h.status]} — {formatDate(h.changedAt)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
