"use client";

// Recruiter self-serve advertising — reuses the SAME /api/my-ads pipeline Directory's
// AdvertiseTab.tsx hits (pending → admin review → served by routes/ads.js); only the
// placement catalog differs per product. Directory's own AdvertiseTab is unreachable
// from here on purpose (sellerOnly-gated in DashboardShell, and an employer-only user
// has no sellerProfile) — this is a smaller, Recruitment-scoped equivalent, now with
// edit/pause/delete (backend/routes/myAds.js PUT/DELETE, added alongside the
// recruitmentRole enhancement pass).

import React, { useEffect, useState } from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import ImageUpload from "@/components/ImageUpload";
import { Section } from "@/components/sell/editors";
import { useToast } from "@/components/Toast";
import { createMyAd, getMyAds, updateMyAd, deleteMyAd, type MyAd, type AdPlacementType } from "@/lib/api";

const AD_PLACEMENTS: { value: AdPlacementType; label: string }[] = [
  { value: "recruitment_home", label: "Recruitment home page" },
  { value: "recruitment_search_top", label: "Job search results — top banner" },
];

function statusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case "active":
    case "scheduled":
      return { bg: "#DCFCE7", color: "#166534", label: status === "active" ? "Active" : "Scheduled" };
    case "paused":
      return { bg: "#F1F5F9", color: "#475569", label: "Paused" };
    default:
      return { bg: "#E3EBFF", color: "#1B3FA0", label: "Pending review" };
  }
}

export default function AdvertisementsTab() {
  const { addToast } = useToast();
  const [ads, setAds] = useState<MyAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [placementType, setPlacementType] = useState<AdPlacementType>("recruitment_home");
  const [creativeImageUrl, setCreativeImageUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAds = React.useCallback(async () => {
    try {
      const rows = await getMyAds();
      setAds(rows.filter((a) => (a.placementType || "").startsWith("recruitment_")));
    } catch {
      // Non-fatal — the create form still works even if the list fails to load.
    } finally {
      setLoadingAds(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const canSubmit = creativeImageUrl.trim() !== "" && headline.trim() !== "" && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createMyAd({
        placementType,
        creativeImageUrl: creativeImageUrl.trim(),
        headline: headline.trim(),
        targetUrl: targetUrl.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      addToast("Submitted — an admin will review and activate it.", "success");
      setCreativeImageUrl("");
      setHeadline("");
      setTargetUrl("");
      setStartDate("");
      setEndDate("");
      await loadAds();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not submit campaign.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePause(ad: MyAd) {
    setBusyId(ad.id);
    try {
      await updateMyAd(ad.id, { status: ad.status === "paused" ? "active" : "paused" });
      await loadAds();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not update campaign.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function removeAd(ad: MyAd) {
    setBusyId(ad.id);
    try {
      await deleteMyAd(ad.id);
      await loadAds();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Could not delete campaign.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Section title="Advertise your company" desc="Promote your company or a role across Recruitment. Campaigns go live once an admin approves them.">
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label className="field-label">Campaign image</label>
          <ImageUpload value={creativeImageUrl} onChange={setCreativeImageUrl} label="Upload image" />
        </div>
        <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. TechNova is hiring across 6 roles" />
        <Input
          label="Link (optional)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="/employer/your-company"
          hint="Where candidates go when they tap the ad."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Select
            label="Where should it show?"
            value={placementType}
            onChange={(e) => setPlacementType(e.target.value as AdPlacementType)}
            options={AD_PLACEMENTS}
          />
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="green" onClick={submit} disabled={!canSubmit}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </div>

        {!loadingAds && ads.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>My campaigns</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ads.map((a) => {
                const st = statusStyle(a.status);
                return (
                  <div key={a.id} className="card card-flat" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {a.creativeImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.creativeImageUrl} alt="" style={{ width: 60, height: 44, borderRadius: "var(--r-xs)", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
                    ) : (
                      <div aria-hidden style={{ width: 60, height: 44, borderRadius: "var(--r-xs)", background: "var(--bg-subtle)", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--ink)" }}>{a.headline || "Untitled campaign"}</div>
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
                        {AD_PLACEMENTS.find((p) => p.value === a.placementType)?.label || a.placementType}
                      </div>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {(a.status === "active" || a.status === "paused") && (
                        <Button variant="secondary" size="sm" onClick={() => togglePause(a)} disabled={busyId === a.id}>
                          {a.status === "paused" ? "Resume" : "Pause"}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeAd(a)} disabled={busyId === a.id}>
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
