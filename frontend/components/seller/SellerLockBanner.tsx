"use client";

// Shown to a seller whose Directory seller profile is suspended or rejected (the person
// can still sign in; only the seller side is locked). Suspended: only an admin lifts it,
// so the one action is "Contact admin". Rejected: "Resubmit for review" sends the
// application back to pending. Wording is generic on purpose (no admin reason shown).

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { resubmitSeller } from "@/lib/api";
import { useToast } from "@/components/Toast";

const CONTACT_HREF =
  "/contact?topic=support&message=" +
  encodeURIComponent("My seller account needs a review. Please check it.") +
  "#write";

export function sellerLockOf(user: { sellerProfile?: { status?: string } | null } | null | undefined) {
  const s = user?.sellerProfile?.status;
  return s === "suspended" || s === "rejected" ? s : null;
}

export default function SellerLockBanner() {
  const { user, refresh } = useAuth();
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const lock = sellerLockOf(user);
  if (!lock) return null;

  async function resubmit() {
    setBusy(true);
    try {
      await resubmitSeller();
      await refresh();
      addToast("Sent for review. We will let you know once it is approved.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not resubmit. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="card"
      role="alert"
      style={{
        padding: 18,
        marginBottom: 20,
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap",
        borderColor: "var(--counter-line-strong)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "var(--counter-indigo-soft)",
          color: "var(--counter-indigo)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
      </span>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "var(--ink)" }}>
          {lock === "suspended" ? "Your seller account is suspended" : "Your seller application was rejected"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", marginTop: 2 }}>
          {lock === "suspended"
            ? "Your listings are hidden and seller tools are turned off. Please contact the admin."
            : "Your listings are hidden. Update your details and resubmit it for review."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {lock === "rejected" && (
          <button type="button" className="btn btn-primary btn-sm" onClick={resubmit} disabled={busy}>
            {busy ? "Sending…" : "Resubmit for review"}
          </button>
        )}
        <Link href={CONTACT_HREF} className={lock === "rejected" ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}>
          Contact admin
        </Link>
      </div>
    </div>
  );
}
