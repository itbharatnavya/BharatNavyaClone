import type { ReactNode } from "react";
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
  controls?: ReactNode;
  imageOnly?: boolean;
}

export default function AdvertisingSlot({ kind, title, summary, media, href, action, context, compact = false, controls, imageOnly = false }: AdvertisingSlotProps) {
  const disclosure = kind === "external" ? "Advertisement" : "Sponsored";
  if (imageOnly && href) {
    // The whole card is the ad image: a short title sits on it, the card is the link,
    // and the disclosure stays visible. Controls are siblings of the link, never inside it.
    const shortTitle = title.split(/\s[—–-]\s/)[0].trim() || title;
    return <aside className="le-ad-slot is-image-only" aria-label={disclosure} data-ad-kind={kind}>
      <div className="le-ad-image-card">
        <Link className="le-ad-image-link" href={href} aria-label={`${title}. ${disclosure}${action ? `. ${action}` : ""}`}>
          <EvidenceMedia asset={media} ratio="wide" />
          <span className="le-ad-image-title">{shortTitle}</span>
        </Link>
        <span className="le-ad-disclosure">{disclosure}{kind === "external" ? " · External partner" : ""}</span>
        {controls}
      </div>
    </aside>;
  }
  return <aside className={`le-ad-slot${compact ? " is-compact" : ""}`} aria-label={disclosure} data-ad-kind={kind}>
    <div className="le-shell le-ad-slot-card">
      <div className="le-ad-slot-media"><EvidenceMedia asset={media} ratio="wide" /><span className="le-ad-disclosure">{disclosure}{kind === "external" ? " · External partner" : ""}</span>{controls}</div>
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
