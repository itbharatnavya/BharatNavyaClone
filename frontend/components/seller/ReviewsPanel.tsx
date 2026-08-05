"use client";

import React, { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { getReviews, postReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import Rating from "@/components/Rating";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";

export interface ReviewsPanelProps {
  sellerId: string;
  initialReviews?: Review[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "inline-flex", gap: 4 }} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-checked={value === n}
            role="radio"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#F59E0B" : "#E5E7EB"}>
              <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewsPanel({ sellerId, initialReviews }: ReviewsPanelProps) {
  const t = useTr();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [loading, setLoading] = useState(!initialReviews);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReviews(sellerId)
      .then((r) => {
        if (!cancelled) setReviews(r);
      })
      .catch((e) => {
        if (!cancelled) addToast(e instanceof Error ? e.message : "Failed to load reviews", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, addToast]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      addToast("Please select a rating", "info");
      return;
    }
    if (!reviewText.trim()) {
      addToast("Please write a short review", "info");
      return;
    }
    setSubmitting(true);
    try {
      const created = await postReview({
        sellerId,
        rating,
        reviewText: reviewText.trim(),
        title: title.trim() || undefined,
      });
      setReviews((prev) => [created, ...prev]);
      addToast(
        created.status === "pending"
          ? "Review submitted — it will appear after moderation."
          : "Thanks for your review!",
        "success"
      );
      setRating(0);
      setTitle("");
      setReviewText("");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not submit review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Post a review */}
      {user ? (
        <form onSubmit={submit} className="card card-flat card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="field-label">{t("reviews.yourRating", "Your rating")}</div>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <Input
            label={t("reviews.titleOptional", "Title (optional)")}
            placeholder="Summarise your experience"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={t("reviews.yourReview", "Your review")}
            placeholder="Share details about quality, communication, delivery…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t("reviews.submitting", "Submitting…") : t("reviews.submit", "Submit review")}
            </button>
          </div>
        </form>
      ) : (
        <div className="card card-flat card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{t("reviews.loginPrompt", "Log in to leave a review.")}</span>
          <a href="/login" className="btn btn-secondary btn-sm">
            {t("auth.login", "Log in")}
          </a>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1].map((i) => (
            <div key={i} className="skeleton" style={{ height: 92, width: "100%" }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
          {t("reviews.empty", "No reviews yet. Be the first to share your experience.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.id} className="card card-flat card-pad">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <Rating value={r.rating} size={14} showValue={false} />
                <span style={{ fontSize: 12, color: "var(--faint)" }}>{formatDate(r.createdAt)}</span>
              </div>
              {r.title && (
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginTop: 8 }}>{r.title}</div>
              )}
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "6px 0 0" }}>{r.reviewText}</p>
              <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>— {r.buyerName || "Buyer"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
