"use client";

// components/dashboard/PromoteTab.tsx — SELF-SERVE BOOSTS (seller side).
//
// A seller promotes one of their listings entirely with dropdowns (mobile-first,
// non-technical): pick a listing, a boost type, and a duration, then submit. The
// request POSTs to /api/boosts as PENDING and stays inert until an admin approves it
// (which applies the boost to the listing). Submitted requests appear below with a
// status badge (pending amber / active green / rejected grey). No emoji — inline SVG.

import React, { useEffect, useMemo, useState } from "react";
import type { User, Listing } from "@/lib/types";
import {
  getMyListings,
  getMyBoosts,
  createBoostRequest,
  type BoostRequest,
  type BoostType,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Select from "@/components/Select";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, useTr } from "./shared";

interface Props {
  user: User;
}

// The three boost products + a one-line description shown under the selector.
const BOOST_OPTIONS: { value: BoostType; label: string; desc: string }[] = [
  {
    value: "feature",
    label: "Feature listing",
    desc: "Highlighted, featured placement across the Directory for the chosen period.",
  },
  {
    value: "category_top",
    label: "Top of category",
    desc: "Pin your listing to the top of its category, above non-boosted results.",
  },
  {
    value: "rank",
    label: "Rank boost",
    desc: "Lift your listing higher in search results without featuring it.",
  },
];

const DURATION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "15", label: "15 days" },
  { value: "30", label: "30 days" },
];

// Status badge styling — pending = amber, active = green, rejected = grey.
function statusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "#DCFCE7", color: "#166534", label: "Active" };
    case "rejected":
      return { bg: "#F1F5F9", color: "#475569", label: "Rejected" };
    case "expired":
      return { bg: "#F1F5F9", color: "#475569", label: "Ended" };
    case "pending":
    default:
      return { bg: "#E3EBFF", color: "#1B3FA0", label: "Pending review" };
  }
}

export default function PromoteTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [boosts, setBoosts] = useState<BoostRequest[]>([]);

  // --- form ---
  const [listingId, setListingId] = useState("");
  const [boostType, setBoostType] = useState<BoostType>("feature");
  const [days, setDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);

  const loadBoosts = React.useCallback(async () => {
    try {
      setBoosts(await getMyBoosts());
    } catch (e) {
      addToast((e as Error).message || "Failed to load boost requests", "error");
    }
  }, [addToast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [listRes, boostRes] = await Promise.allSettled([
        getMyListings(),
        getMyBoosts(),
      ]);
      if (!alive) return;
      if (listRes.status === "fulfilled") setListings(listRes.value || []);
      if (boostRes.status === "fulfilled") setBoosts(boostRes.value);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  const listingOptions = useMemo(
    () => [
      { value: "", label: "Select one of your listings…" },
      // Only a live listing can be boosted (the API refuses anything else).
      ...listings.filter((l) => l.status === "active").map((l) => ({ value: l.id, label: l.title })),
    ],
    [listings]
  );

  const activeBoostDesc =
    BOOST_OPTIONS.find((o) => o.value === boostType)?.desc || "";
  const titleById = useMemo(
    () => new Map(listings.map((l) => [l.id, l.title])),
    [listings]
  );

  const canSubmit = listingId !== "" && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createBoostRequest({
        listingId,
        boostType,
        days: Number(days),
      });
      addToast(
        tr(
          "dashboard.promote.submitted",
          "Submitted — an admin will review it."
        ),
        "success"
      );
      setListingId("");
      setBoostType("feature");
      setDays("7");
      await loadBoosts();
    } catch (e) {
      addToast((e as Error).message || "Could not submit boost request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.promote.title", "Promote")}
        subtitle={tr(
          "dashboard.promote.subtitle",
          "Boost a listing for more visibility. Requests go live once an admin approves them."
        )}
      />

      {/* Create a boost request */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon name="plus" size={18} style={{ color: "var(--brand)" }} />
          <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
            {tr("dashboard.promote.create", "Boost a listing")}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label={tr("dashboard.promote.pickListing", "Which listing?")}
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            hint={
              listings.length === 0
                ? tr(
                    "dashboard.promote.noListings",
                    "You have no listings yet — post one first."
                  )
                : undefined
            }
            options={listingOptions}
          />

          <div>
            <Select
              label={tr("dashboard.promote.boostType", "Boost type")}
              value={boostType}
              onChange={(e) => setBoostType(e.target.value as BoostType)}
              options={BOOST_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 6 }}>
              {activeBoostDesc}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Select
              label={tr("dashboard.promote.duration", "Duration")}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={DURATION_OPTIONS}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="primary"
              onClick={submit}
              disabled={!canSubmit}
              leftIcon={<Icon name="send" size={16} />}
            >
              {submitting
                ? tr("common.submitting", "Submitting…")
                : tr("dashboard.promote.submit", "Submit request")}
            </Button>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", minWidth: 0 }}>
              {tr(
                "dashboard.promote.reviewNote",
                "An admin reviews and approves every boost before it applies."
              )}
            </span>
          </div>
        </div>
      </div>

      {/* My boost requests */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="listings" size={18} style={{ color: "var(--brand)" }} />
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
          {tr("dashboard.promote.myRequests", "My boost requests")}
        </h2>
      </div>

      {boosts.length === 0 ? (
        <EmptyState
          icon={<Icon name="listings" size={22} />}
          title={tr("dashboard.promote.empty", "No boost requests yet")}
          subtitle={tr(
            "dashboard.promote.emptyHint",
            "Submit your first boost above — it appears here with its review status."
          )}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {boosts.map((b) => {
            const st = statusStyle(b.status);
            const title =
              b.listingTitle || titleById.get(b.listingId) || b.listingId;
            return (
              <div
                key={b.id}
                className="card card-flat"
                style={{
                  padding: 14,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--muted)",
                      marginTop: 2,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{b.boostLabel || b.boostType}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {b.days} {tr("dashboard.promote.days", "days")}
                    </span>
                    {b.createdAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{formatDate(b.createdAt)}</span>
                      </>
                    )}
                    {(b.status === "active" || b.status === "expired") && b.expiresAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          {b.status === "active" ? "Runs until " : "Ended "}
                          {formatDate(b.expiresAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className="badge"
                  style={{ background: st.bg, color: st.color, flexShrink: 0 }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
