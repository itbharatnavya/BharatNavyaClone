import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/components/about/company";

export const metadata: Metadata = {
  title: "Account suspended | Bharat Navya",
};

const CONTACT_HREF =
  "/contact?topic=support&message=" +
  encodeURIComponent("My account is suspended. Please review it.") +
  "#write";

// Shown when a suspended account tries to sign in, or is suspended while signed in.
// Deliberately generic: the reason is between the admin and the account owner.
export default function AccountSuspendedPage() {
  return (
    <div className="container-bs" style={{ paddingTop: 72, paddingBottom: 96 }}>
      <div
        className="card"
        role="alert"
        style={{ maxWidth: 520, margin: "0 auto", padding: 32, textAlign: "center" }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            width: 52,
            height: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "var(--counter-indigo-soft)",
            color: "var(--counter-indigo)",
            marginBottom: 16,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M5.7 5.7l12.6 12.6" />
          </svg>
        </span>
        <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 700, color: "var(--ink)", margin: "0 0 10px" }}>
          Your account is suspended
        </h1>
        <p style={{ color: "var(--muted)", margin: "0 auto 24px", maxWidth: 400, lineHeight: 1.6 }}>
          You cannot sign in right now. Please contact the admin and we will look into it.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={CONTACT_HREF} className="btn btn-primary">
            Contact admin
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
        {(COMPANY.email || COMPANY.phone) && (
          <p style={{ color: "var(--muted)", fontSize: "var(--fs-sm)", margin: "22px 0 0" }}>
            {COMPANY.email && <>Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></>}
            {COMPANY.email && COMPANY.phone && " · "}
            {COMPANY.phone && <>Phone <a href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}>{COMPANY.phone}</a></>}
          </p>
        )}
      </div>
    </div>
  );
}
