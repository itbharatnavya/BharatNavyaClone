"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import SearchContextSwitch from "@/components/SearchContextSwitch";
import AdvertisingSlot from "@/components/evidence/AdvertisingSlot";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import { getFeaturedSellers, searchSellers } from "@/lib/api";
import { PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { isAlignedDirectoryCompany, mapDirectoryCompany, type DirectoryCompany } from "@/lib/productDesign";
import { useSearchDock } from "@/lib/searchDock";
import DiscoveryResults from "@/components/discovery/DiscoveryResults";
import type { ListingFilterState } from "@/components/Filters";

const familyOptions = [
  "All service families",
  "Finance, Legal and Compliance",
  "Manufacturing and Suppliers",
  "Technology and Software",
  "Marketing and Creative",
  "Logistics and Operations",
  "Professional Business Services",
];

const previewMedia = [
  "/seed-media/work/work-1.jpg",
  "/seed-media/work/work-2.jpg",
  "/seed-media/work/work-4.jpg",
  "/seed-media/company/company-4.jpg",
];

type CompanySort = "best" | "rating" | "response" | "name";

function Arrow() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
}

function DirectoryPartnerAd() {
  return <AdvertisingSlot compact kind="external" context="Contextual partner · Directory" title="Support for the work around your next decision." summary="A clearly separated space for relevant business tools and services." media={{ src: "/seed-media/company/company-6.jpg", alt: "A small business team using operational tools", kind: "workplace", source: "prototype", attribution: "Prototype advertising creative" }} />;
}

function CompanyPreview({ company, mediaIndex }: { company: DirectoryCompany; mediaIndex: number }) {
  const media = company.media || previewMedia[mediaIndex % previewMedia.length];
  return <div className="directory-preview">
    <div className="directory-preview-cover">
      <EvidenceMedia asset={{ src: media, alt: `Workplace or work evidence from ${company.name}`, kind: "work-sample", source: "prototype", attribution: "Prototype company evidence" }} ratio="wide" />
      <div className="directory-preview-identity">
        <Avatar src={company.logo} name={company.name} size={72} />
        <div>
          <span>{company.verified ? "Identity verified" : "Company profile"}</span>
          <h2>{company.name}</h2>
          <p>{company.location} · {company.serviceFamily}</p>
        </div>
      </div>
    </div>
    <div className="directory-preview-body">
      <section aria-labelledby="preview-capabilities">
        <h3 id="preview-capabilities">What this company can help with</h3>
        <p>{company.descriptor}</p>
        <ul>{company.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
      </section>
      <aside aria-label="Company decision facts">
        <div><strong>{company.rating ? company.rating.toFixed(1) : "New"}</strong><span>{company.rating ? "Public rating" : "Company record"}</span></div>
        <div><strong>{company.reviewCount}</strong><span>Public reviews</span></div>
        <div><strong>{company.responseRate ? `${company.responseRate}%` : "—"}</strong><span>Response rate</span></div>
      </aside>
    </div>
    <div className="directory-preview-note">
      <strong>Inspect before you contact.</strong>
      <p>The full company page contains its complete identity, work evidence, reviews and available contact flow.</p>
    </div>
  </div>;
}

function CompanyInspection({ company, mediaIndex, className, onClose }: { company: DirectoryCompany; mediaIndex: number; className: string; onClose: () => void }) {
  return <section className={`directory-inspection-pane ${className}`} aria-label={`${company.name} company information`}>
    <header><div><span>Selected company</span><strong>Inspect without leaving results</strong></div><button type="button" onClick={onClose} aria-label="Close company information">Collapse</button></header>
    <CompanyPreview company={company} mediaIndex={mediaIndex} />
    <Link className="directory-preview-action" href={`/seller/${company.slug}`}>Open full company profile <Arrow /></Link>
  </section>;
}

function CompanyFilterControls({ family, verifiedOnly, sort, onFamilyChange, onVerifiedChange, onSortChange, onClear }: { family: string; verifiedOnly: boolean; sort: CompanySort; onFamilyChange: (value: string) => void; onVerifiedChange: (value: boolean) => void; onSortChange: (value: CompanySort) => void; onClear: () => void }) {
  return <>
    <label>Service family
      <select value={family} onChange={(event) => onFamilyChange(event.target.value)}>
        {familyOptions.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
    <label>Order by
      <select value={sort} onChange={(event) => onSortChange(event.target.value as CompanySort)}>
        <option value="best">Best fit</option>
        <option value="rating">Highest rated</option>
        <option value="response">Best response rate</option>
        <option value="name">Company name</option>
      </select>
    </label>
    <label className="directory-check"><input type="checkbox" checked={verifiedOnly} onChange={(event) => onVerifiedChange(event.target.checked)} /><span>Identity verified only</span></label>
    <button type="button" onClick={onClear}>Clear filters</button>
  </>;
}

function DirectoryScopeSwitch({ productMode, companyHref, productHref }: { productMode: boolean; companyHref: string; productHref: string }) {
  return <nav className="directory-result-scope" aria-label="Directory result type">
    <Link className={!productMode ? "is-active" : undefined} href={companyHref} aria-current={!productMode ? "page" : undefined}>
      <strong>Companies &amp; services</strong><span>Identity, capability and work evidence</span>
    </Link>
    <Link className={productMode ? "is-active" : undefined} href={productHref} aria-current={productMode ? "page" : undefined}>
      <strong>Products</strong><span>Price, minimum order and seller terms</span>
    </Link>
  </nav>;
}

function DirectorySearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { docked, setProgress, setQuery: setDockQuery, setCity: setDockCity } = useSearchDock();
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const initialQuery = params.get("q") || "";
  const initialCity = params.get("city") || "";
  const initialFamily = params.get("family") || "All service families";
  const productMode = params.get("scope") === "products";
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [family, setFamily] = useState(initialFamily);
  const [companies, setCompanies] = useState<DirectoryCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<DirectoryCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [companySort, setCompanySort] = useState<CompanySort>("best");

  useEffect(() => {
    setQuery(initialQuery);
    setCity(initialCity);
    setFamily(initialFamily);
    setDockQuery(initialQuery);
    setDockCity(initialCity || PAN_INDIA_LABEL);
  }, [initialQuery, initialCity, initialFamily, setDockCity, setDockQuery]);

  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor) return;
    let frame = 0;
    const updateDock = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setProgress(anchor.getBoundingClientRect().bottom <= 72 ? 1 : 0));
    };
    updateDock();
    window.addEventListener("scroll", updateDock, { passive: true });
    window.addEventListener("resize", updateDock);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateDock);
      window.removeEventListener("resize", updateDock);
      setProgress(0);
    };
  }, [setProgress]);

  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  useEffect(() => {
    let live = true;
    if (productMode) {
      setLoading(false);
      return () => { live = false; };
    }
    setLoading(true);
    setError(false);
    Promise.all([
      getFeaturedSellers(),
      searchSellers({ q: "", limit: 50 }).then((result) => result.sellers),
      initialQuery ? searchSellers({ q: initialQuery, limit: 30 }).then((result) => result.sellers) : Promise.resolve([]),
    ])
      .then(([featured, all, matches]) => {
        if (!live) return;
        const bySlug = new Map(
          [...featured, ...all, ...matches]
            .filter(isAlignedDirectoryCompany)
            .map((raw) => [raw.slug || raw.sellerSlug, raw]),
        );
        setCompanies([...bySlug.values()].map(mapDirectoryCompany).filter((value): value is DirectoryCompany => Boolean(value)));
      })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [initialQuery, productMode]);

  const filtered = useMemo(() => {
    const terms = initialQuery.trim().toLowerCase().split(/\s+/).filter((term) => term.length > 2 && !["near", "with", "from"].includes(term));
    const score = (company: DirectoryCompany) => {
      const searchable = [company.name, company.serviceFamily, ...company.capabilities, company.descriptor].join(" ").toLowerCase();
      return terms.filter((term) => searchable.includes(term)).length * 10 + (company.verified ? 2 : 0) + (company.rating || 0);
    };
    const matches = companies
      .filter((company) => {
        const searchable = [company.name, company.serviceFamily, ...company.capabilities, company.descriptor].join(" ").toLowerCase();
        return (terms.length === 0 || terms.some((term) => searchable.includes(term)))
          && (!initialCity || company.location.toLowerCase().includes(initialCity.toLowerCase()))
          && (family === "All service families" || company.serviceFamily === family)
          && (!verifiedOnly || company.verified);
      });
    return matches.sort((a, b) => {
      if (companySort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (companySort === "response") return (b.responseRate || 0) - (a.responseRate || 0);
      if (companySort === "name") return a.name.localeCompare(b.name);
      return score(b) - score(a);
    });
  }, [companies, initialQuery, initialCity, family, verifiedOnly, companySort]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (city.trim()) next.set("city", city.trim());
    if (productMode) next.set("scope", "products");
    else if (family !== "All service families") next.set("family", family);
    router.push(`/search?${next}`);
  }

  function clearFilters() {
    setFamily("All service families");
    setVerifiedOnly(false);
    setCompanySort("best");
    setCity("");
    router.push(initialQuery ? `/search?q=${encodeURIComponent(initialQuery)}` : "/search");
  }

  const selectedIndex = selectedCompany ? Math.max(0, filtered.findIndex((company) => company.id === selectedCompany.id)) : 0;
  const sharedParams = new URLSearchParams();
  if (initialQuery) sharedParams.set("q", initialQuery);
  if (initialCity) sharedParams.set("city", initialCity);
  const companyHref = `/search${sharedParams.size ? `?${sharedParams}` : ""}`;
  sharedParams.set("scope", "products");
  const productHref = `/search?${sharedParams}`;
  const productFilters: ListingFilterState = {
    city: initialCity || undefined,
    category: params.get("category") || undefined,
    priceMax: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    verified: params.get("verified") === "true" || undefined,
    featured: params.get("featured") === "true" || undefined,
  };

  return <div className="directory-design directory-results">
    <section className="directory-results-head">
      <div className="directory-shell">
        <h1>{productMode ? (initialQuery ? <>Products for “{initialQuery}”</> : "Browse product listings") : (initialQuery ? <>Companies for “{initialQuery}”</> : "Browse credible companies")}</h1>
        <p>{productMode ? "Compare product terms and seller context before opening the complete listing." : "Select a company to inspect its identity, capabilities and proof before opening the full profile."}</p>
        <form ref={searchAnchorRef} className="directory-search" onSubmit={submit} aria-hidden={docked || undefined}>
          <SearchIcon />
          <label><span className="sr-only">{productMode ? "Product or material" : "Company or need"}</span><input value={query} onChange={(event) => { setQuery(event.target.value); setDockQuery(event.target.value); }} placeholder={productMode ? "Product, material or specification" : "Company, service or business need"} /></label>
          <label><span className="sr-only">Location</span><input value={city} onChange={(event) => { setCity(event.target.value); setDockCity(event.target.value || PAN_INDIA_LABEL); }} placeholder="City or remote" /></label>
          <button type="submit">{productMode ? "Search products" : "Update results"} <Arrow /></button>
        </form>
      </div>
    </section>

    {productMode ? <div className="directory-shell directory-product-results">
      <SearchContextSwitch destination="recruitment" query={initialQuery} city={initialCity} />
      <DirectoryScopeSwitch productMode companyHref={companyHref} productHref={productHref} />
      <div className="directory-product-results-engine">
        <DiscoveryResults baseQuery={{ type: "product" }} initialFilters={productFilters} query={initialQuery} syncUrl enableCategoryFilter showTypeFilter={false} defaultSort="relevance" emptyTitle="No products match these filters" emptyMessage="Try another category, city or price range." />
      </div>
    </div> : <div className={`directory-shell directory-results-layout${selectedCompany ? " has-selection" : ""}`}>
      <section className="directory-results-main" aria-label="Company results">
        <SearchContextSwitch destination="recruitment" query={initialQuery} city={initialCity} />
        <DirectoryScopeSwitch productMode={false} companyHref={companyHref} productHref={productHref} />
        <section className="directory-mobile-filters" aria-label="Filter companies">
          <div className="directory-mobile-filter-heading"><strong>Filters</strong><small>Service family, trust and order</small></div>
          <div className="directory-mobile-filter-body">
            <CompanyFilterControls family={family} verifiedOnly={verifiedOnly} sort={companySort} onFamilyChange={setFamily} onVerifiedChange={setVerifiedOnly} onSortChange={setCompanySort} onClear={clearFilters} />
          </div>
        </section>
        <div className="directory-result-count">
          <strong aria-live="polite">{loading ? "Finding companies…" : `${filtered.length} ${filtered.length === 1 ? "company" : "companies"}`}</strong>
          <span>Choose a record for a quick evidence preview</span>
        </div>
        {error && <div className="directory-empty" role="status">Company results could not be loaded. Please try again.</div>}
        <div className="directory-result-list">
          {loading
            ? [1, 2, 3].map((item) => <div className="directory-result-row is-loading" key={item} />)
            : filtered.map((company, index) => <Fragment key={company.id}>
              <article className={`directory-result-item${selectedCompany?.id === company.id ? " is-expanded" : ""}`}>
                <button type="button" className={`directory-result-row${selectedCompany?.id === company.id ? " is-selected" : ""}`} onClick={() => setSelectedCompany((current) => current?.id === company.id ? null : company)} aria-label={`Inspect ${company.name}`} aria-expanded={selectedCompany?.id === company.id}>
                  <Avatar src={company.logo} name={company.name} size={56} />
                  <div className="directory-result-copy">
                    <span className="directory-result-status">{company.verified ? "Identity verified" : "Profile available"}</span>
                    <h2>{company.name}</h2>
                    <p>{company.location} · {company.serviceFamily}</p>
                    <ul>{company.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
                  </div>
                  <div className="directory-result-meta">
                    {company.rating ? <strong>{company.rating.toFixed(1)} / 5</strong> : <strong>New record</strong>}
                    <span>{company.reviewCount} reviews</span>
                    <span>{company.responseRate ? `${company.responseRate}% response rate` : "Response data unavailable"}</span>
                    <b>{selectedCompany?.id === company.id ? "Viewing details" : "Inspect here"} <Arrow /></b>
                  </div>
                </button>
                {selectedCompany?.id === company.id && <CompanyInspection company={company} mediaIndex={index} className="directory-inspection-inline" onClose={() => setSelectedCompany(null)} />}
              </article>
              {index === 7 && <div className="directory-mobile-ad"><DirectoryPartnerAd /></div>}
            </Fragment>)}
        </div>
        {!loading && !error && filtered.length === 0 && <div className="directory-empty"><strong>No aligned companies match these filters.</strong><p>Try a broader need, remove the location, or browse another service family.</p></div>}
      </section>

      {selectedCompany && <CompanyInspection company={selectedCompany} mediaIndex={selectedIndex} className="directory-inspection-desktop" onClose={() => setSelectedCompany(null)} />}

      <div className="directory-filter-rail">
        <aside className="directory-filter-panel" aria-label="Filter companies">
          <div><span>Refine</span><h2>Find the right fit</h2></div>
          <CompanyFilterControls family={family} verifiedOnly={verifiedOnly} sort={companySort} onFamilyChange={setFamily} onVerifiedChange={setVerifiedOnly} onSortChange={setCompanySort} onClear={clearFilters} />
        </aside>
        <div className="directory-rail-ad"><DirectoryPartnerAd /></div>
      </div>
    </div>}
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="directory-shell directory-section">Loading company results…</div>}><DirectorySearchResults /></Suspense>;
}
