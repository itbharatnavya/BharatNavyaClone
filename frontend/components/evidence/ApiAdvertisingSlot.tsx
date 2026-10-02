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
  imageOnly?: boolean;
  showFallback?: boolean;
  fallbackTitle?: string;
  fallbackSummary?: string;
  fallbackAction?: string;
}

const MAX_ADS = 5;
const ROTATE_MS = 4000;

export default function ApiAdvertisingSlot({ placement, kind, context, summary, action, compact = false, imageOnly = false, showFallback = true, fallbackTitle, fallbackSummary, fallbackAction }: ApiAdvertisingSlotProps) {
  const [ads, setAds] = useState<ApiAd[]>([]);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [away, setAway] = useState(false);
  const placementKey = Array.isArray(placement) ? placement.join("|") : placement;
  const recruitmentPlacement = /(recruitment|job|employer)/.test(placementKey);

  useEffect(() => {
    let active = true;
    const placements = placementKey.split("|");
    Promise.all(placements.map((slot) => getAds(slot).catch(() => [])))
      .then((groups) => {
        if (!active) return;
        const items = groups.find((group) => Array.isArray(group) && group.length) || [];
        setAds(items.filter((item: ApiAd) => item?.headline && item?.creativeImageUrl && item?.targetUrl).slice(0, MAX_ADS));
        setIndex(0);
      })
      .catch(() => active && setAds([]));
    return () => { active = false; };
  }, [placementKey]);

  // Rotate through the placement's ads. Hover/focus on the ad and a background tab hold it,
  // and reduced-motion users keep the first ad.
  useEffect(() => {
    const sync = () => setAway(document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  const rotating = ads.length > 1 && !held && !away;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % ads.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, index, ads.length]);

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

  const dots = ads.length > 1 ? <span className="bn-ad-dots" role="group" aria-label="Choose a promotion">
    {ads.map((item, position) => <button key={item.id || position} type="button" aria-label={`Show promotion ${position + 1} of ${ads.length}`} aria-pressed={position === index} onClick={() => setIndex(position)} />)}
  </span> : null;

  return <div
    className="bn-ad-rotator"
    onMouseEnter={() => setHeld(true)}
    onMouseLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}
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
      controls={dots}
      media={{ src: ad.creativeImageUrl, alt: ad.headline, kind: "work-sample", source: "api" }}
    />
  </div>;
}
