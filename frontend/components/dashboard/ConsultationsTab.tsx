"use client";

// ConsultationsTab — the EXPERT side of the Consultations product. Where the buyer
// "Book a consultation" flow ENDS UP: every request for THIS expert lands here so
// they can act on it. WHY a dedicated tab (not "Leads"): a consultation request
// carries a preferred date/time, a chosen package and a consultation mode — none of
// which a product lead has — and the primary action is to CALL the person back, so
// each row surfaces one-tap Call / WhatsApp using the buyer's mobile. Read-only over
// GET /api/consultations/bookings; no payment anywhere (lead model).

import React, { useEffect, useMemo, useState } from "react";
import type { User, ConsultationBooking } from "@/lib/types";
import { getMyConsultationBookings } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Badge from "@/components/Badge";
import {
  PanelHeader,
  StatCard,
  EmptyState,
  Loading,
  timeAgo,
  formatDate,
  useTr,
} from "./shared";

interface Props {
  user: User;
}

// Inline line-glyphs (no emoji) — kept local so shared.tsx's icon set stays a
// shared contract we don't edit here.
function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}
function PhoneIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
function ChatIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-4-1L3 20l1.3-4.4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" />
    </svg>
  );
}
function ClockIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function VideoIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10 6-3.5v11L15.5 14" />
    </svg>
  );
}
function PinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.8" />
    </svg>
  );
}

const MODE_LABEL: Record<string, string> = {
  video: "Video call",
  phone: "Phone call",
  "in-person": "In-person",
};

// A single labelled meta chip (icon + text). Muted, wraps cleanly on mobile.
function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", minWidth: 0 }}>
      <span style={{ color: "var(--faint)", display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </span>
  );
}

function preferredWhen(b: ConsultationBooking): string | null {
  const d = b.preferredDate ? formatDate(b.preferredDate) : null;
  const t = b.preferredTime && b.preferredTime.toLowerCase() !== "any" ? b.preferredTime : null;
  if (d && t) return `${d} · ${t}`;
  if (d) return d;
  if (t) return t;
  return null;
}

export default function ConsultationsTab({ user }: Props) {
  void user;
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyConsultationBookings();
        if (alive) setBookings(Array.isArray(res) ? res : []);
      } catch (e) {
        if (alive) addToast((e as Error).message || "Failed to load consultation requests", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [addToast]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const fresh = bookings.filter((b) => (b.status || "new") === "new").length;
    const withPackage = bookings.filter((b) => !!b.packageTitle).length;
    return { total, fresh, withPackage };
  }, [bookings]);

  if (loading) return <Loading label={tr("dashboard.consultations.loading", "Loading consultation requests…")} />;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.consultations.title", "Consultation requests")}
        subtitle={tr(
          "dashboard.consultations.subtitle",
          "People who asked to book you through BharatSource Consultations. Reach out to confirm — there's no payment step."
        )}
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={26} />}
          title={tr("dashboard.consultations.empty.title", "No requests yet")}
          subtitle={tr(
            "dashboard.consultations.empty.subtitle",
            "When a buyer books a consultation or a package from your profile, their request — with their contact details and preferred time — will appear here."
          )}
        />
      ) : (
        <>
          {/* Snapshot */}
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              marginBottom: 22,
            }}
          >
            <StatCard label="Total requests" value={stats.total} icon={<CalendarIcon />} />
            <StatCard label="New" value={stats.fresh} accent="var(--action)" hint="Not yet actioned" />
            <StatCard label="Package requests" value={stats.withPackage} hint="Asked for a specific package" />
          </div>

          {/* Requests */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map((b) => {
              const when = preferredWhen(b);
              const modeLabel = b.mode ? MODE_LABEL[b.mode] || b.mode : null;
              const tel = (b.mobile || "").replace(/[^\d+]/g, "");
              const wa = tel.replace(/^\+/, "");
              return (
                <div key={b.id} className="card card-flat" style={{ padding: 18, minWidth: 0 }}>
                  {/* Header row: who + when it came in + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{b.name}</span>
                        {(b.status || "new") === "new" && <Badge variant="new">New</Badge>}
                      </div>
                      {b.packageTitle ? (
                        <div style={{ fontSize: 13.5, color: "var(--brand)", fontWeight: 600, marginTop: 3 }}>
                          {b.packageTitle}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 3 }}>General consultation</div>
                      )}
                    </div>
                    <span style={{ fontSize: 12.5, color: "var(--faint)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {timeAgo(b.createdAt)}
                    </span>
                  </div>

                  {/* Message */}
                  {b.message && (
                    <p style={{ fontSize: 14, color: "var(--ink)", margin: "12px 0 0", lineHeight: 1.55 }}>
                      “{b.message}”
                    </p>
                  )}

                  {/* Meta chips: preferred time, mode, email */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 12 }}>
                    {when && <Meta icon={<ClockIcon />}>{when}</Meta>}
                    {modeLabel && (
                      <Meta icon={b.mode === "in-person" ? <PinIcon /> : b.mode === "video" ? <VideoIcon /> : <PhoneIcon />}>
                        {modeLabel}
                      </Meta>
                    )}
                    {b.email && <Meta icon={<ChatIcon />}>{b.email}</Meta>}
                  </div>

                  {/* Actions: one-tap Call / WhatsApp the buyer */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, alignItems: "center" }}>
                    <a href={`tel:${tel}`} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <PhoneIcon size={15} />
                      Call {b.mobile}
                    </a>
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                    >
                      <ChatIcon size={15} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
