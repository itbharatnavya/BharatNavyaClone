"use client";

// ConsultationsGate — wraps every Consultations-reachable page, mirroring
// RecruitmentGate.tsx exactly. Shows the real page once
// featureFlags.consultationsLive is true, otherwise (including while the
// config fetch is still loading — the safe default) shows
// ConsultationsComingSoon instead. A client-side gate, not a redirect: a
// deep link to /consultations/[slug] while the flag is off should still
// render "Coming soon" at that exact URL, not 404 or bounce elsewhere.

import React from "react";
import { useConfig } from "@/lib/config";
import ConsultationsComingSoon from "./ConsultationsComingSoon";

export default function ConsultationsGate({ children }: { children: React.ReactNode }) {
  const { featureFlags } = useConfig();
  if (!featureFlags.consultationsLive) {
    return <ConsultationsComingSoon />;
  }
  return <>{children}</>;
}
