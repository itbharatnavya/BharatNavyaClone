"use client";

// All Categories: every top-level category as one card (photo, name, counts and
// its first sub-categories), grouped nowhere and coloured nowhere, so the page
// scans as a single even grid. Each card links to the category; sub-categories
// link to theirs. Text never sits on a photo.

import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCategoryTree } from "@/components/CategoryMegaMenu";
import { imgFor } from "@/lib/categoryImages";

const PREVIEW = 4;

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function Lens() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="m20 20-4-4" /></svg>; }

export default function CategoriesPage() {
  const { tops, loaded } = useCategoryTree();
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const visible = useMemo(() => !term ? tops : tops.filter((top) => top.name.toLowerCase().includes(term) || top.children.some((child) => child.name.toLowerCase().includes(term))), [tops, term]);
  const totalSubs = tops.reduce((count, top) => count + top.children.length, 0);

  return <div className="counter-public-page counter-catalog-index bn-catalog">
    <header className="bn-catalog-head">
      <nav aria-label="Breadcrumb"><Link href="/directory">Directory</Link><span aria-hidden>/</span><span aria-current="page">Categories</span></nav>
      <div>
        <h1>All categories</h1>
        {loaded && tops.length > 0 && <p>{tops.length} categories and {totalSubs} sub-categories, from raw materials to professional services.</p>}
      </div>
      <label className="bn-catalog-filter"><Lens /><span className="sr-only">Filter categories</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter categories" /></label>
    </header>

    {!loaded ? <ul className="bn-catalog-grid" aria-hidden>{Array.from({ length: 8 }).map((_, index) => <li key={index} className="bn-catalog-card is-loading"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></li>)}</ul>
      : visible.length === 0 ? <p className="bn-catalog-empty">{tops.length === 0 ? "No categories available right now." : `No categories match “${filter.trim()}”.`}</p>
      : <ul className="bn-catalog-grid">
        {visible.map((top) => {
          const shown = top.children.slice(0, PREVIEW);
          const rest = top.children.length - shown.length;
          return <li key={top.id} className="bn-catalog-card">
            <Link href={`/${top.slug}`} className="bn-catalog-media" tabIndex={-1} aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/demo/${imgFor(top)}.jpg`} alt="" loading="lazy" />
            </Link>
            <div className="bn-catalog-body">
              <h2><Link href={`/${top.slug}`}>{top.name}</Link></h2>
              <p className="bn-catalog-count">{top.children.length} sub-categories{top.listingCount ? ` · ${top.listingCount.toLocaleString("en-IN")} listings` : ""}</p>
              {shown.length > 0 && <ul className="bn-catalog-subs">
                {shown.map((child) => <li key={child.id}><Link href={`/${child.slug}`}>{child.name}</Link></li>)}
              </ul>}
              <Link href={`/${top.slug}`} className="bn-catalog-all">{rest > 0 ? `Browse all ${top.children.length}` : "Browse category"}<Arrow /></Link>
            </div>
          </li>;
        })}
      </ul>}
    <ApiAdvertisingSlot compact showFallback={false} placement="category_top" kind="native" context="Sponsored in the Directory" summary="A clearly labelled placement, separate from the content on this page." action="View promotion" />
  </div>;
}
