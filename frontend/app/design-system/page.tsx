"use client";

import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import EvidenceRecord from "@/components/evidence/EvidenceRecord";
import AdvertisingSlot from "@/components/evidence/AdvertisingSlot";
import UpdateRail from "@/components/evidence/UpdateRail";
import type { PublicUpdate } from "@/lib/livingEvidence";

const galleryUpdates: PublicUpdate[] = [
  { id: "gallery-directory", context: "directory", kind: "prototype", authorName: "Directory example", headline: "A work sample is ready to inspect", summary: "Labelled prototype state", publishedAt: "2026-09-01T09:00:00.000Z", media: { src: "/seed-media/work/work-1.jpg", alt: "A team reviewing a work sample", kind: "work-sample", source: "prototype", attribution: "Prototype media" }, isPrototype: true },
  { id: "gallery-recruitment", context: "recruitment", kind: "prototype", authorName: "Recruitment example", headline: "A hiring update with workplace context", summary: "Labelled prototype state", publishedAt: "2026-09-01T10:00:00.000Z", media: { src: "/seed-media/company/company-2.jpg", alt: "A team working in a shared office", kind: "workplace", source: "prototype", attribution: "Prototype media" }, isPrototype: true },
];

export default function DesignSystemGallery() {
  return <div className="le-page">
    <section className="le-hero"><div className="le-shell"><h1>Living Evidence system.</h1><p>The active public-page radius, spacing, media, record and update contracts in one implementation surface.</p></div></section>
    <section className="le-section"><div className="le-shell"><header className="le-section-head"><div><h2>Radius and action hierarchy.</h2></div><p>Controls, cards and section containers share one 20px corner radius. Only true pills, circles and joined internal segments use a different silhouette.</p></header><div className="le-closing-actions"><button className="le-button is-primary">Primary action</button><button className="le-button">Secondary action</button><span className="le-update-context is-directory">Directory status</span><span className="le-update-context">Recruitment status</span></div></div></section>
    <section className="le-section is-tinted"><div className="le-shell"><header className="le-section-head"><div><h2>Evidence media and records.</h2></div><p>Stable ratios, meaningful alternatives and reusable missing-media behavior.</p></header><div className="le-discovery-grid"><EvidenceMedia asset={{ src: "/seed-media/company/company-4.jpg", alt: "A small business team sharing current work", kind: "team", source: "prototype", attribution: "Prototype media" }} ratio="wide" /><div className="le-record-stack"><EvidenceRecord href="/directory" title="Company evidence record" meta="Ahmedabad · Identity verified" detail="Logo, proof and structured inquiry context" label="Directory" /><EvidenceRecord href="/recruitment/jobs" title="Role evidence record" meta="Hybrid · Salary disclosed" detail="Freshness and closing context" label="Recruitment" /></div></div></div></section>
    <div className="le-shell"><UpdateRail updates={galleryUpdates} title="Update rail states" /></div>
    <section className="le-section is-tinted"><div className="le-shell"><header className="le-section-head"><div><h2>Advertising disclosure.</h2></div><p>Native promotion and external advertising are labelled differently and never imitate organic records or verification.</p></header><div className="le-gallery-ad-grid"><AdvertisingSlot compact kind="native" context="Bharat Navya placement" title="A clearly labelled company or role promotion." summary="Native placements remain separate from organic ranking." media={{ src: "/seed-media/company/company-5.jpg", alt: "A team preparing a public company update", kind: "team", source: "prototype" }} /><AdvertisingSlot compact kind="external" context="Contextual partner" title="A distinct external partner placement." summary="External ads disclose their context and data boundary." media={{ src: "/seed-media/company/company-6.jpg", alt: "A team using a business tool", kind: "workplace", source: "prototype" }} /></div></div></section>
  </div>;
}
