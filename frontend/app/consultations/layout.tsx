"use client";

// Covers /consultations and /consultations/[slug] (and any future
// /consultations/* route) with one shared ConsultationsGate — mirrors
// app/recruitment/layout.tsx's RecruitmentGate exactly.

import type { ReactNode } from "react";
import ConsultationsGate from "@/components/consultations/ConsultationsGate";

export default function ConsultationsLayout({ children }: { children: ReactNode }) {
  return <ConsultationsGate>{children}</ConsultationsGate>;
}
