"use client";

// /rfq — "Post your requirement". Buyers describe what they need in free text,
// let AI draft a structured requirement (aiRfq), edit it, then submit as an
// inquiry that fans out to matching suppliers (postInquiry). Public page — the
// auth wall is deferred to submit time (redirect to /login?next=/rfq).
//
// This is a real static route, so it wins over the app/[category] catch-all —
// it's the target of the footer "Post an RFQ" link.

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { getCategories, aiRfq, postInquiry } from "@/lib/api";
import type { Category } from "@/lib/types";
import Button from "@/components/Button";
import Textarea from "@/components/Textarea";
import RfqForm, { EMPTY_RFQ, type RfqFormState } from "@/components/rfq/RfqForm";

function RfqInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { branding } = useConfig();
  const { t } = useT();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {
        /* non-fatal: the category select just stays empty */
      });
  }, []);

  // Arriving from search with "Post a requirement" pre-fills the free-text
  // box with what was searched — one-time, doesn't fight further edits.
  const [need, setNeed] = useState(() => searchParams.get("need") || "");
  const [drafting, setDrafting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [form, setForm] = useState<RfqFormState>(EMPTY_RFQ);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const patch = (p: Partial<RfqFormState>) => setForm((f) => ({ ...f, ...p }));

  // ---- AI draft: turn the free-text need into a structured requirement ----
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
      addToast("Draft ready — review and edit below.", "success");
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Could not draft your requirement.",
        "error"
      );
    } finally {
      setDrafting(false);
    }
  };

  const editManually = () => {
    setForm((f) => ({ ...f, details: f.details || need.trim() }));
    setIsFallback(false);
    setShowForm(true);
  };

  // ---- submit: require login, then create the inquiry ----
  const submit = async () => {
    if (!user) {
      router.push("/login?next=/rfq");
      return;
    }
    const productName = form.productName.trim() || need.trim();
    if (!productName) {
      addToast("Add what you're looking for.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const qty = [form.quantity.trim(), form.unit.trim()]
        .filter(Boolean)
        .join(" ");

      // The inquiries API persists productName/quantity/message + buyer info;
      // fold the extra context into the message so sellers see the full picture.
      const meta: string[] = [];
      if (qty) meta.push(`Quantity: ${qty}`);
      if (form.targetPrice.trim()) meta.push(`Target price: ₹${form.targetPrice.trim()}`);
      if (form.deliveryLocation.trim())
        meta.push(`Delivery to: ${form.deliveryLocation.trim()}`);
      if (form.timeline.trim()) meta.push(`Timeline: ${form.timeline.trim()}`);
      const message = [form.details.trim() || need.trim(), meta.join("\n")]
        .filter(Boolean)
        .join("\n\n");

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
      addToast(
        e instanceof Error ? e.message : "Could not send your requirement.",
        "error"
      );
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setShowForm(false);
    setIsFallback(false);
    setForm(EMPTY_RFQ);
    setNeed("");
  };

  // ---------- confirmation ----------
  if (submitted) {
    return (
      <div className="container-bs section-pad" style={{ maxWidth: 620 }}>
        <div className="card" style={{ padding: 34, textAlign: "center" }}>
          <div style={{ color: "var(--success)", lineHeight: 0 }}>
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-6" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 14 }}>
            Requirement sent
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
            Your requirement was sent to matching suppliers — they&apos;ll contact
            you soon with quotes.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <Button variant="brand" href="/dashboard">
              Go to dashboard
            </Button>
            <Button variant="secondary" onClick={reset}>
              Post another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- main ----------
  return (
    <div className="container-bs section-pad-sm" style={{ maxWidth: 760 }}>
      {/* Hero */}
      <div style={{ marginBottom: 8 }}>
        <span className="eyebrow">{t("cta.postRfq")}</span>
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
        Tell us what you need
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 8, marginBottom: 26, lineHeight: 1.55 }}>
        Describe your requirement in plain language and let AI turn it into a clear
        request. We&apos;ll send it to matching suppliers on{" "}
        {branding.siteName || "BharatSource"} so they can reach out with quotes.
      </p>

      {/* Describe what you need */}
      <div className="card" style={{ padding: 22 }}>
        <Textarea
          label="Describe what you need"
          placeholder="e.g. I need 500 kg of stainless steel 304 sheets in Mumbai, budget around ₹50,000, delivery within 2 weeks."
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          style={{ minHeight: 130 }}
        />
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button variant="brand" onClick={draft} disabled={drafting}>
            {drafting ? (
              "Drafting…"
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" />
                </svg>
                Draft with AI
              </span>
            )}
          </Button>
          {!showForm && (
            <Button variant="ghost" onClick={editManually}>
              Or fill in manually
            </Button>
          )}
        </div>
      </div>

      {/* Structured, editable requirement */}
      {showForm && (
        <div className="card" style={{ padding: 22, marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Your requirement</h2>
            {isFallback && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                AI draft (activates fully with ANTHROPIC_API_KEY)
              </span>
            )}
          </div>

          <RfqForm value={form} onChange={patch} categories={categories} />

          {!user && (
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
              You&apos;ll be asked to log in to send this requirement.
            </p>
          )}

          <div style={{ marginTop: 20 }}>
            <Button variant="primary" onClick={submit} disabled={submitting} block>
              {submitting ? "Sending…" : "Send to matching suppliers"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RfqPage() {
  return (
    <Suspense fallback={null}>
      <RfqInner />
    </Suspense>
  );
}
