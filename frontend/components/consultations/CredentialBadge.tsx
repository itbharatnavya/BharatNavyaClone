"use client";

// Consultations — the "Verified" credential pill.
// WHY its own component: trust is the entire pitch of an EXPERT directory, so the
// verified-credential signal appears on cards AND the profile header and must look
// identical in both. A small, self-contained shield+label keeps that consistent.

import React from "react";
import { ShieldCheckIcon } from "./icons";

export interface CredentialBadgeProps {
  // The registering body (ICAI, BCI, ICSI, …). When present we show
  // "Verified ICAI"; otherwise a plain "Verified".
  registrationBody?: string | null;
  size?: number; // shield px
  className?: string;
}

export default function CredentialBadge({
  registrationBody,
  size = 13,
  className = "",
}: CredentialBadgeProps) {
  return (
    <span className={["badge badge-verified", className].filter(Boolean).join(" ")}>
      <ShieldCheckIcon size={size} />
      {registrationBody ? `Verified ${registrationBody}` : "Verified"}
    </span>
  );
}
