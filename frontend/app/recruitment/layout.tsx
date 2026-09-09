"use client";

// Covers /recruitment, /recruitment/jobs, /recruitment/dashboard (and any future
// /recruitment/* route) with one shared RecruitmentGate — /job/[id], /post-job and
// /employer/[slug] sit outside this URL tree and carry their own gate directly.

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";

export default function RecruitmentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The public showcase must remain reviewable even when the backend config is
  // unavailable. Transactional Recruitment routes stay behind the existing
  // capability gate and never pretend that a disabled workflow is live.
  if (pathname === "/recruitment") return <>{children}</>;
  return <RecruitmentGate>{children}</RecruitmentGate>;
}
