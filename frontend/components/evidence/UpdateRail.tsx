"use client";

import { useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Avatar from "@/components/Avatar";
import EvidenceMedia from "./EvidenceMedia";
import { updateLabel, type PublicUpdate } from "@/lib/livingEvidence";
import { viewStory } from "@/lib/api";

export default function UpdateRail({ updates, title = "Latest updates" }: { updates: PublicUpdate[]; title?: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const selected = openAt == null ? undefined : updates[openAt];
  function open(index: number) { const update = updates[index]; setOpenAt(index); if (update.kind === "story" && !update.isPrototype) void viewStory(update.id).catch(() => {}); }
  if (!updates.length) return null;
  return <section className="le-update-rail" aria-label={title}>
    <div className="le-update-rail-head"><strong>{title}</strong><span>Fresh company and hiring context</span></div>
    <div className="le-update-scroller">{updates.map((update, index) => <button type="button" key={`${update.context}-${update.id}`} onClick={() => open(index)} className="le-update-card" aria-label={`Open ${update.headline}`}>
      <EvidenceMedia asset={update.media} ratio="portrait" />
      <span className={`le-update-context is-${update.context}`}>{update.context === "directory" ? "Directory" : "Recruitment"}</span>
      <span className="le-update-card-copy"><small>{updateLabel(update)}</small><strong>{update.authorName}</strong><span>{update.headline}</span></span>
    </button>)}</div>
    <Modal open={Boolean(selected)} onClose={() => setOpenAt(null)} title={selected?.authorName || "Update"} size="sm">
      {selected && <div className="le-update-view"><EvidenceMedia asset={selected.media} ratio="wide" priority /><div className="le-update-view-copy"><span className={`le-update-context is-${selected.context}`}>{updateLabel(selected)}</span><h2>{selected.headline}</h2>{selected.summary && <p>{selected.summary}</p>}<div><Avatar src={selected.authorLogo} name={selected.authorName} size={40} /><strong>{selected.authorName}</strong></div>{selected.href && <Link href={selected.href} onClick={() => setOpenAt(null)}>Open related page →</Link>}</div></div>}
    </Modal>
  </section>;
}
