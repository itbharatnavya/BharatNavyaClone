"use client";

import { useState } from "react";
import type { EvidenceAsset } from "@/lib/livingEvidence";

export default function EvidenceMedia({ asset, ratio = "landscape", className = "", priority = false }: { asset?: EvidenceAsset; ratio?: "wide" | "landscape" | "square" | "portrait"; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className={["bn-evidence-media", `is-${ratio}`, failed || !asset ? "is-fallback" : "", className].filter(Boolean).join(" ")}>
    {asset && !failed ? <img src={asset.src} alt={asset.alt} loading={priority ? "eager" : "lazy"} onError={() => setFailed(true)} /> : <div className="bn-evidence-fallback" role="img" aria-label="Evidence image not available"><svg aria-hidden viewBox="0 0 24 24"><path d="M4 20V8l8-4 8 4v12M8 11h2m4 0h2m-8 4h2m4 0h2M9 20v-2h6v2" /></svg><span>Media not available</span></div>}
    {asset?.source === "prototype" && !failed && <figcaption>Prototype media</figcaption>}
  </figure>;
}
