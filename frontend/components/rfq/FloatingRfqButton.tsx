"use client";

// FloatingRfqButton — a persistent "Post a requirement" trigger for Directory
// pages, sitting immediately left of ChatAssistant's floating bubble
// (components/ChatAssistant.tsx) at the same size/position rhythm so the two
// read as a matched pair. Modelled on ofbusiness.com's sticky "Tell us your
// Requirement" corner widget: NOT a centered page-blocking modal — clicking
// it opens an anchored panel that grows from the button's own bottom-right
// corner, exactly like ChatAssistant's own chat panel does, so the two
// widgets feel like one consistent system rather than two different UI
// patterns bolted together. Only one of the two need be open at a time in
// normal use; if both were open simultaneously they can overlap since this
// intentionally doesn't reach into ChatAssistant to coordinate that (out of
// scope — "ignore AI assistant for now").
//
// Same underlying flow as the standalone /rfq page — free-text need ->
// "Draft with AI" or "Fill manually" -> the same structured RfqForm ->
// submit — reusing components/rfq/RfqForm.tsx and the same API calls, just
// inside this docked panel instead of a full route or a centered Modal.

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { aiRfq, postInquiry } from "@/lib/api";
import { useCategories } from "@/lib/catalog";
import { isDirectoryPage } from "@/lib/directoryPaths";
import Button from "@/components/Button";
import Textarea from "@/components/Textarea";
import RfqForm, { EMPTY_RFQ, type RfqFormState } from "@/components/rfq/RfqForm";

function RequirementIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3.5h6a1 1 0 011 1V5h1.5A1.5 1.5 0 0119 6.5v13A1.5 1.5 0 0117.5 21h-11A1.5 1.5 0 015 19.5v-13A1.5 1.5 0 016.5 5H8v-.5a1 1 0 011-1z" />
      <path d="M9 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M8.5 12h7M8.5 15.5h5" />
      <path d="M8.5 9h3" />
    </svg>
  );
}
function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function FloatingRfqButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [open, setOpen] = useState(false);
  // Shared session-wide via CatalogProvider (lib/catalog.tsx) instead of
  // fetching its own copy on first open.
  const { categories } = useCategories();

  const [need, setNeed] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [form, setForm] = useState<RfqFormState>(EMPTY_RFQ);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const patch = (p: Partial<RfqFormState>) => setForm((f) => ({ ...f, ...p }));

  // Close on route change, same as ChatAssistant — navigating away via a link
  // inside the page underneath should feel clean, not leave a stale panel up.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const draft = async () => {
    if (!need.trim()) {
      addToast("Describe what you need first.", "error");
      return;
    }
    setDrafting(true);
    try {
      const d = await aiRfq(need.trim());
      setForm({
        productName: d.productName || "",
        categorySlug: d.categorySlug || "",
        quantity: d.quantity != null ? String(d.quantity) : "",
        unit: d.unit || "",
        targetPrice: d.targetPrice != null ? String(d.targetPrice) : "",
        deliveryLocation: d.deliveryLocation || "",
        timeline: d.timeline || "",
        details: d.details || d.formattedRfq || need.trim(),
      });
      setIsFallback(!!d.fallback);
      setShowForm(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not draft your requirement.", "error");
    } finally {
      setDrafting(false);
    }
  };

  const editManually = () => {
    setForm((f) => ({ ...f, details: f.details || need.trim() }));
    setIsFallback(false);
    setShowForm(true);
  };

  const submit = async () => {
    if (!user) {
      // Send them back to wherever they were, not off to a standalone page —
      // the panel/draft can't survive a full navigation either way, but at
      // least they land back on the listing/category they were browsing.
      router.push(`/login?next=${encodeURIComponent(pathname || "/directory")}`);
      return;
    }
    const productName = form.productName.trim() || need.trim();
    if (!productName) {
      addToast("Add what you're looking for.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const qty = [form.quantity.trim(), form.unit.trim()].filter(Boolean).join(" ");
      const meta: string[] = [];
      if (qty) meta.push(`Quantity: ${qty}`);
      if (form.targetPrice.trim()) meta.push(`Target price: ₹${form.targetPrice.trim()}`);
      if (form.deliveryLocation.trim()) meta.push(`Delivery to: ${form.deliveryLocation.trim()}`);
      if (form.timeline.trim()) meta.push(`Timeline: ${form.timeline.trim()}`);
      const message = [form.details.trim() || need.trim(), meta.join("\n")].filter(Boolean).join("\n\n");

      await postInquiry({
        productName,
        categoryId: form.categorySlug || null,
        quantity: qty,
        message,
        buyerName: user.name,
        buyerMobile: user.mobile,
        buyerEmail: user.email,
        kind: "rfq",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      setSubmitted(true);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not send your requirement.", "error");
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setSubmitted(false);
    setSubmitting(false);
    setShowForm(false);
    setIsFallback(false);
    setForm(EMPTY_RFQ);
    setNeed("");
  };

  // Placed after every hook so hook order stays stable across the pathname
  // changes that flip this — same pattern ChatAssistant's own feature flag
  // check uses.
  if (!isDirectoryPage(pathname) || pathname === "/rfq") {
    return null;
  }

  return (
    <>
      {/* Trigger — icon-only circle on mobile (matches the chat bubble's own
          footprint so the pair stays tight on narrow screens); a labelled
          pill on desktop, where there's room to say what it actually does
          instead of relying on an icon alone. Right edge is pinned to the
          same X position in both states, so the panel below (anchored to
          that same edge) always opens directly above it. */}
      {!open && (
        <button
          type="button"
          aria-label="Post a requirement — tell us what you need"
          title="Post a requirement"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-[5.25rem] z-[119] inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full text-white shadow-pop transition-transform hover:scale-105 active:scale-95 sm:w-auto sm:px-5"
          style={{ background: "var(--brand)" }}
        >
          <RequirementIcon />
          <span className="hidden text-sm font-semibold sm:inline">Post Requirement</span>
        </button>
      )}

      {/* Panel — anchored to the trigger's own corner, full-width sheet on
          mobile (same breakpoints/shape as ChatAssistant's panel). */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post a requirement"
          className="fixed z-[120] flex flex-col overflow-hidden border border-border bg-surface shadow-pop
                     inset-x-3 bottom-3 max-h-[78vh] rounded-2xl
                     sm:inset-x-auto sm:bottom-5 sm:right-[5.25rem] sm:w-[380px] sm:max-w-[calc(100vw-2.5rem)] sm:h-[560px] sm:max-h-[calc(100vh-2.5rem)]"
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center gap-2.5 px-4 py-3 text-white" style={{ background: "var(--brand)" }}>
            <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
              <RequirementIcon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">
                {submitted ? "Requirement sent" : "Tell us what you need"}
              </div>
              <div className="text-[11px] leading-tight text-white/80">
                {submitted ? "We'll take it from here" : "We'll match you with verified suppliers"}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={resetAndClose}
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ background: "var(--bg-subtle)" }}>
            {submitted ? (
              <div className="flex flex-col items-center py-4 text-center">
                <span style={{ color: "var(--success)", lineHeight: 0 }}>
                  <CheckCircleIcon />
                </span>
                <p className="mt-3.5 text-[13.5px] leading-relaxed text-muted">
                  Your requirement was sent to matching suppliers — they&apos;ll contact you soon
                  with quotes.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button variant="brand" size="sm" href="/dashboard">
                    Go to dashboard
                  </Button>
                  <Button variant="secondary" size="sm" onClick={resetAndClose}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <Textarea
                    label="Describe what you need"
                    placeholder="e.g. 500 kg stainless steel 304 sheets, Mumbai, ~₹50,000, within 2 weeks."
                    value={need}
                    onChange={(e) => setNeed(e.target.value)}
                    style={{ minHeight: 80 }}
                  />
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button variant="brand" size="sm" onClick={draft} disabled={drafting}>
                      {drafting ? (
                        "Drafting…"
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <SparkleIcon />
                          Draft with AI
                        </span>
                      )}
                    </Button>
                    {!showForm && (
                      <Button variant="ghost" size="sm" onClick={editManually}>
                        Fill manually
                      </Button>
                    )}
                  </div>
                </div>

                {showForm && (
                  <div className="border-t border-border pt-4">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="text-[13.5px] font-semibold text-ink">Your requirement</h3>
                      {isFallback && <span className="text-[11px] text-faint">AI draft</span>}
                    </div>
                    <RfqForm value={form} onChange={patch} categories={categories} />
                    {!user && (
                      <p className="mt-3.5 text-[12px] text-muted">
                        You&apos;ll be asked to log in to send this requirement.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky submit — only once there's a form to submit. */}
          {!submitted && showForm && (
            <div className="flex-shrink-0 border-t border-border bg-surface px-4 py-3">
              <Button variant="primary" onClick={submit} disabled={submitting} block>
                {submitting ? "Sending…" : "Send to matching suppliers"}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
