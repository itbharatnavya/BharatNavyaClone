"use client";

// Directory landing below the categories strip: three sections.
//   products   the newest product listings (motion: the rail rises into place)
//   business   featured companies beside a "find a service by need" list
//              (motion: company cards tip up in 3D, the list slides in)
//   stories    recent articles beside a call to action (motion: wipe-in)
// Content is complete without motion; see useStory. Styles: .ps-* in counter-soft-system.css.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ProductListingRail from "@/components/directory/ProductListingRail";
import StoriesCta from "@/components/discovery/StoriesCta";
import { useStory } from "@/components/home/useStory";
import { useFeaturedSellers } from "@/lib/catalog";
import { getBlogs } from "@/lib/api";
import { isAlignedDirectoryCompany, mapDirectoryCompany } from "@/lib/productDesign";
import type { Blog } from "@/lib/types";

const NEEDS = [
  { name: "Finance, Legal & Compliance", line: "Accounting, tax, registrations", query: "compliance", icon: "M7 5h10|M7 9h10|M10 5c4 0 4 8 0 8H7l7 6" },
  { name: "Manufacturing & Suppliers", line: "Components, machinery, packaging", query: "manufacturing", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M12 3v3|M12 18v3|M3 12h3|M18 12h3" },
  { name: "Technology & Software", line: "Software, IT, automation", query: "software", icon: "m8 8-4 4 4 4|m16 8 4 4-4 4|m14 5-4 14" },
  { name: "Marketing & Creative", line: "Branding, content, advertising", query: "marketing", icon: "M4 10v4l11 5V5z|M15 9a3 3 0 0 1 0 6" },
  { name: "Logistics & Operations", line: "Freight, warehousing, supply chain", query: "logistics", icon: "M3 7h11v9H3z|M14 10h4l3 3v3h-7|M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z|M17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { name: "Professional Business Services", line: "Consulting, HR, research", query: "business services", icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16" },
];

const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
const Arrow = () => <Icon d="M5 12h14|M13 6l6 6-6 6" />;

export default function DirectorySections() {
  const root = useRef<HTMLDivElement>(null);
  const { sellers, loading } = useFeaturedSellers();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  useEffect(() => { getBlogs({ authorType: "seller" }).then(setBlogs).catch(() => setBlogs([])); }, []);

  const companies = useMemo(() => {
    const mapped = sellers.map(mapDirectoryCompany).filter((company): company is NonNullable<typeof company> => Boolean(company));
    const aligned = sellers.filter(isAlignedDirectoryCompany).map(mapDirectoryCompany).filter((company): company is NonNullable<typeof company> => Boolean(company));
    return (aligned.length ? aligned : mapped).slice(0, 4);
  }, [sellers]);

  useStory(root, ({ gsap, q }) => {
    const once = (trigger: string, start = "top 86%") => ({ trigger, start, once: true });
    gsap.from(q(".ps-rail"), { y: 36, opacity: 0, clipPath: "inset(5% 0% 0% 0% round 24px)", duration: 0.9, ease: "power3.out", scrollTrigger: once(".ps-rail", "top 90%") });
    gsap.from(q(".ps-company"), { y: 40, rotateX: 14, transformPerspective: 900, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", clearProps: "transform", scrollTrigger: once(".ps-company-grid") });
    gsap.from(q(".ps-need"), { x: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: "power2.out", scrollTrigger: once(".ps-needs") });
    gsap.from(q(".ps-stories-list ul, .ps-stories-list .ps-empty"), { clipPath: "inset(0% 100% 0% 0%)", duration: 0.9, ease: "power3.inOut", scrollTrigger: once(".ps-stories-list ul, .ps-stories-list .ps-empty", "top 90%") });
    gsap.from(q(".ps-cta"), { scale: 0.94, y: 30, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: once(".ps-cta") });
  });

  return <div ref={root} className="ps">
    <section className="ps-sec" aria-labelledby="products-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="products-title">Where products meet possibility.</h2></div><p>Every product is a capability, a supplier and a potential requirement. Browse what was listed most recently, with the seller always in view.</p><Link className="le-button" href="/search?type=product">Explore products</Link></header>
      <div className="ps-rail"><ProductListingRail /></div>
    </div></section>

    <section className="ps-sec" aria-labelledby="business-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="business-title">Know the business, then pick the service.</h2></div><p>See who is behind an offering before you enquire, or start from the kind of help you need and let the Directory narrow it down.</p><Link className="le-button" href="/search">Browse all listings</Link></header>
      <div className="ps-biz">
        <ul className="ps-company-grid">
          {[0, 1, 2, 3].map((index) => {
            const company = companies[index];
            if (!loading && !company) return <li key={index} hidden />;
            return <li key={index} className={`ps-company${company ? "" : " is-loading"}`}>
              {company ? <Link href={`/seller/${company.slug}`}>
                <span className="ps-company-top"><Avatar src={company.logo || undefined} name={company.name} size={48} />{company.verified && <em className="hs-m-tag">Verified</em>}</span>
                <strong>{company.name}</strong>
                <small>{company.location}</small>
                <span className="ps-chips">{company.capabilities.slice(0, 2).map((item) => <i key={item}>{item}</i>)}</span>
                <span className="ps-company-foot">{company.rating ? <b>{company.rating.toFixed(1)} rating</b> : <b>New on Bharat Navya</b>}<span>View profile<Arrow /></span></span>
              </Link> : <><span className="hs-sk is-wide" /><span className="hs-sk" /><span className="hs-sk is-thin" /></>}
            </li>;
          })}
        </ul>
        <aside className="ps-needs" aria-label="Find a service by need">
          <h3>Find a service by need</h3>
          <ul>{NEEDS.map((need) => <li key={need.name} className="ps-need"><Link href={`/search?type=service&q=${encodeURIComponent(need.query)}`}>
            <span className="ps-need-icon"><Icon d={need.icon} /></span>
            <span><strong>{need.name}</strong><small>{need.line}</small></span>
            <Arrow />
          </Link></li>)}</ul>
        </aside>
      </div>
    </div></section>

    <StoriesCta
      id="directory-stories-title"
      title="Business stories worth knowing."
      lead="Ideas and practical guides from companies on Bharat Navya."
      blogs={blogs}
      allHref="/blog"
      allLabel="All articles"
      panel={{ eyebrow: "For businesses", title: "The right place for what you offer, and what you need.", body: "Find relevant businesses, products and services, or represent your own company with a structured presence built for B2B visibility.", primary: { href: "/sell", label: "List your business" }, secondary: { href: "/search", label: "Explore the Directory" } }}
    />
  </div>;
}
