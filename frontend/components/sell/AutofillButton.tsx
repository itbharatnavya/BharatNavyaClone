"use client";

// "✨ Auto-fill from photo" — calls aiAutofill({imageUrl, hint}) and hands the
// drafted fields (title/description/keywords/category) back to the sell form.
// When the backend has no ANTHROPIC_API_KEY it returns { fallback: true } with a
// keyword/category best-guess; we surface a subtle note in that case.

import React, { useState } from "react";
import { aiAutofill, type AiAutofillDraft } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function AutofillButton({
  hintContext,
  onDraft,
}: {
  hintContext?: string; // e.g. current title, to steer the fallback
  onDraft: (draft: AiAutofillDraft) => void;
}) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const run = async () => {
    if (!imageUrl.trim() && !hint.trim() && !hintContext) {
      addToast("Add a photo URL or a short hint first.", "error");
      return;
    }
    setLoading(true);
    setFallbackNote(null);
    try {
      const draft = await aiAutofill({
        imageUrl: imageUrl.trim() || undefined,
        hint: hint.trim() || hintContext || undefined,
      });
      onDraft(draft);
      if (draft.fallback) {
        setFallbackNote(
          draft.note ||
            "AI photo fill activates when ANTHROPIC_API_KEY is set. Filled a best-guess from keywords for now."
        );
      } else {
        addToast("Draft filled from your photo. Review and tweak.", "success");
        setOpen(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto-fill failed.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card card-flat"
      style={{
        padding: 14,
        marginBottom: 16,
        borderColor: open ? "var(--brand)" : "var(--border)",
        background: "linear-gradient(180deg, var(--brand-tint), #fff)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--brand)", flexShrink: 0 }}
              aria-hidden
            >
              <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" />
            </svg>
            Auto-fill from photo
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
            Paste a product/service photo URL — AI drafts the title, description &
            keywords.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-brand btn-sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Try it"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Photo URL</label>
          <input
            className="input"
            placeholder="https://…/product.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <label className="field-label" style={{ marginTop: 12 }}>
            Optional hint
          </label>
          <input
            className="input"
            placeholder="e.g. handmade cotton kurta, wholesale"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={run}
              disabled={loading}
            >
              {loading ? (
                "Drafting…"
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg
                    width="15"
                    height="15"
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
                  Generate draft
                </span>
              )}
            </button>
          </div>
          {fallbackNote && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12.5,
                color: "var(--warn)",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {fallbackNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
