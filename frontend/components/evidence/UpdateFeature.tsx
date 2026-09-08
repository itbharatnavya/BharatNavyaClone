"use client";

import { useState } from "react";
import Link from "next/link";
import EvidenceMedia from "./EvidenceMedia";
import { updateLabel, type PublicUpdate } from "@/lib/livingEvidence";

export default function UpdateFeature({ updates, title }: { updates: PublicUpdate[]; title: string }) {
  const [selectedId, setSelectedId] = useState(updates[0]?.id);
  const selected = updates.find((update) => update.id === selectedId) || updates[0];
  if (!selected) return null;
  return <div className="le-update-feature"><div className="le-update-feature-media"><EvidenceMedia key={selected.id} asset={selected.media} ratio="wide" /><div><span className={`le-update-context is-${selected.context}`}>{updateLabel(selected)}</span><h3>{selected.headline}</h3><p>{selected.summary}</p>{selected.href && <Link href={selected.href}>Explore update →</Link>}</div></div><div className="le-update-feature-list" aria-label={title}>{updates.slice(0, 5).map((update) => <button key={update.id} type="button" aria-pressed={update.id === selected.id} onMouseEnter={() => setSelectedId(update.id)} onFocus={() => setSelectedId(update.id)} onClick={() => setSelectedId(update.id)}><span>{update.context === "directory" ? "Company" : "Hiring"}</span><strong>{update.authorName}</strong><small>{update.headline}</small></button>)}</div></div>;
}
