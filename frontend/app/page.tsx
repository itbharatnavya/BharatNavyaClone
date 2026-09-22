"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HomeAgent from "@/components/home/HomeAgent";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import { getBlogs, getJobs, searchSellers } from "@/lib/api";
import type { Blog } from "@/lib/types";
import { useSearchDock } from "@/lib/searchDock";
import { useConfig } from "@/lib/config";

function DirectoryIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2m-8 4h2m4 0h2M9 21v-3h6v3" /></svg>; }
function RecruitmentIcon() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></svg>; }
function GrowthIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2M4 9l6-4 6 7 4-5" /></svg>; }

const standards = [
  {
    id: "identity",
    label: "Identity",
    title: "Know who is behind the record.",
    body: "Company ownership, location and verification context stay connected to the work or opportunity being presented.",
    signal: "Source named",
    facts: ["Company identity", "Location context", "Verification status"],
    media: "/seed-media/company/company-4.jpg",
    alt: "A business team presenting its work and identity",
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "See more than a polished claim.",
    body: "Capabilities, work samples, reviews and public updates help people assess substance before making contact.",
    signal: "Proof visible",
    facts: ["Capabilities", "Recent work", "Public reviews"],
    media: "/seed-media/work/work-1.jpg",
    alt: "A team reviewing visible work evidence",
  },
  {
    id: "context",
    label: "Context",
    title: "Understand the terms before acting.",
    body: "Useful details such as working scope, salary, workplace and freshness appear where a decision is being made.",
    signal: "Terms clear",
    facts: ["Working terms", "Current context", "Decision details"],
    media: "/seed-media/company/company-2.jpg",
    alt: "Colleagues discussing work and opportunity context",
  },
  {
    id: "closure",
    label: "Next step",
    title: "Know what happens after the click.",
    body: "Structured inquiries and applications are designed around visible progress, communication and an explicit outcome.",
    signal: "Path visible",
    facts: ["Clear action", "Progress state", "Terminal outcome"],
    media: "/seed-media/work/work-4.jpg",
    alt: "A team following a shared decision timeline",
  },
];

const journey = [
  { label: "Intent", title: "Arrive with intent", body: "Describe a business need, company or role in plain language." },
  { label: "Record", title: "Inspect the record", body: "Read identity, evidence, terms and recent public context together." },
  { label: "Compare", title: "Compare with clarity", body: "Keep the signals that matter visible before choosing a next step." },
  { label: "Action", title: "Move with context", body: "Contact or apply through the existing structured flow." },
];

export default function BharatNavyaHome() {
  const { docked, setProgress } = useSearchDock();
  const { featureFlags } = useConfig();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [sellerBlogs, setSellerBlogs] = useState<Blog[]>([]);
  const [employerBlogs, setEmployerBlogs] = useState<Blog[]>([]);
  const [companyTotal, setCompanyTotal] = useState<number | null>(null);
  const [jobTotal, setJobTotal] = useState<number | null>(null);
  const [activeStandardId, setActiveStandardId] = useState("identity");
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);

  const recruitmentLive = featureFlags.recruitmentLive;

  useEffect(() => {
    let active = true;
    Promise.allSettled([getBlogs({ authorType: "seller" }), getBlogs({ authorType: "employer" })]).then((results) => {
      if (!active) return;
      const [sellerBlogResult, employerBlogResult] = results;
      if (sellerBlogResult.status === "fulfilled") setSellerBlogs(sellerBlogResult.value || []);
      if (employerBlogResult.status === "fulfilled") setEmployerBlogs(employerBlogResult.value || []);
    });
    return () => { active = false; };
  }, []);

  // Live counts for the two gateway tiles — real totals from the existing public
  // endpoints. Roles are only counted when Recruitment is live.
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      searchSellers({ q: "", limit: 1 }),
      recruitmentLive ? getJobs({ limit: 1 }) : Promise.resolve(null),
    ]).then(([companyResult, jobResult]) => {
      if (!active) return;
      if (companyResult.status === "fulfilled" && companyResult.value) {
        setCompanyTotal(Number(companyResult.value.total) || 0);
      }
      if (jobResult.status === "fulfilled" && jobResult.value) {
        setJobTotal(Number(jobResult.value.total) || 0);
      }
    });
    return () => { active = false; };
  }, [recruitmentLive]);

  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const searchField = anchor.querySelector("form") || anchor;
    const observer = new IntersectionObserver(([entry]) => {
      const shouldDock = !entry.isIntersecting && entry.boundingClientRect.bottom <= 72;
      if (heroFocusedRef.current && shouldDock) { pendingDockRef.current = true; return; }
      pendingDockRef.current = null;
      setProgress(shouldDock ? 1 : 0);
    }, { threshold: 0.08, rootMargin: "-72px 0px 0px 0px" });
    observer.observe(searchField);
    return () => { observer.disconnect(); setProgress(0); };
  }, [setProgress]);

  useEffect(() => {
    const searchField = searchAnchorRef.current?.querySelector("form");
    searchField?.toggleAttribute("inert", docked);
    if (docked) searchField?.setAttribute("aria-hidden", "true");
    else searchField?.removeAttribute("aria-hidden");
  }, [docked]);

  const guides = [...sellerBlogs, ...employerBlogs].filter((blog) => blog.coverImage).slice(0, 3);
  const activeStandard = standards.find((standard) => standard.id === activeStandardId) || standards[0];
  const activeJourney = journey[activeJourneyIndex];

  const directorySignal = companyTotal ? `${companyTotal.toLocaleString("en-IN")} companies with a public record` : "Companies, capabilities and proof";
  const recruitmentSignal = recruitmentLive && jobTotal ? `${jobTotal.toLocaleString("en-IN")} roles open now` : "Roles, workplaces and hiring context";

  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><div className="le-hero-decor" aria-hidden="true" /><div className="le-shell">
      <h1 id="home-title"><span>Bharat Navya</span> turns scattered signals into clearer decisions.</h1>
      <p>Understand companies, work and opportunities across India before you contact, shortlist or apply.</p>
      <div ref={searchAnchorRef} className="bn-home-suite" onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}>
        <HomeAgent variant="feature" />
        <div className="le-gateways" aria-label="Explore Bharat Navya">
          <Link href="/directory" className="le-gateway is-directory"><span><DirectoryIcon /></span><span><strong>Directory</strong><small>{directorySignal}</small></span><b aria-hidden>→</b></Link>
          <Link href="/recruitment" className="le-gateway is-recruitment"><span><RecruitmentIcon /></span><span><strong>Recruitment</strong><small>{recruitmentSignal}</small></span><b aria-hidden>→</b></Link>
          <div className="le-gateway is-growth" aria-disabled="true"><span><GrowthIcon /></span><span><em>Coming soon</em><strong>Growth OS</strong><small>Guided decisions for growing a business</small></span></div>
        </div>
      </div>
      <div className="bn-home-hero-ledger" aria-label="The Bharat Navya standard">
        <span><b>One</b> connected company identity</span>
        <span><b>Four</b> decision signals</span>
        <span><b>Before</b> action, not after</span>
      </div>
    </div></section>

    <section className="le-section bn-home-standard" aria-labelledby="standard-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="standard-title">Why Bharat Navya exists.</h2></div><p>Most listings ask for action too early. Bharat Navya makes the record more useful first.</p></header>
      <div className="bn-home-standard-stage">
        <div className="bn-home-standard-tabs" aria-label="Explore the Bharat Navya record standard">{standards.map((standard) => <button key={standard.id} type="button" aria-pressed={standard.id === activeStandard.id} onClick={() => setActiveStandardId(standard.id)} onMouseEnter={() => setActiveStandardId(standard.id)} onFocus={() => setActiveStandardId(standard.id)}><strong>{standard.label}</strong><small>{standard.signal}</small></button>)}</div>
        <div className="bn-home-standard-record" key={activeStandard.id} aria-live="polite">
          <EvidenceMedia key={activeStandard.id} asset={{ src: activeStandard.media, alt: activeStandard.alt, kind: "work-sample", source: "prototype", attribution: "Prototype evidence media" }} ratio="wide" />
          <div className="bn-home-standard-copy"><h3>{activeStandard.title}</h3><p>{activeStandard.body}</p><ul>{activeStandard.facts.map((fact) => <li key={fact}>{fact}<b>Visible</b></li>)}</ul></div>
        </div>
      </div>
    </div></section>

    <section className="bn-home-contrast" aria-labelledby="contrast-title"><div className="le-shell">
      <div className="bn-home-contrast-heading"><h2 id="contrast-title">A listing tells you what exists. A Bharat Navya record helps you decide.</h2><p>The difference is not more noise. It is the right context, attached to the right source, at the right moment.</p></div>
      <div className="bn-home-contrast-board">
        <div className="is-thin"><span>Thin listing</span><strong>Company or role name</strong><p>Category · Location</p><b>Contact now</b></div>
        <div className="is-navya"><span>Bharat Navya record</span><strong>Identity connected to evidence</strong><ul><li>Who is behind it</li><li>What supports it</li><li>Which terms matter</li><li>What happens next</li></ul></div>
      </div>
    </div></section>

    <section className="bn-home-journey" aria-labelledby="journey-title"><div className="le-shell">
      <header className="bn-home-journey-head"><h2 id="journey-title">From intent to action.</h2><p>Four simple stages. The context you need stays visible as you move forward.</p></header>
      <div className="bn-home-journey-experience" data-step={activeJourneyIndex}>
        <div className="bn-home-journey-track" role="tablist" aria-label="Decision stages">
          {journey.map((step, index) => <button key={step.label} type="button" role="tab" aria-selected={index === activeJourneyIndex} aria-controls="journey-focus" id={`journey-tab-${index}`} onClick={() => setActiveJourneyIndex(index)}><span>{step.label}</span></button>)}
        </div>
        <article key={activeJourney.label} id="journey-focus" className="bn-home-journey-focus" role="tabpanel" aria-labelledby={`journey-tab-${activeJourneyIndex}`}>
          <div className="bn-home-journey-copy"><span>Step {activeJourneyIndex + 1} of {journey.length}</span><h3>{activeJourney.title}</h3><p>{activeJourney.body}</p></div>
        </article>
      </div>
    </div></section>

    <ApiAdvertisingSlot placement={["home_hero", "category_top"]} kind="native" context="Sponsored on Bharat Navya" summary="A clearly labelled promotion, kept separate from organic records and decision signals." action="View promotion" />

    {guides.length > 0 &&
      <section className="le-section is-tinted bn-home-guides" aria-labelledby="guides-title">
        <div className="le-shell">
          <header className="le-section-head">
            <div>
              <h2 id="guides-title">Context worth carrying forward.</h2>
            </div>
            <Link className="le-button" href="/blog">View all guides</Link>
          </header>
          <div className="le-editorial-grid">
            {guides.map((guide) =>
              <Link href={`/blog/${guide.slug}`} key={guide.id}>
                <EvidenceMedia asset={{ src: guide.coverImage!, alt: `Cover for ${guide.title}`, kind: "article", source: "api" }} ratio="wide" />
                <span className="le-editorial-copy">
                  <small>{guide.author?.companyName || guide.authorName || "Bharat Navya"}</small>
                  <strong>{guide.title}</strong>
                  {/* <p>{guide.excerpt || "Practical context for growing companies and applicants."}</p> */}
                </span>
              </Link>)
            }
          </div>
        </div>
      </section>
    }

  </div>;
}
