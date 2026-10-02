"use client";

// The tabbed Recruitment dashboard — structurally mirrors Directory's
// DashboardShell.tsx (TabMeta registry, useMemo-filtered by role, ?tab=/?job= URL
// sync) but is its own component tree, not an extension of it (RECRUITMENT.md §4 —
// Recruitment's dashboard stays separate from Directory's). Only mounted once a
// Recruitment role is chosen; the parent page (/recruitment/dashboard/page.tsx) still
// owns the role-selection gate.

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import type { User } from "@/lib/types";
import { RecruiterOverview, CandidateOverview } from "./OverviewTab";
import MyJobsTab from "./MyJobsTab";
import ApplicationsTab from "./ApplicationsTab";
import MyApplicationsTab from "./MyApplicationsTab";
import CompanyProfileTab from "./CompanyProfileTab";
import CandidateProfileTab from "./CandidateProfileTab";
import AdvertisementsTab from "./AdvertisementsTab";
import StoriesTab from "@/components/dashboard/StoriesTab";
import BlogsTab from "@/components/dashboard/BlogsTab";
import ReviewsTab from "@/components/dashboard/ReviewsTab";

type TabId = "overview" | "jobs" | "applications" | "profile" | "stories" | "blogs" | "reviews" | "advertise" | "myapplications";

interface TabMeta {
  id: TabId;
  label: string;
  recruiterOnly?: boolean;
  candidateOnly?: boolean;
}

const ALL_TABS: TabMeta[] = [
  { id: "overview", label: "Overview" },
  { id: "jobs", label: "My jobs", recruiterOnly: true },
  { id: "applications", label: "Applications", recruiterOnly: true },
  { id: "myapplications", label: "My applications", candidateOnly: true },
  { id: "profile", label: "Profile" },
  { id: "stories", label: "Stories", recruiterOnly: true },
  { id: "blogs", label: "Blogs", recruiterOnly: true },
  { id: "reviews", label: "Reviews", recruiterOnly: true },
  { id: "advertise", label: "Advertise", recruiterOnly: true },
];

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function RecruitmentDashboardShell({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const narrow = useIsNarrow();

  const isRecruiter = user.recruitmentRole === "recruiter";
  const isCandidate = user.recruitmentRole === "candidate";

  const tabs = useMemo(
    () =>
      ALL_TABS.filter((t) => {
        if (t.recruiterOnly && !isRecruiter) return false;
        if (t.candidateOnly && !isCandidate) return false;
        return true;
      }),
    [isRecruiter, isCandidate]
  );

  const tabParam = searchParams.get("tab") as TabId | null;
  const jobParam = searchParams.get("job");
  const active: TabId = tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : "overview";

  function setTab(id: TabId, jobId?: string) {
    const qs = new URLSearchParams();
    qs.set("tab", id);
    if (jobId) qs.set("job", jobId);
    router.replace(`/recruitment/dashboard?${qs.toString()}`, { scroll: false });
  }

  function renderActive() {
    switch (active) {
      case "overview":
        return isRecruiter ? <RecruiterOverview /> : <CandidateOverview />;
      case "jobs":
        return <MyJobsTab onViewApplications={(jobId) => setTab("applications", jobId)} />;
      case "applications":
        return <ApplicationsTab jobId={jobParam} />;
      case "myapplications":
        return <MyApplicationsTab />;
      case "profile":
        return isRecruiter ? <CompanyProfileTab /> : <CandidateProfileTab />;
      case "stories":
        return <StoriesTab user={user} product="recruitment" />;
      case "blogs":
        return <BlogsTab user={user} product="recruitment" />;
      case "reviews":
        return <ReviewsTab user={user} context="recruitment" />;
      case "advertise":
        return <AdvertisementsTab />;
      default:
        return null;
    }
  }

  const nav = (
    <nav
      className={narrow ? "no-scrollbar" : undefined}
      style={
        narrow
          ? { alignSelf: "stretch", width: "100%", maxWidth: "100%", minWidth: 0, display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain", paddingBottom: 4, borderBottom: "1px solid var(--border)", marginBottom: 20 }
          : { width: 200, flexShrink: 0, position: "sticky", top: 84, display: "flex", flexDirection: "column", gap: 2 }
      }
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            className={`counter-workspace-nav-item ${isActive ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: narrow ? "9px 14px" : "10px 12px",
              borderRadius: "var(--r-sm)",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: "var(--fs-sm)",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--tricolor-green-hover)" : "var(--muted)",
              background: isActive ? "var(--tricolor-green-tint)" : "transparent",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="counter-dashboard-page counter-recruitment-dashboard">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <Avatar name={user.name} src={user.avatarUrl} size={44} />
        <div>
          <div style={{ fontSize: "var(--fs-lg)", fontWeight: 700, color: "var(--ink)" }}>{user.name}</div>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
            {user.employerProfile?.companyName || [user.city, user.state].filter(Boolean).join(", ") || user.mobile}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", gap: 28, alignItems: "flex-start" }}>
        {tabs.length > 1 && nav}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>{renderActive()}</div>
      </div>
    </div>
  );
}
