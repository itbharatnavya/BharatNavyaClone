"use client";

// Directory landing below the categories strip: three sections.
//   1. companies    a grid of verified company cards
//   2. quotes       RfqScene: one requirement fans out and quotes come back
//   3. storefront   StorefrontScene: a seller profile builds itself, step by step
// Styles: .ps-*, .rfq-*, .sf-*.

import { useRef } from "react";
import Link from "next/link";
import CompanyShowcase from "@/components/directory/CompanyShowcase";
import RfqScene from "@/components/directory/RfqScene";
import StorefrontScene from "@/components/directory/StorefrontScene";
import { useStory } from "@/components/home/useStory";

export default function DirectorySections() {
  const root = useRef<HTMLDivElement>(null);
  useStory(root, ({ gsap, q }) => {
    gsap.from(q(".ps-rail"), { y: 36, opacity: 0, clipPath: "inset(5% 0% 0% 0% round 24px)", duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: q(".ps-rail")[0], start: "top 90%", once: true } });
  });
  return <div ref={root} className="ps">
    <section className="ps-sec" aria-labelledby="companies-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="companies-title">Top companies</h2></div><Link className="le-button" href="/search">See all companies</Link></header>
      <div className="ps-rail"><CompanyShowcase /></div>
    </div></section>
    <RfqScene />
    <StorefrontScene />
  </div>;
}
