"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { User, Review } from "@/lib/types";
import { getReviews, type ReviewContext } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Rating from "@/components/Rating";
import Avatar from "@/components/Avatar";
import { PanelHeader, EmptyState, Loading, StatCard, Icon, formatDate, useTr } from "./shared";

interface Props {
  user: User;
  // Which product's reviews to show. Directory dashboard omits it (defaults to
  // "directory"); the Recruitment dashboard passes "recruitment" so a user who is
  // both a seller and an employer sees only the right set in each place.
  context?: ReviewContext;
}

export default function ReviewsTab({ user, context = "directory" }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const isRecruitment = context === "recruitment";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getReviews(user.id, context);
        if (alive) setReviews(list);
      } catch (e) {
        addToast((e as Error).message || "Failed to load reviews", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user.id, context, addToast]);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.reviews.title", "Reviews about me")}
        subtitle={
          isRecruitment
            ? tr("dashboard.reviews.subtitleRecruitment", "What candidates are saying about hiring with your company.")
            : tr("dashboard.reviews.subtitle", "What buyers are saying about your business.")
        }
      />

      {loading ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<Icon name="reviews" size={22} />}
          title={tr("dashboard.reviews.empty", "No reviews yet")}
          subtitle={
            isRecruitment
              ? tr("dashboard.reviews.emptyHintRecruitment", "Reviews from candidates who applied to your roles will show here.")
              : tr("dashboard.reviews.emptyHint", "Reviews from buyers you've dealt with will show here.")
          }
        />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              label={tr("dashboard.reviews.avg", "Average rating")}
              value={avg.toFixed(1)}
              accent="#3B6CF5"
              icon={<Icon name="reviews" size={18} />}
              hint={tr("dashboard.reviews.outOf", "out of 5")}
            />
            <StatCard
              label={tr("dashboard.reviews.count", "Total reviews")}
              value={reviews.length}
              icon={<Icon name="profile" size={18} />}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map((r) => (
              <div key={r.id} className="card card-flat" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar name={r.buyerName} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                        {r.buyerName || "Buyer"}
                      </div>
                      <Rating value={r.rating} size={13} showValue={false} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--faint)" }}>{formatDate(r.createdAt)}</span>
                </div>
                {r.reviewText && (
                  <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>{r.reviewText}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
