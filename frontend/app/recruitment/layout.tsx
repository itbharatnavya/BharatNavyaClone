"use client";

// Covers /recruitment, /recruitment/jobs, /recruitment/dashboard (and any future
// /recruitment/* route) with one shared RecruitmentGate — /job/[id], /post-job and
// /employer/[slug] sit outside this URL tree and carry their own gate directly.

import type { ReactNode } from "react";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";

export default function RecruitmentLayout({ children }: { children: ReactNode }) {
  return <RecruitmentGate>{children}</RecruitmentGate>;
}
