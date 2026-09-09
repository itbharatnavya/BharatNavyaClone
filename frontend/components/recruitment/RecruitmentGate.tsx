"use client";

// RecruitmentGate — wraps every Recruitment-reachable page. Shows the real page once
// featureFlags.recruitmentLive is true, otherwise (including while the config fetch is
// still loading — the safe default) shows RecruitmentComingSoon instead. This must be
// applied at EVERY entry point, not just /recruitment itself: /job/[id], /post-job and
// /employer/[slug] sit outside the /recruitment/* URL tree, so a shared layout can't
// cover them — see RECRUITMENT.md §5.
//
// Deliberately a client-side gate, not a redirect: a deep link to a specific job/
// employer page while the flag is off should still render "Coming soon" at that exact
// URL, not 404 or bounce elsewhere.

import React from "react";
import { useConfig } from "@/lib/config";
import RecruitmentComingSoon from "./RecruitmentComingSoon";

export default function RecruitmentGate({ children }: { children: React.ReactNode }) {
  const { featureFlags } = useConfig();
  const designPreview = process.env.NEXT_PUBLIC_RECRUITMENT_DESIGN_PREVIEW === "true";
  if (!designPreview && !featureFlags.recruitmentLive) {
    return <RecruitmentComingSoon />;
  }
  return <>{children}</>;
}
