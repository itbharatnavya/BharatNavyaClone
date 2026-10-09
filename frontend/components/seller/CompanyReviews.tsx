"use client";

// Company profile (/seller/[slug]) reviews: the rating summary, a "Write a review" form and the
// written reviews. Brings back the review-writing flow the old ReviewsPanel had (dropped in the
// redesign), in the profile's own styles. Rules come from the backend (routes/reviews): you must
// be logged in, you can't review your own company, and there's one review per person per company
// (sending again updates it). Reviews go live straight away. Guests get the inline sign-in modal
// and land back on the open form. A star-only rating counts toward the score but isn't listed.
// After a save the page refetches the profile so the rating in the header stays in sync.
// Styles: .cr-* in app/counter-soft-system.css.

import { useEffect, useMemo, useState } from "react";
import type { Review } from "@/lib/types";
import { getReviews, postReview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import ContactAuthModal from "@/components/auth/ContactAuthModal";

const PAGE = 5;
const STAR = "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z";

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  return <span className={`cr-stars is-${size}`} aria-hidden>
    {[1, 2, 3, 4, 5].map((n) => <svg key={n} viewBox="0 0 24 24" className={value >= n - 0.25 ? "is-on" : value >= n - 0.75 ? "is-half" : undefined}><path d={STAR} /></svg>)}
  </span>;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Below average", "Okay", "Good", "Excellent"];
  const shown = hover || value;
  return <div className="cr-picker">
    <div role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
        className={shown >= n ? "is-on" : undefined} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
        <svg viewBox="0 0 24 24"><path d={STAR} /></svg>
      </button>)}
    </div>
    <span aria-live="polite">{shown ? labels[shown] : "Tap a star"}</span>
  </div>;
}

const date = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

export default function CompanyReviews({ sellerId, companyName, rating, reviewCount, onChanged }: {
  sellerId: string;
  companyName: string;
  rating?: number;
  reviewCount?: number;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState(0);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [count, setCount] = useState(PAGE);

  useEffect(() => {
    let live = true;
    setLoading(true);
    getReviews(sellerId, "directory").then((list) => { if (live) setReviews(list); }).catch(() => {}).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [sellerId]);

  const own = Boolean(user && user.id === sellerId);
  const mine = useMemo(() => (user ? reviews.find((r) => r.buyerId === user.id) : undefined), [reviews, user]);
  const written = useMemo(() => reviews.filter((r) => r.reviewText && r.reviewText.trim()), [reviews]);
  const list = useMemo(() => {
    const rows = filter ? written.filter((r) => r.rating === filter) : written.slice();
    rows.sort((a, b) => sort === "highest" ? b.rating - a.rating : sort === "lowest" ? a.rating - b.rating : (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    return rows;
  }, [written, filter, sort]);
  useEffect(() => setCount(PAGE), [filter, sort]);

  // Opening the form seeds it with the visitor's existing review, if any (edit in place).
  function openForm() {
    if (!user) { setAuthOpen(true); return; }
    setStars(mine?.rating || 0);
    setText(mine?.reviewText || "");
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (stars < 1) { addToast("Choose a star rating first.", "info"); return; }
    setSaving(true);
    try {
      const saved = await postReview({ sellerId, context: "directory", rating: stars, reviewText: text.trim() || undefined });
      setReviews((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      addToast(mine ? "Review updated." : "Thanks, your review is live.", "success");
      setFormOpen(false);
      onChanged?.();
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Could not save your review.", "error");
    } finally {
      setSaving(false);
    }
  }

  const score = typeof rating === "number" && rating > 0 ? rating : 0;
  const total = reviewCount || 0;

  return <section className="cp-block cr" aria-labelledby="cp-reviews" id="reviews">
    <div className="cr-head">
      <h2 id="cp-reviews">Reviews</h2>
      {!own && !formOpen && <button type="button" className="cp-button" onClick={openForm}>
        <svg aria-hidden viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="m13.5 6.5 4 4" /></svg>
        {mine ? "Edit your review" : "Write a review"}
      </button>}
    </div>

    <div className="cr-summary">
      <strong>{score ? score.toFixed(1) : "–"}</strong>
      <div>
        <Stars value={score} />
        <span>{total ? `Based on ${total.toLocaleString("en-IN")} ${total === 1 ? "rating" : "ratings"}` : "No ratings yet"}</span>
      </div>
    </div>

    {formOpen && !own && <form className="cr-form" onSubmit={submit}>
      <p className="cr-form-title">{mine ? "Edit your review" : `Rate ${companyName}`}</p>
      <StarPicker value={stars} onChange={setStars} />
      <label className="cr-field">
        <span>Your review <small>(optional)</small></span>
        <textarea rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="How was the quality, communication and delivery?" />
      </label>
      <div className="cr-form-actions">
        <button type="submit" className="cp-button" disabled={saving}>{saving ? "Saving…" : mine ? "Update review" : "Post review"}</button>
        <button type="button" className="cp-button is-quiet" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
      </div>
      <small className="cr-form-note">Your name shows with your review. You can edit it later.</small>
    </form>}

    {loading ? <div className="cr-skeleton" aria-label="Loading reviews"><span /><span /></div>
      : written.length === 0 ? <p className="cp-empty">{own ? "No written reviews yet." : "No written reviews yet. Worked with them? Be the first to write one."}</p>
      : <>
        <div className="cr-tools">
          <select value={filter} onChange={(e) => setFilter(Number(e.target.value))} aria-label="Filter by rating">
            <option value={0}>All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort reviews">
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
          <span>{list.length} {list.length === 1 ? "review" : "reviews"}</span>
        </div>
        {list.length === 0 ? <p className="cp-empty">No reviews with this rating.</p> : <ul className="cr-list" role="list">
          {list.slice(0, count).map((r) => <li key={r.id}>
            <div className="cr-item-head">
              <span className="cr-avatar" aria-hidden>{(r.buyerName || "B").charAt(0).toUpperCase()}</span>
              <div><strong>{r.buyerName || "Buyer"}{user && r.buyerId === user.id ? <em>You</em> : null}</strong><small>{date(r.createdAt)}</small></div>
              <span className="cr-item-rating"><Stars value={r.rating} size="sm" /><span className="sr-only">{r.rating} out of 5</span></span>
            </div>
            <p>{r.reviewText}</p>
          </li>)}
        </ul>}
        {count < list.length && <button type="button" className="cp-button is-quiet cr-more" onClick={() => setCount((c) => c + PAGE)}>Show more reviews</button>}
      </>}

    {authOpen && <ContactAuthModal open={authOpen} purpose="review" onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); setFormOpen(true); }} />}
  </section>;
}
