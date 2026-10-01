"use client";

// Recruitment is a live product in the current Bharat Navya (Home, Directory,
// Recruitment), so its pages always render. This wrapper stays as the single place
// every Recruitment entry point passes through (/recruitment/*, /job/[id], /post-job,
// /employer/[slug]); the old "Coming soon" screen belonged to the earlier suite build
// and is no longer shown.

import React from "react";

export default function RecruitmentGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
