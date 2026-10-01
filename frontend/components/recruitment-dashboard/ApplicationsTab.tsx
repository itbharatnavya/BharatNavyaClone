"use client";

// Recruiter's received applications across their jobs — mirrors Directory's LeadsTab
// against getJobApplications, with a candidate-detail expand panel (photo, skills,
// experience, CV, recruiter-question answers, cover note, status history) and a
// status-update control (enhancement doc §11).

import React, { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";
import { getJobApplications, updateApplicationStatus } from "@/lib/api";
import type { Application, ApplicationStatus, FullApplicationStatus } from "@/lib/types";

// Employer-settable statuses only — "withdrawn" is a candidate-only transition (see
// backend/routes/applications.js's VALID_STATUSES) and never appears as an option here.
const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "viewed", label: "Viewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

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

export default function ApplicationsTab({ jobId }: { jobId?: string | null }) {
  const { addToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    getJobApplications(jobId ? { jobId } : {})
      .then(setApplications)
      .catch(() => addToast("Could not load applications.", "error"))
      .finally(() => setLoading(false));
  }, [jobId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(app: Application, status: ApplicationStatus) {
    setBusyId(app.id);
    try {
      await updateApplicationStatus(app.id, status);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not update status.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card card-flat card-pad">
      <h3 style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)", marginBottom: 16 }}>
        Applications{jobId && applications[0]?.job?.title ? ` — ${applications[0].job.title}` : ""}
      </h3>

      {loading ? (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>Loading…</p>
      ) : applications.length === 0 ? (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>No applications yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {applications.map((app) => {
            const c = app.candidate;
            const sc = statusColor(app.status);
            const expanded = expandedId === app.id;
            return (
              <div key={app.id} className="card" style={{ padding: 14 }}>
                <div
                  style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", cursor: "pointer" }}
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                >
                  <Avatar name={c?.name || "Candidate"} src={c?.avatarUrl} size={40} />
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>{c?.name || "Candidate"}</div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                      {c?.currentRole || c?.headline || "—"}{!jobId && app.job?.title ? ` · Applied to ${app.job.title}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>{formatDate(app.appliedAt)}</span>
                  <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                    {STATUS_OPTIONS.find((s) => s.value === app.status)?.label || app.status}
                  </span>
                </div>

                {expanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "grid", gap: 10, fontSize: "var(--fs-sm)" }}>
                    {c?.skills && c.skills.length > 0 && (
                      <div><strong>Skills:</strong> {c.skills.join(", ")}</div>
                    )}
                    {c?.experienceYears != null && <div><strong>Experience:</strong> {c.experienceYears} years</div>}
                    {c?.currentCompany && <div><strong>Current company:</strong> {c.currentCompany}</div>}
                    <div>
                      <strong>CV:</strong>{" "}
                      {app.resumeUrl ? (
                        <a href={app.resumeUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>View resume</a>
                      ) : "—"}
                    </div>
                    <div><strong>Contact:</strong> {c?.contactPhone || "—"}{c?.contactEmail ? ` · ${c.contactEmail}` : ""}</div>
                    {app.answers && app.answers.length > 0 && (
                      <div>
                        <strong>Answers:</strong>
                        <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                          {app.answers.map((a) => (
                            <li key={a.questionId} style={{ marginBottom: 4, color: "var(--muted)" }}>{a.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {app.coverNote && (
                      <div>
                        <strong>Cover note:</strong>
                        <p style={{ marginTop: 4, whiteSpace: "pre-wrap", color: "var(--muted)" }}>{app.coverNote}</p>
                      </div>
                    )}
                    {app.statusHistory && app.statusHistory.length > 0 && (
                      <div>
                        <strong>History:</strong>
                        <ul style={{ marginTop: 4, paddingLeft: 18, color: "var(--muted)" }}>
                          {app.statusHistory.map((h, i) => (
                            <li key={i}>{STATUS_OPTIONS.find((s) => s.value === h.status)?.label || h.status} — {formatDate(h.changedAt)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div style={{ maxWidth: 220 }} onClick={(e) => e.stopPropagation()}>
                      <Select
                        label="Update status"
                        value={app.status}
                        onChange={(e) => changeStatus(app, e.target.value as ApplicationStatus)}
                        options={STATUS_OPTIONS}
                        disabled={busyId === app.id}
                      />
                    </div>
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
