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
}

export default function ApiAdvertisingSlot({ placement, kind, context, summary, action }: ApiAdvertisingSlotProps) {
  const [ad, setAd] = useState<ApiAd | null>(null);
  const placementKey = Array.isArray(placement) ? placement.join("|") : placement;

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

  if (!ad?.headline || !ad.creativeImageUrl || !ad.targetUrl) return null;

  return <AdvertisingSlot
    kind={kind}
    context={context}
    title={ad.headline}
    summary={summary}
    href={ad.targetUrl}
    action={action}
    media={{ src: ad.creativeImageUrl, alt: ad.headline, kind: "work-sample", source: "api" }}
  />;
}
