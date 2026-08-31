"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAds } from "@/lib/api";

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
  if (!ad?.targetUrl || !ad.headline) return null;
  return <section className="bn-native-promotion" aria-label="Sponsored"><div className="bn-container"><Link href={ad.targetUrl}>{ad.creativeImageUrl && <span className="bn-native-image">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={ad.creativeImageUrl} alt="" /></span>}<span className="bn-native-copy"><small>Sponsored · Bharat Navya placement</small><strong>{ad.headline}</strong><span>View promoted profile</span></span></Link></div></section>;
}
