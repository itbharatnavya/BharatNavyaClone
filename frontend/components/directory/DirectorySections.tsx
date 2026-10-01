"use client";

// Directory landing below the categories strip: three sections.
//   1. products     category tabs over an asymmetric product grid
//   2. features     three illustrated cards (find, check the proof, reach many suppliers)
//   3. staircase    live listing counts and a call-to-action banner
// Shared kit: components/attract/*. Styles: .ps-*, .feat-*, .stairs-*, .art-*.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductShowcase from "@/components/directory/ProductShowcase";
import FeatureCards from "@/components/attract/FeatureCards";
import Staircase from "@/components/attract/Staircase";
import { useStory } from "@/components/home/useStory";
import { getCategories, getListings } from "@/lib/api";

const FEATURES = [
  { art: "radar" as const, title: "Find the right business", body: "Search companies, products and services across India, narrowed by category, city and verification." },
  { art: "shield" as const, title: "Check the proof first", body: "Identity, evidence and terms sit on every record, so you decide before you enquire." },
  { art: "fanout" as const, title: "Reach many suppliers at once", body: "Post one requirement and let relevant suppliers respond, instead of chasing them one by one." },
];

export default function DirectorySections() {
  const root = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState({ categories: 0, products: 0, services: 0, all: 0 });
  useEffect(() => {
    let live = true;
    const total = (type?: "product" | "service") => getListings({ limit: 1, ...(type ? { type } : {}) }).then((response) => response.total).catch(() => 0);
    Promise.all([getCategories().then((list) => list.length).catch(() => 0), total("product"), total("service"), total()])
      .then(([categories, products, services, all]) => { if (live) setCounts({ categories, products, services, all }); });
    return () => { live = false; };
  }, []);

  useStory(root, ({ gsap, q }) => {
    gsap.from(q(".ps-rail"), { y: 36, opacity: 0, clipPath: "inset(5% 0% 0% 0% round 24px)", duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: q(".ps-rail")[0], start: "top 90%", once: true } });
  });

  return <div ref={root} className="ps">
    <section className="ps-sec" aria-labelledby="products-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="products-title">Where products meet possibility.</h2></div><p>Every product is a capability, a supplier and a potential requirement. Browse the newest listings by category, with the seller always in view.</p><Link className="le-button" href="/search?type=product">Explore products</Link></header>
      <div className="ps-rail"><ProductShowcase /></div>
    </div></section>

    <FeatureCards
      id="directory-features-title"
      title="Search, trust and act, in one place."
      lead="Everything between wanting something and getting a reply."
      features={FEATURES}
    />

    <Staircase
      id="directory-stairs-title"
      title="A growing marketplace to explore."
      lead="Live counts from the Directory, from a single category to every listing."
      steps={[
        { label: "Categories", sub: "From raw materials to services", value: counts.categories, icon: "M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z" },
        { label: "Services listed", sub: "Specialists and providers", value: counts.services, icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16" },
        { label: "Products listed", sub: "Ready to enquire about", value: counts.products, icon: "M21 8l-9-5-9 5 9 5z|M3 8v8l9 5 9-5V8" },
        { label: "All listings", sub: "Across the Directory", value: counts.all, icon: "M4 21V7l8-4 8 4v14|M9 21v-4h6v4|M9 10h6" },
      ]}
      banner={{ title: "Represent your business, or find one.", body: "List your company with a structured profile, or search for the supplier you need.", primary: { href: "/sell", label: "List your business" }, secondary: { href: "/search", label: "Explore the Directory" } }}
    />
  </div>;
}
