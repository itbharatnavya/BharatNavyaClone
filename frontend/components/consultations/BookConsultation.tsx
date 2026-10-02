"use client";

// Consultations — the book-a-consultation modal (a LEAD, never a payment).
// WHY: hiring an expert should feel like a quick, low-friction request, not a
// checkout. So this is a guest-friendly form (only name + mobile required) built on
// the shared Modal (backdrop click + Escape to close). If a package is passed it is
// shown as a read-only summary and its id is sent. The form NEVER dead-ends: it
// validates inline, disables while sending, then swaps to an in-modal success state,
// and surfaces any server error as an inline message.

import React, { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { bookConsultation } from "@/lib/api";
import type { BookingBody, ConsultationMode } from "@/lib/types";
import { CheckIcon, modeLabel, formatPrice } from "./icons";

export interface BookConsultationExpert {
  slug: string;
  name: string;
  // The delivery modes this expert offers — drives the Mode <select>. Optional so a
  // caller with only slug+name still works (falls back to all three modes).
  consultationModes?: ConsultationMode[];
}

export interface BookConsultationPackage {
  id: string;
  title: string;
  price: number;
  unit: string;
}

export interface BookConsultationProps {
  expert: BookConsultationExpert;
  package?: BookConsultationPackage | null;
  open: boolean;
  onClose: () => void;
}

const TIME_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const ALL_MODES: ConsultationMode[] = ["video", "phone", "in-person"];

export default function BookConsultation({
  expert,
  package: pkg = null,
  open,
  onClose,
}: BookConsultationProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [mode, setMode] = useState("");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<{ name?: string; mobile?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nameRef = useRef<HTMLInputElement | null>(null);

  const modes = expert.consultationModes && expert.consultationModes.length > 0
    ? expert.consultationModes
    : ALL_MODES;

  // Reset the form each time the modal opens so a second booking starts clean, and
  // move focus to the first field for keyboard/AT users.
  useEffect(() => {
    if (!open) return;
    setName("");
    setMobile("");
    setEmail("");
    setPreferredDate("");
    setPreferredTime("");
    setMode("");
    setMessage("");
    setErrors({});
    setServerError(null);
    setSuccess(false);
    const t = window.setTimeout(() => nameRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    const digits = mobile.replace(/\D/g, "");
    if (!digits) next.mobile = "Please enter your mobile number.";
    else if (digits.length !== 10) next.mobile = "Enter a valid 10-digit mobile number.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setServerError(null);
    if (!validate()) return;

    const body: BookingBody = {
      expertSlug: expert.slug,
      name: name.trim(),
      mobile: mobile.replace(/\D/g, ""),
    };
    if (pkg) body.packageId = pkg.id;
    if (email.trim()) body.email = email.trim();
    if (preferredDate) body.preferredDate = preferredDate;
    if (preferredTime) body.preferredTime = preferredTime;
    if (mode) body.mode = mode;
    if (message.trim()) body.message = message.trim();

    setSubmitting(true);
    try {
      await bookConsultation(body);
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title = success ? "Request sent" : `Book ${expert.name}`;

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      {success ? (
        // ---- Success state (in-modal, never dead-ends) ----
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 16px",
              borderRadius: "var(--r-pill)",
              background: "var(--brand-tint)",
              color: "var(--success)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon size={28} />
          </div>
          <p style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            Request sent — {expert.name} will reach out.
          </p>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", margin: "8px auto 0", maxWidth: 380, lineHeight: 1.55 }}>
            We&apos;ve shared your contact details. Expect a response
            {pkg ? ` about “${pkg.title}”` : ""} shortly.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 22 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* ---- Package summary (read-only) ---- */}
          {pkg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                background: "var(--brand-tint)",
                border: "1px solid #bfdbfe",
                borderRadius: "var(--r-sm)",
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: "var(--fs-sm)",
                color: "var(--brand-hover)",
              }}
            >
              <span style={{ fontWeight: 600 }}>Booking:</span>
              <span className="line-clamp-1" style={{ minWidth: 0 }}>{pkg.title}</span>
              <span style={{ fontWeight: 700, marginLeft: "auto", flexShrink: 0 }}>
                {formatPrice(pkg.price)}{pkg.unit}
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name */}
            <div>
              <label className="field-label" htmlFor="bc-name">Name *</label>
              <input
                id="bc-name"
                ref={nameRef}
                className={["input", errors.name ? "input-error" : ""].filter(Boolean).join(" ")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>

            {/* Mobile + Email — two up on wider screens */}
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <div>
                <label className="field-label" htmlFor="bc-mobile">Mobile *</label>
                <input
                  id="bc-mobile"
                  className={["input", errors.mobile ? "input-error" : ""].filter(Boolean).join(" ")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  autoComplete="tel"
                />
                {errors.mobile && <div className="field-error">{errors.mobile}</div>}
              </div>
              <div>
                <label className="field-label" htmlFor="bc-email">Email</label>
                <input
                  id="bc-email"
                  className={["input", errors.email ? "input-error" : ""].filter(Boolean).join(" ")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                />
                {errors.email && <div className="field-error">{errors.email}</div>}
              </div>
            </div>

            {/* Preferred date + time */}
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <div>
                <label className="field-label" htmlFor="bc-date">Preferred date</label>
                <input
                  id="bc-date"
                  type="date"
                  className="input"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="bc-time">Preferred time</label>
                <select
                  id="bc-time"
                  className="select"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="field-label" htmlFor="bc-mode">Consultation mode</label>
              <select
                id="bc-mode"
                className="select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="">No preference</option>
                {modes.map((m) => (
                  <option key={m} value={m}>{modeLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="field-label" htmlFor="bc-message">What do you need help with?</label>
              <textarea
                id="bc-message"
                className="textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly describe your requirement (optional)"
                rows={3}
              />
            </div>

            {serverError && (
              <div
                role="alert"
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--error)",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--r-sm)",
                  padding: "10px 12px",
                }}
              >
                {serverError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>

            <p style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", margin: 0, textAlign: "center" }}>
              No payment now — this sends your request to the expert.
            </p>
          </div>
        </form>
      )}
    </Modal>
  );
}
