"use client";

// components/dashboard/AdvertiseTab.tsx — seller self-serve advertising.
//
// A seller builds a campaign entirely with dropdowns (mobile-first, non-technical):
//   • Source     — promote one of their listings OR upload a custom image
//   • Placement  — category top / search top / home hero
//   • Category   — target one category or "All categories"
//   • Dates      — start / end
// Submitting POSTs to /api/my-ads, which forces status = "pending". The campaign
// then shows in "My campaigns" with a status badge and stays invisible on the public
// ad slider until an admin activates it in the admin Ads tab.

import React, { useEffect, useMemo, useState } from "react";
import type { User, Listing, Category } from "@/lib/types";
import {
  getMyListings,
  getCategories,
  getMyAds,
  createMyAd,
  type MyAd,
  type AdPlacementType,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import ImageUpload from "@/components/ImageUpload";
import { PanelHeader, EmptyState, Loading, Icon, formatDate, useTr } from "./shared";
import { validateAd, type Errors } from "./validation";
import {
  useEntitlements,
  tierOf,
  featureAllowed,
  featureExists,
} from "@/lib/entitlements";

// The self-serve advertising feature id gated below. Only enforced when a feature
// with this id actually exists in the entitlements catalog (defensive — never breaks
// the tab if the admin hasn't defined it).
const ADS_FEATURE_ID = "self-serve-ads";

interface Props {
  user: User;
}

type Source = "listing" | "custom";

const PLACEMENT_OPTIONS = [
  { value: "category_top", label: "Category top — on category pages" },
  { value: "search_top", label: "Search top — above search results" },
  { value: "home_hero", label: "Home hero — on the homepage" },
];

const PLACEMENT_LABEL: Record<string, string> = {
  category_top: "Category top",
  search_top: "Search top",
  home_hero: "Home hero",
};

// Status badge styling — pending = amber, active/scheduled = green, paused = grey.
function statusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "active":
      return { bg: "#DCFCE7", color: "#166534", label: "Active" };
    case "scheduled":
      return { bg: "#DCFCE7", color: "#166534", label: "Scheduled" };
    case "paused":
      return { bg: "#F1F5F9", color: "#475569", label: "Paused" };
    case "booked":
      return { bg: "#F1F5F9", color: "#475569", label: "Booked" };
    case "pending":
    default:
      return { bg: "#FEF3C7", color: "#92400E", label: "Pending review" };
  }
}

export default function AdvertiseTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();

  // Runtime gating: only block the create form when a "self-serve-ads" feature is
  // in the catalog AND the seller's tier is not among its plans. If the id isn't in
  // the catalog we never gate (render normally).
  const { entitlements } = useEntitlements();
  const tier = tierOf(user);
  const gateAds =
    featureExists(entitlements, ADS_FEATURE_ID) &&
    !featureAllowed(entitlements, ADS_FEATURE_ID, tier);

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<MyAd[]>([]);

  // --- campaign form ---
  const [source, setSource] = useState<Source>("listing");
  const [listingId, setListingId] = useState("");
  const [creativeImageUrl, setCreativeImageUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [placementType, setPlacementType] = useState<AdPlacementType>("category_top");
  const [categorySlug, setCategorySlug] = useState(""); // "" = all categories
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);

  const adErrors: Errors = tried
    ? validateAd({
        source,
        listingId,
        creativeImageUrl,
        headline,
        targetUrl,
        startDate,
        endDate,
      })
    : {};

  const loadAds = React.useCallback(async () => {
    try {
      setAds(await getMyAds());
    } catch (e) {
      addToast((e as Error).message || "Failed to load campaigns", "error");
    }
  }, [addToast]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [listRes, catRes, adsRes] = await Promise.allSettled([
        getMyListings(),
        getCategories(),
        getMyAds(),
      ]);
      if (!alive) return;
      if (listRes.status === "fulfilled") {
        setListings(listRes.value || []);
      }
      if (catRes.status === "fulfilled") setCategories(catRes.value);
      if (adsRes.status === "fulfilled") setAds(adsRes.value);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  const listingOptions = useMemo(
    () => [
      { value: "", label: "Select one of your listings…" },
      ...listings.map((l) => ({ value: l.id, label: l.title })),
    ],
    [listings]
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...[...categories]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories]
  );

  // Picking a listing auto-fills the creative (title, first photo, link to the listing).
  function onPickListing(id: string) {
    setListingId(id);
    const l = listings.find((x) => x.id === id);
    if (l) {
      setHeadline(l.title || "");
      setCreativeImageUrl(l.media?.[0]?.url || "");
      setTargetUrl(`/listing/${l.id}`);
    } else {
      setHeadline("");
      setCreativeImageUrl("");
      setTargetUrl("");
    }
  }

  // Switching source clears the creative so the two modes don't bleed together.
  function switchSource(next: Source) {
    setSource(next);
    setListingId("");
    setCreativeImageUrl("");
    setHeadline("");
    setTargetUrl("");
  }

  function resetForm() {
    setSource("listing");
    setListingId("");
    setCreativeImageUrl("");
    setHeadline("");
    setTargetUrl("");
    setPlacementType("category_top");
    setCategorySlug("");
    setStartDate("");
    setEndDate("");
    setTried(false);
  }

  async function submit() {
    if (submitting) return;
    setTried(true);
    const errs = validateAd({
      source,
      listingId,
      creativeImageUrl,
      headline,
      targetUrl,
      startDate,
      endDate,
    });
    if (Object.keys(errs).length > 0) {
      addToast(
        tr("dashboard.advertise.fixFields", "Please fix the highlighted fields."),
        "error"
      );
      return;
    }
    setSubmitting(true);
    try {
      await createMyAd({
        placementType,
        categoryIds: categorySlug ? [categorySlug] : [],
        listingId: source === "listing" ? listingId || null : null,
        creativeImageUrl: creativeImageUrl.trim(),
        headline: headline.trim(),
        targetUrl: targetUrl.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      addToast(
        tr(
          "dashboard.advertise.submitted",
          "Submitted — an admin will review and activate it."
        ),
        "success"
      );
      resetForm();
      await loadAds();
    } catch (e) {
      addToast((e as Error).message || "Could not submit campaign", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const catName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name || slug;
  const targetingLabel = (a: MyAd) => {
    const ids = a.categoryIds && a.categoryIds.length ? a.categoryIds : [];
    return ids.length === 0 ? "All categories" : ids.map(catName).join(", ");
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.advertise.title", "Advertise")}
        subtitle={tr(
          "dashboard.advertise.subtitle",
          "Promote a listing or a custom banner across BharatSource. Campaigns go live once an admin approves them."
        )}
      />

      {/* Upsell — shown INSTEAD of the create form when the tier can't self-serve ads */}
      {gateAds ? (
        <div
          className="card"
          style={{
            padding: 20,
            marginBottom: 24,
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            flexWrap: "wrap",
            borderColor: "var(--brand)",
            background: "var(--brand-tint)",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
              color: "var(--brand)",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
              {tr(
                "dashboard.advertise.upsellTitle",
                "Self-serve advertising is a paid feature"
              )}
            </h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
              {tr(
                "dashboard.advertise.upsell",
                "Self-serve advertising is available on Silver & Gold — upgrade to run campaigns."
              )}
            </p>
          </div>
        </div>
      ) : (
      /* Create campaign */
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon name="plus" size={18} style={{ color: "var(--brand)" }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
            {tr("dashboard.advertise.create", "Create a campaign")}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Source */}
          <Select
            label={tr("dashboard.advertise.source", "What do you want to advertise?")}
            value={source}
            onChange={(e) => switchSource(e.target.value as Source)}
            options={[
              { value: "listing", label: "Promote a listing" },
              { value: "custom", label: "Upload a custom image" },
            ]}
          />

          {source === "listing" ? (
            <>
              <Select
                label={tr("dashboard.advertise.pickListing", "Which listing?")}
                value={listingId}
                onChange={(e) => onPickListing(e.target.value)}
                error={adErrors.listingId || adErrors.creativeImageUrl}
                hint={
                  listings.length === 0
                    ? "You have no listings yet — switch to a custom image."
                    : "We'll use its title, photo and link automatically."
                }
                options={listingOptions}
              />
              {creativeImageUrl && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={creativeImageUrl}
                    alt=""
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 10,
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                      {headline}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--faint)", wordBreak: "break-all" }}>
                      {targetUrl}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ minWidth: 0 }}>
                <label className="field-label">
                  {tr("dashboard.advertise.image", "Campaign image")}
                </label>
                <ImageUpload
                  value={creativeImageUrl}
                  onChange={setCreativeImageUrl}
                  label="Upload image"
                />
                {adErrors.creativeImageUrl && (
                  <p className="field-error">{adErrors.creativeImageUrl}</p>
                )}
              </div>
              <Input
                label={tr("dashboard.advertise.headline", "Headline")}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                error={adErrors.headline}
                placeholder="e.g. Bulk steel at factory rates"
              />
              <Input
                label={tr("dashboard.advertise.targetUrl", "Link (optional)")}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                error={adErrors.targetUrl}
                placeholder="/seller/your-store or https://…"
                hint="Where buyers go when they tap your ad."
              />
            </>
          )}

          {/* Placement + targeting */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Select
              label={tr("dashboard.advertise.placement", "Where should it show?")}
              value={placementType}
              onChange={(e) => setPlacementType(e.target.value as AdPlacementType)}
              options={PLACEMENT_OPTIONS}
            />
            <Select
              label={tr("dashboard.advertise.category", "Target category")}
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              hint="Leave on “All categories” to show everywhere."
              options={categoryOptions}
            />
          </div>

          {/* Dates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Input
              label={tr("dashboard.advertise.startDate", "Start date")}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label={tr("dashboard.advertise.endDate", "End date")}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={adErrors.endDate}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="primary"
              onClick={submit}
              disabled={submitting}
              leftIcon={<Icon name="send" size={16} />}
            >
              {submitting
                ? tr("common.submitting", "Submitting…")
                : tr("dashboard.advertise.submit", "Submit for review")}
            </Button>
            <span style={{ fontSize: 12, color: "var(--faint)", minWidth: 0 }}>
              {tr(
                "dashboard.advertise.reviewNote",
                "An admin reviews every campaign before it goes live."
              )}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* My campaigns */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="listings" size={18} style={{ color: "var(--brand)" }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
          {tr("dashboard.advertise.myCampaigns", "My campaigns")}
        </h2>
      </div>

      {ads.length === 0 ? (
        <EmptyState
          icon={<Icon name="listings" size={22} />}
          title={tr("dashboard.advertise.empty", "No campaigns yet")}
          subtitle={tr(
            "dashboard.advertise.emptyHint",
            "Create your first campaign above — it appears here with its review status."
          )}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ads.map((a) => {
            const st = statusStyle(a.status);
            return (
              <div
                key={a.id}
                className="card card-flat"
                style={{
                  padding: 14,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {a.creativeImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.creativeImageUrl}
                    alt=""
                    style={{
                      width: 72,
                      height: 54,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    aria-hidden
                    style={{
                      width: 72,
                      height: 54,
                      borderRadius: 8,
                      background: "var(--bg-subtle)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                    {a.headline || "Untitled campaign"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      marginTop: 2,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{PLACEMENT_LABEL[a.placementType || ""] || a.placementType || "—"}</span>
                    <span aria-hidden>·</span>
                    <span>{targetingLabel(a)}</span>
                  </div>
                  {(a.startDate || a.endDate) && (
                    <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>
                      {formatDate(a.startDate) || "—"} → {formatDate(a.endDate) || "—"}
                    </div>
                  )}
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
