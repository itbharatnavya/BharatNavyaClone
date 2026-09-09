"use client";

import { useEffect, useState } from "react";
import { getAds } from "@/lib/api";
import AdvertisingSlot from "@/components/evidence/AdvertisingSlot";

interface NativeAd { id?: string; creativeImageUrl?: string; headline?: string; targetUrl?: string }

export default function NativePromotionSlot() {
  const [ad, setAd] = useState<NativeAd | null>(null);
  useEffect(() => {
    let active = true;
    getAds("home_hero").then((items) => {
      if (!active || !Array.isArray(items)) return;
      const internal = items.find((item) => typeof item?.targetUrl === "string" && item.targetUrl.startsWith("/"));
      setAd(internal || null);
    }).catch(() => setAd(null));
    return () => { active = false; };
  }, []);
  const preview = process.env.NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW === "true";
  if (!ad?.targetUrl || !ad.headline) {
    if (!preview) return null;
    return <AdvertisingSlot kind="native" context="A late native placement after organic discovery" title="Help the right people discover a credible company or transparent role." summary="Promoted Bharat Navya records retain the same evidence requirements and remain visibly separated from organic results." href="/pricing" action="Explore promotion options" media={{ src: "/seed-media/work/work-6.jpg", alt: "A growing team presenting its current work", kind: "work-sample", source: "prototype", attribution: "Prototype sponsored creative" }} />;
  }
  return <AdvertisingSlot kind="native" context="A late native placement after organic discovery" title={ad.headline} summary="This promoted Bharat Navya record is clearly separated from organic discovery and trust signals." href={ad.targetUrl} action="View promoted profile" media={{ src: ad.creativeImageUrl || "/seed-media/work/work-6.jpg", alt: `Promoted creative for ${ad.headline}`, kind: "work-sample", source: ad.creativeImageUrl ? "api" : "prototype", attribution: ad.creativeImageUrl ? undefined : "Prototype sponsored creative" }} />;
}
