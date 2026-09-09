"use client";

// EmployerReviewsSection — company reviews on the public employer profile
// (/employer/[slug]). The Recruitment analog of Directory's
// components/seller/ReviewsPanel.tsx: same generic reviews.json backend
// (GET/POST /api/reviews with targetUserId = the employer's user id — see
// RECRUITMENT.md "Reviews/stories/blogs are already generic"), same
// one-review-per-user upsert, filter/sort/load-more. Styled with Recruitment's
// --tricolor-green accent instead of Directory's blue.

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Review } from "@/lib/types";
import { getReviews, postReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import Rating from "@/components/Rating";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Textarea from "@/components/Textarea";

export interface EmployerReviewsSectionProps {
  /** The employer's user id (PublicEmployer.id). */
  targetUserId: string;
  companyName: string;
  /** Bubbles the live average + count up so the profile header can show it. */
  onAggregate?: (avg: number, count: number) => void;
}

const PAGE_SIZE = 6;
type SortOrder = "newest" | "oldest";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill={active ? "#F59E0B" : "#E5E7EB"}>
              <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function EmployerReviewsSection({ targetUserId, companyName, onAggregate }: EmployerReviewsSectionProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReviews(targetUserId, "recruitment")
      .then((r) => !cancelled && setReviews(r))
      .catch((e) => !cancelled && addToast(e instanceof Error ? e.message : "Failed to load reviews", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [targetUserId, addToast]);

  // Aggregate over EVERY review (star-only included), matching how Directory
  // scores a seller — report it up for the profile header.
  useEffect(() => {
    if (!onAggregate) return;
    const count = reviews.length;
    const avg = count ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
    onAggregate(Math.round(avg * 10) / 10, count);
  }, [reviews, onAggregate]);

  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.buyerId === user.id) : undefined),
    [reviews, user]
  );

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || loading) return;
    seededRef.current = true;
    if (myReview) {
      setRating(myReview.rating);
      setReviewText(myReview.reviewText || "");
    }
  }, [loading, myReview]);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [ratingFilter, sortOrder]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;
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
        targetUserId,
        context: "recruitment",
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      setReviews((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      addToast(
        isEdit ? "Review updated." : hasMessage(created) ? "Review submitted — thanks for sharing!" : "Thanks for the rating!",
        "success"
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Could not submit review", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="er-wrap">
      {user ? (
        <form onSubmit={submit} className="card card-flat er-form">
          {myReview && (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              You&apos;ve already reviewed {companyName} — edit it below.
            </p>
          )}
          <div>
            <div className="field-label">Your rating</div>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <Textarea
            label="Your review (optional)"
            placeholder={`Share what it's like to work with ${companyName} — hiring process, communication, culture…`}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
          />
          <div>
            <Button type="submit" variant="brand" disabled={submitting}>
              {submitting ? "Submitting…" : myReview ? "Update review" : "Submit review"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="card card-flat er-login">
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Log in to review this company.</span>
          <Button href="/login" variant="secondary" size="sm">Log in</Button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1].map((i) => (
            <div key={i} className="skeleton" style={{ height: 92, width: "100%", borderRadius: 12 }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card card-flat er-empty">
          No reviews yet. Be the first to share your experience with {companyName}.
        </div>
      ) : messaged.length === 0 ? (
        <div className="card card-flat er-empty">
          No written reviews yet — {reviews.length} {reviews.length === 1 ? "person has" : "people have"} rated this company.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="er-controls">
            <select
              className="select"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              aria-label="Filter by rating"
            >
              <option value={0}>All ratings</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} {n > 1 ? "stars" : "star"}</option>
              ))}
            </select>
            <select
              className="select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Sort by"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <span className="er-count">
              {sorted.length} {sorted.length === 1 ? "review" : "reviews"}
            </span>
          </div>

          {sorted.length === 0 ? (
            <div className="card card-flat er-empty">No reviews match this filter.</div>
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
                  <div key={r.id} className="card card-flat er-item">
                    <div className="er-item-head">
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <Avatar name={r.buyerName} size={32} />
                        <span className="line-clamp-1" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                          {r.buyerName || "Reviewer"}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>{formatDate(r.createdAt)}</span>
                    </div>
                    <Rating value={r.rating} size={14} showValue={false} />
                    <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "8px 0 0" }}>{r.reviewText}</p>
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
                  Load more reviews
                </button>
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .er-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .er-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 20px;
        }
        .er-login {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px 20px;
        }
        .er-empty {
          padding: 28px;
          text-align: center;
          color: var(--muted);
          font-size: 13.5px;
        }
        .er-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .er-controls :global(.select) {
          max-width: 160px;
        }
        .er-count {
          font-size: 13px;
          color: var(--faint);
          margin-left: auto;
        }
        .er-item {
          padding: 16px;
        }
        .er-item-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
