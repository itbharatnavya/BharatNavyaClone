"use client";

import { useEffect, useState } from "react";
import { getAds } from "@/lib/api";
import AdvertisingSlot from "./AdvertisingSlot";
import AdControls from "@/components/ads/AdControls";
import { useAdRotation } from "@/components/ads/useAdRotation";

interface ApiAd {
  id?: string;
  creativeImageUrl?: string;
  headline?: string;
  targetUrl?: string;
}

interface ApiAdvertisingSlotProps {
  placement: string | string[];
  /** Page's category slug(s), comma-separated for a path — category-targeted ads then only show on matching pages. */
  category?: string;
  kind: "native" | "external";
  context: string;
  summary: string;
  action: string;
  compact?: boolean;
  imageOnly?: boolean;
  showFallback?: boolean;
  fallbackTitle?: string;
  fallbackSummary?: string;
  fallbackAction?: string;
}

// Every approved ad for the placement takes part in the rotation; this is only a safety ceiling.
const MAX_ADS = 50;

export default function ApiAdvertisingSlot({ placement, category, kind, context, summary, action, compact = false, imageOnly = false, showFallback = true, fallbackTitle, fallbackSummary, fallbackAction }: ApiAdvertisingSlotProps) {
  const [ads, setAds] = useState<ApiAd[]>([]);
  const placementKey = Array.isArray(placement) ? placement.join("|") : placement;
  const recruitmentPlacement = /(recruitment|job|employer)/.test(placementKey);
  const rotation = useAdRotation(ads.length, placementKey);
  const { index } = rotation;

  useEffect(() => {
    let active = true;
    const placements = placementKey.split("|");
    Promise.all(placements.map((slot) => getAds(slot, category).catch(() => [])))
      .then((groups) => {
        if (!active) return;
        const items = groups.find((group) => Array.isArray(group) && group.length) || [];
        setAds(items.filter((item: ApiAd) => item?.headline && item?.creativeImageUrl && item?.targetUrl).slice(0, MAX_ADS));
      })
      .catch(() => active && setAds([]));
    return () => { active = false; };
  }, [placementKey, category]);

  // Warm the next picture so a change never flashes an empty frame.
  useEffect(() => {
    if (ads.length < 2) return;
    const nextAd = ads[(index + 1) % ads.length];
    if (nextAd?.creativeImageUrl) { const img = new Image(); img.src = nextAd.creativeImageUrl; }
  }, [ads, index]);

  const ad = ads[index] || null;

  if (!ad?.headline || !ad.creativeImageUrl || !ad.targetUrl) {
    if (!showFallback) return null;
    return <AdvertisingSlot
      compact={compact}
      imageOnly={imageOnly}
      kind="native"
      context="Promote on Bharat Navya"
      title={fallbackTitle || (recruitmentPlacement ? "Reach candidates with a transparent employer or role profile." : "Put a credible company or listing in front of the right audience.")}
      summary={fallbackSummary || "Sponsored placements stay clearly labelled and separate from verification, editorial judgment and organic ranking."}
      href="/pricing"
      action={fallbackAction || "Explore placements"}
      media={{ src: recruitmentPlacement ? "/seed-media/company/company-2.jpg" : "/seed-media/work/work-6.jpg", alt: recruitmentPlacement ? "A team working together" : "A team presenting its work", kind: recruitmentPlacement ? "workplace" : "work-sample", source: "prototype", attribution: "Bharat Navya promotional placement" }}
    />;
  }

  const controls = <AdControls
    count={ads.length}
    index={index}
    onPrev={rotation.prev}
    onNext={rotation.next}
    onGoTo={rotation.goTo}
  />;

  return <div
    className="bn-ad-rotator"
    ref={rotation.wrapRef}
    {...rotation.handlers}
  >
    <AdvertisingSlot
      key={ad.id || index}
      compact={compact}
      imageOnly={imageOnly}
      kind={kind}
      context={context}
      title={ad.headline}
      summary={summary}
      href={ad.targetUrl}
      action={action}
      controls={controls}
      media={{ src: ad.creativeImageUrl, alt: ad.headline, kind: "work-sample", source: "api" }}
    />
  </div>;
}
