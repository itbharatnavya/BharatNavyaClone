import Link from "next/link";
import EvidenceMedia from "./EvidenceMedia";
import type { EvidenceAsset } from "@/lib/livingEvidence";

interface AdvertisingSlotProps {
  kind: "native" | "external";
  title: string;
  summary: string;
  media: EvidenceAsset;
  href?: string;
  action?: string;
  context: string;
  compact?: boolean;
}

export default function AdvertisingSlot({ kind, title, summary, media, href, action, context, compact = false }: AdvertisingSlotProps) {
  const disclosure = kind === "external" ? "Advertisement" : "Sponsored";
  return <aside className={`le-ad-slot${compact ? " is-compact" : ""}`} aria-label={disclosure} data-ad-kind={kind}>
    <div className="le-shell le-ad-slot-card">
      <div className="le-ad-slot-media"><EvidenceMedia asset={media} ratio="wide" /><span className="le-ad-disclosure">{disclosure}{kind === "external" ? " · External partner" : " · Bharat Navya placement"}</span></div>
      <div className="le-ad-slot-copy">
        <small>{context}</small>
        <h2>{title}</h2>
        <p>{summary}</p>
        {href && action && <Link className="le-button is-primary" href={href}>{action}{kind === "external" ? " ↗" : " →"}</Link>}
        <details><summary>Why this {kind === "external" ? "ad" : "promotion"}?</summary><p>{kind === "external" ? "This contextual placement uses only the current public section and broad location. It does not use private profiles, messages, inquiries, applications or browsing history." : "This is a clearly labelled Bharat Navya placement. It is separate from verification, organic ranking and editorial recommendations."}</p></details>
      </div>
    </div>
  </aside>;
}
