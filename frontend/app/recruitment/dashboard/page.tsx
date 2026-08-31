"use client";

// Recruitment dashboard entry — owns only the role-selection gate (RoleGate below); the
// full tabbed shell (Overview/My Jobs/Applications/Profile/Stories/Blogs/Reviews/
// Advertise) lives in components/recruitment-dashboard/RecruitmentDashboardShell.tsx. A
// user picks a Recruitment role once — that choice locks the moment their first
// employer/candidate profile is submitted (enforced server-side in become-employer /
// PUT me/candidate; this page just reflects it, and never offers a "switch role"
// control once locked).

import React, { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useToast } from "@/components/Toast";
import { setRecruitmentRole } from "@/lib/api";
import RecruitmentDashboardShell from "@/components/recruitment-dashboard/RecruitmentDashboardShell";

// Shown once, before the tabbed shell, when the account hasn't picked a Recruitment
// side yet. Selecting is safe to change up until the first profile submit (the backend
// 409s a re-selection only once recruitmentRoleLockedAt is set) — no separate "confirm"
// step, picking a card both selects and reveals the matching shell.
function RoleGate({ onPicked }: { onPicked: () => void }) {
  const { addToast } = useToast();
  const [picking, setPicking] = useState<"candidate" | "recruiter" | null>(null);

  async function pick(role: "candidate" | "recruiter") {
    setPicking(role);
    try {
      await setRecruitmentRole(role);
      onPicked();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not save your choice.", "error");
    } finally {
      setPicking(null);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
      {(
        [
          { role: "candidate" as const, title: "I'm looking for a job", desc: "Build a candidate profile, apply to roles, and track your applications." },
          { role: "recruiter" as const, title: "I'm hiring", desc: "Set up a company profile, post jobs, and review candidates." },
        ]
      ).map((opt) => (
        <button
          key={opt.role}
          type="button"
          onClick={() => pick(opt.role)}
          disabled={picking !== null}
          className="card"
          style={{ textAlign: "left", padding: 20, cursor: picking ? "default" : "pointer", opacity: picking && picking !== opt.role ? 0.6 : 1 }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{opt.title}</div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>{opt.desc}</div>
          <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--tricolor-green-hover)" }}>
            {picking === opt.role ? "Saving…" : "Continue →"}
          </div>
        </button>
      ))}
    </div>
  );
}

function RecruitmentDashboardBody() {
  const { user, refresh } = useAuth();
  const [showRoleGate, setShowRoleGate] = useState(!user?.recruitmentRole);

  if (!user) return null;
  const role = user.recruitmentRole;
  const locked = !!user.recruitmentRoleLockedAt;

  return (
    <div className="container-bs section-pad-sm">
      <span className="rd-eyebrow">Recruitment</span>
      <h1 className="rd-h1">{role && !showRoleGate ? "Your Recruitment dashboard" : "Your Recruitment profile"}</h1>
      <p className="rd-sub">
        {role && !showRoleGate ? "Manage jobs, applications, your profile and more." : "Tell us which side of Recruitment you're here for."}
      </p>

      <div style={{ marginTop: 28 }}>
        {showRoleGate && <RoleGate onPicked={async () => { await refresh(); setShowRoleGate(false); }} />}
        {role && !showRoleGate && !locked && (
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
            Not the right choice?{" "}
            <button type="button" onClick={() => setShowRoleGate(true)} className="rd-role-reset">
              Switch role
            </button>{" "}
            before you finish setting up your profile — this locks once you save it.
          </p>
        )}
        {role && !showRoleGate && <RecruitmentDashboardShell user={user} />}
      </div>

      <style jsx>{`
        .rd-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--tricolor-green-hover);
        }
        .rd-h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-top: 6px;
        }
        .rd-sub {
          font-size: 14.5px;
          color: var(--muted);
          margin-top: 6px;
        }
        .rd-role-reset {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          font-weight: 600;
          color: var(--brand);
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function RecruitmentDashboardInner() {
  const { user, loading } = useRequireAuth({ redirectTo: "/login?next=/recruitment/dashboard" });

  return loading || !user ? null : <RecruitmentDashboardBody />;
}

export default function RecruitmentDashboardPage() {
  return (
    <Suspense fallback={null}>
      <RecruitmentDashboardInner />
    </Suspense>
  );
}
