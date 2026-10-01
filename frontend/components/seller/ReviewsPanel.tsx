"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Review } from "@/lib/types";
import { getReviews, postReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/components/discovery/hooks";
import { useToast } from "@/components/Toast";
import Rating from "@/components/Rating";
import Textarea from "@/components/Textarea";

export interface ReviewsPanelProps {
  sellerId: string;
  initialReviews?: Review[];
}

// Initial reviews shown, and how many more each "Load more" click reveals.
const PAGE_SIZE = 6;

type SortOrder = "newest" | "oldest";

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

function hasMessage(r: Review): boolean {
  return !!r.reviewText && !!r.reviewText.trim();
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#3B6CF5" : "#E5E7EB"}>
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
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [ratingFilter, setRatingFilter] = useState(0); // 0 = all
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReviews(sellerId, "directory")
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

  // One review per buyer per seller (backend upserts on the same pair) — if
  // this visitor already has one, the form edits it in place instead of
  // offering to add a second.
  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.buyerId === user.id) : undefined),
    [reviews, user]
  );

  // Pre-fill the form with the visitor's existing review, once, the first
  // time it's known — not on every `reviews` change afterward, or a
  // post-submit state update would clobber whatever they're about to type.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || loading) return;
    seededRef.current = true;
    if (myReview) {
      setRating(myReview.rating);
      setReviewText(myReview.reviewText || "");
    }
  }, [loading, myReview]);

  // Only reviews with an actual message are ever listed — a star-only rating
  // still counts toward the seller's overall score (see backend
  // lib/sellerRating.js), it just has nothing to show here.
  const messaged = useMemo(() => reviews.filter(hasMessage), [reviews]);

  const filtered = useMemo(
    () => (ratingFilter ? messaged.filter((r) => r.rating === ratingFilter) : messaged),
    [messaged, ratingFilter]
  );

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const da = Date.parse(a.createdAt) || 0;
      const db = Date.parse(b.createdAt) || 0;
      return sortOrder === "newest" ? db - da : da - db;
    });
    return arr;
  }, [filtered, sortOrder]);

  // Restart pagination whenever the filter/sort changes so "Load more" always
  // starts from a fresh first page of the new view.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [ratingFilter, sortOrder]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
  // Once expanded past the first page, the list becomes a bounded scroll
  // area instead of growing the page indefinitely.
  const scrolling = visibleCount > PAGE_SIZE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      addToast("Please select a rating", "info");
      return;
    }
    const isEdit = !!myReview;
    setSubmitting(true);
    try {
      const created = await postReview({
        sellerId,
        context: "directory",
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      // The backend upserts on (buyer, seller) — `created` has the SAME id
      // as the existing review when this was an edit, so replace rather than
      // append (avoids showing the same review twice).
      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      addToast(
        isEdit
          ? "Review updated."
          : hasMessage(created)
          ? "Review submitted — thanks for sharing!"
          : "Thanks for the rating!",
        "success"
      );
      // Leave the form showing what was just saved (now editable again) —
      // only one review per buyer is allowed, so there's no "add another".
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
          {myReview && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              {t("reviews.editingYours", "You've already reviewed this seller — edit it below.")}
            </p>
          )}
          <div>
            <div className="field-label">{t("reviews.yourRating", "Your rating")}</div>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <Textarea
            label={t("reviews.yourReviewOptional", "Your review (optional)")}
            placeholder="Share details about quality, communication, delivery…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? t("reviews.submitting", "Submitting…")
                : myReview
                ? t("reviews.update", "Update review")
                : t("reviews.submit", "Submit review")}
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
      ) : messaged.length === 0 ? (
        <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
          {t("reviews.noWritten", "No written reviews yet — be the first to add a comment.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Filter (by rating) + sort (freshness) — native selects, matches
              the app-wide filter convention (Filters.tsx). */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="select"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              aria-label={t("reviews.filterByRating", "Filter by rating")}
              style={{ maxWidth: 160 }}
            >
              <option value={0}>{t("reviews.allRatings", "All ratings")}</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n > 1 ? t("reviews.stars", "stars") : t("reviews.star", "star")}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label={t("reviews.sortBy", "Sort by")}
              style={{ maxWidth: 160 }}
            >
              <option value="newest">{t("reviews.newestFirst", "Newest first")}</option>
              <option value="oldest">{t("reviews.oldestFirst", "Oldest first")}</option>
            </select>
            <span style={{ fontSize: 13, color: "var(--faint)", marginLeft: "auto" }}>
              {sorted.length} {sorted.length === 1 ? t("reviews.review", "review") : t("reviews.reviewsPlural", "reviews")}
            </span>
          </div>

          {sorted.length === 0 ? (
            <div className="card card-flat card-pad" style={{ textAlign: "center", color: "var(--muted)" }}>
              {t("reviews.noMatch", "No reviews match this filter.")}
            </div>
          ) : (
            <>
              <div
                className="no-scrollbar"
                style={
                  scrolling
                    ? { display: "flex", flexDirection: "column", gap: 12, maxHeight: 560, overflowY: "auto", paddingRight: 4 }
                    : { display: "flex", flexDirection: "column", gap: 12 }
                }
              >
                {visible.map((r) => (
                  <div key={r.id} className="card card-flat card-pad">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Rating value={r.rating} size={14} showValue={false} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--faint)" }}>{formatDate(r.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "8px 0 0" }}>{r.reviewText}</p>
                    <div style={{ fontSize: 13, color: "var(--faint)", marginTop: 10 }}>— {r.buyerName || "Buyer"}</div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  style={{ alignSelf: "center" }}
                >
                  {t("reviews.loadMore", "Load more reviews")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
