"use client";

import { useEffect, useState } from "react";
import { getAds } from "@/lib/api";
import AdvertisingSlot from "./AdvertisingSlot";

interface ApiAd {
  id?: string;
  creativeImageUrl?: string;
  headline?: string;
  targetUrl?: string;
}

interface ApiAdvertisingSlotProps {
  placement: string | string[];
  kind: "native" | "external";
  context: string;
  summary: string;
  action: string;
  compact?: boolean;
  showFallback?: boolean;
  fallbackTitle?: string;
  fallbackSummary?: string;
  fallbackAction?: string;
}

export default function ApiAdvertisingSlot({ placement, kind, context, summary, action, compact = false, showFallback = true, fallbackTitle, fallbackSummary, fallbackAction }: ApiAdvertisingSlotProps) {
  const [ad, setAd] = useState<ApiAd | null>(null);
  const placementKey = Array.isArray(placement) ? placement.join("|") : placement;
  const recruitmentPlacement = /(recruitment|job|employer)/.test(placementKey);

  useEffect(() => {
    let active = true;
    const placements = placementKey.split("|");
    Promise.all(placements.map((slot) => getAds(slot).catch(() => [])))
      .then((groups) => {
        if (!active) return;
        const items = groups.find((group) => Array.isArray(group) && group.length) || [];
        setAd(items.find((item) => item?.headline && item?.creativeImageUrl && item?.targetUrl) || null);
      })
      .catch(() => active && setAd(null));
    return () => { active = false; };
  }, [placementKey]);

  if (!ad?.headline || !ad.creativeImageUrl || !ad.targetUrl) {
    if (!showFallback) return null;
    return <AdvertisingSlot
      compact={compact}
      kind="native"
      context="Promote on Bharat Navya"
      title={fallbackTitle || (recruitmentPlacement ? "Reach candidates with a transparent employer or role profile." : "Put a credible company or listing in front of the right audience.")}
      summary={fallbackSummary || "Sponsored placements stay clearly labelled and separate from verification, editorial judgment and organic ranking."}
      href="/pricing"
      action={fallbackAction || "Explore placements"}
      media={{ src: recruitmentPlacement ? "/seed-media/company/company-2.jpg" : "/seed-media/work/work-6.jpg", alt: recruitmentPlacement ? "A team working together" : "A team presenting its work", kind: recruitmentPlacement ? "workplace" : "work-sample", source: "prototype", attribution: "Bharat Navya promotional placement" }}
    />;
  }

  return <AdvertisingSlot
    compact={compact}
    kind={kind}
    context={context}
    title={ad.headline}
    summary={summary}
    href={ad.targetUrl}
    action={action}
    media={{ src: ad.creativeImageUrl, alt: ad.headline, kind: "work-sample", source: "api" }}
  />;
}
