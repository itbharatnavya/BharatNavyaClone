"use client";

// Small stat cards — recruiter: open jobs / total applications; candidate: total
// applications / status breakdown. Client-side counts off the same list endpoints the
// other tabs already use (getMyJobs/getMyApplications) — no new backend endpoint.

import React, { useEffect, useState } from "react";
import { getMyJobs, getMyApplications } from "@/lib/api";
import type { Job, Application } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card card-flat" style={{ padding: 18 }}>
      <div style={{ fontSize: "var(--fs-xl)", fontWeight: 800, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function RecruiterOverview() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    getMyJobs().then(setJobs).catch(() => {});
  }, []);
  const active = jobs.filter((j) => j.status === "active").length;
  const totalApplications = jobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
      <StatCard label="Active jobs" value={active} />
      <StatCard label="Total jobs posted" value={jobs.length} />
      <StatCard label="Applications received" value={totalApplications} />
    </div>
  );
}

export function CandidateOverview() {
  const [applications, setApplications] = useState<Application[]>([]);
  useEffect(() => {
    getMyApplications().then(setApplications).catch(() => {});
  }, []);
  const inProgress = applications.filter((a) => !["hired", "rejected"].includes(a.status)).length;
  const hired = applications.filter((a) => a.status === "hired").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
      <StatCard label="Applications sent" value={applications.length} />
      <StatCard label="In progress" value={inProgress} />
      <StatCard label="Offers" value={hired} />
    </div>
  );
}
