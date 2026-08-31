"use client";

// Candidate's own applications — status pipeline + history (enhancement doc §3).
// Unconditional per the doc: any candidate sees this, no employer-side gating.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { getMyApplications, withdrawApplication } from "@/lib/api";
import type { Application, ApplicationStatus, FullApplicationStatus } from "@/lib/types";

// Mirrors backend/routes/applications.js's POST /:id/withdraw guard exactly (400s on
// "hired" or already "withdrawn") — kept in sync so the button is never shown enabled
// when the backend would reject the call.
function canWithdraw(status: FullApplicationStatus): boolean {
  return status !== "hired" && status !== "withdrawn";
}

const PIPELINE: ApplicationStatus[] = ["applied", "viewed", "shortlisted", "interview", "hired"];
// Withdrawn is deliberately not in PIPELINE/STATUS_LABEL's happy-path styling below —
// it's a candidate-initiated terminal state, styled like rejected (see statusColor).
const STATUS_LABEL: Record<FullApplicationStatus, string> = {
  applied: "Applied",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function statusColor(status: FullApplicationStatus): { bg: string; color: string } {
  switch (status) {
    case "hired":
      return { bg: "#DCFCE7", color: "#166534" };
    case "rejected":
    case "withdrawn":
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

function PipelineTrack({ status }: { status: FullApplicationStatus }) {
  if (status === "rejected") {
    return <div style={{ fontSize: 12.5, color: "#991B1B", fontWeight: 600 }}>Not moving forward</div>;
  }
  if (status === "withdrawn") {
    return <div style={{ fontSize: 12.5, color: "#991B1B", fontWeight: 600 }}>Withdrawn by you</div>;
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
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    getMyApplications()
      .then(setApplications)
      .catch(() => addToast("Could not load your applications.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  async function handleWithdraw(app: Application) {
    if (!window.confirm(`Withdraw your application for "${app.job?.title || "this role"}"? This can't be undone.`)) {
      return;
    }
    setWithdrawingId(app.id);
    try {
      const updated = await withdrawApplication(app.id);
      setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
      addToast("Application withdrawn.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not withdraw your application.", "error");
    } finally {
      setWithdrawingId(null);
    }
  }

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

                {expanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "grid", gap: 14 }}>
                    {app.coverNote && (
                      <div>
                        <strong style={{ fontSize: 13 }}>Your cover note</strong>
                        <p style={{ marginTop: 4, fontSize: 13, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{app.coverNote}</p>
                      </div>
                    )}

                    {app.answers && app.answers.length > 0 && (
                      <div>
                        <strong style={{ fontSize: 13 }}>Your answers</strong>
                        <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>Submitted with your application — not editable.</p>
                        <div style={{ marginTop: 6, display: "grid", gap: 8 }}>
                          {app.answers.map((a) => {
                            const questionText = app.job?.questions?.find((q) => q.id === a.questionId)?.text;
                            return (
                              <div key={a.questionId}>
                                <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{questionText || "Question"}</div>
                                <div style={{ fontSize: 13, color: "var(--ink)" }}>{a.text}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {app.statusHistory && app.statusHistory.length > 0 && (
                      <div>
                        <strong style={{ fontSize: 13 }}>History</strong>
                        <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13, color: "var(--muted)" }}>
                          {app.statusHistory.map((h, i) => (
                            <li key={i}>{STATUS_LABEL[h.status]} — {formatDate(h.changedAt)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {canWithdraw(app.status) && (
                      <div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={withdrawingId === app.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWithdraw(app);
                          }}
                          style={{ color: "#991B1B" }}
                        >
                          {withdrawingId === app.id ? "Withdrawing…" : "Withdraw application"}
                        </button>
                      </div>
                    )}
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
