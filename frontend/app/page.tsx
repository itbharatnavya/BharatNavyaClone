"use client";

import { useState } from "react";
import HeroStage from "@/components/home/HeroStage";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";


const standards = [
  {
    id: "identity",
    label: "Identity",
    title: "Know who you’re dealing with.",
    body: "Understand who is behind every listing—the company, supplier, manufacturer, service provider, or employer—and what the organisation represents.",
    signal: "Source named",
    facts: ["Company identity", "Location context", "Verification status"],
    media: "/seed-media/company/company-4.jpg",
    alt: "A business team presenting its work and identity",
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "See the substance behind the offer.",
    body: "Look beyond a name or headline. Explore the products, services, capabilities, work samples, and details that show what a business actually offers.",
    signal: "Proof visible",
    facts: ["Capabilities", "Recent work", "Public reviews"],
    media: "/seed-media/work/work-1.jpg",
    alt: "A team reviewing visible work evidence",
  },
  {
    id: "context",
    label: "Context",
    title: "Understand the meaning behind the information.",
    body: "Bring the relevant details together so you can understand an offering, role, category, and business context before making a decision.",
    signal: "Terms clear",
    facts: ["Working terms", "Current context", "Decision details"],
    media: "/seed-media/company/company-2.jpg",
    alt: "Colleagues discussing work and opportunity context",
  },
  {
    id: "closure",
    label: "Next step",
    title: "See the move that follows.",
    body: "Compare options, shortlist businesses, send enquiries, apply for roles, or continue exploring with a clearer path from information to opportunity.",
    signal: "Path visible",
    facts: ["Clear action", "Progress state", "Terminal outcome"],
    media: "/seed-media/work/work-4.jpg",
    alt: "A team following a shared decision timeline",
  },
];

const journey = [
  { label: "Intent", title: "Start with what you need", body: "Define the product, supplier, service, company, role, or business opportunity you are looking for." },
  { label: "Record", title: "See the business behind it", body: "Explore structured records with company details, offerings, capabilities, and relevant information in one place." },
  { label: "Compare", title: "Understand your options", body: "Review and shortlist businesses, products, services, or roles against the details that matter to you." },
  { label: "Action", title: "Turn discovery into action", body: "Send an enquiry, apply for a role, or take the next step directly from what you have explored." },
];

export default function BharatNavyaHome() {
  const [activeStandardId, setActiveStandardId] = useState("identity");
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);
  const activeStandard = standards.find((standard) => standard.id === activeStandardId) || standards[0];
  const activeJourney = journey[activeJourneyIndex];

  return <div className="le-page counter-home-page">
    <section className="le-hero bn-home-hero" aria-labelledby="home-title"><div className="le-shell">
      <h1 id="home-title"><span>The B2B platform</span> built for what’s next.</h1>
      <p>Discover products, evaluate suppliers, explore roles, and turn everyday business requirements into new opportunities.</p>
      <HeroStage />
    </div></section>

    <section className="le-section bn-home-standard" aria-labelledby="standard-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="standard-title">Why Bharat Navya?</h2></div><p>Bharat Navya brings companies, products, services, professionals, and opportunities into one structured ecosystem.</p></header>
      <div className="bn-home-standard-stage">
        <div className="bn-home-standard-tabs" aria-label="Explore the Bharat Navya record standard">{standards.map((standard) => <button key={standard.id} type="button" aria-pressed={standard.id === activeStandard.id} onClick={() => setActiveStandardId(standard.id)} onMouseEnter={() => setActiveStandardId(standard.id)} onFocus={() => setActiveStandardId(standard.id)}><strong>{standard.label}</strong><small>{standard.signal}</small></button>)}</div>
        <div className="bn-home-standard-record" key={activeStandard.id} aria-live="polite">
          <EvidenceMedia key={activeStandard.id} asset={{ src: activeStandard.media, alt: activeStandard.alt, kind: "work-sample", source: "prototype", attribution: "Prototype evidence media" }} ratio="wide" />
          <div className="bn-home-standard-copy"><h3>{activeStandard.title}</h3><p>{activeStandard.body}</p><ul>{activeStandard.facts.map((fact) => <li key={fact}>{fact}<b>Visible</b></li>)}</ul></div>
        </div>
      </div>
    </div></section>

    <section className="bn-home-contrast" aria-labelledby="contrast-title"><div className="le-shell">
      <div className="bn-home-contrast-heading"><h2 id="contrast-title">The value is in what a listing doesn’t show at first glance.</h2><p>Bharat Navya brings important details closer to the surface, giving businesses, products, services, and roles more substance than a name, category, and contact point.</p></div>
      <div className="bn-home-contrast-board">
        <div className="is-thin"><span>Thin listing</span><strong>Company or role name</strong><p>Category · Location</p><b>Contact now</b></div>
        <div className="is-navya"><span>Bharat Navya record</span><strong>Identity connected to evidence</strong><ul><li>Who is behind it</li><li>What supports it</li><li>Which terms matter</li><li>What happens next</li></ul></div>
      </div>
    </div></section>

    <section className="bn-home-journey" aria-labelledby="journey-title"><div className="le-shell">
      <header className="bn-home-journey-head"><h2 id="journey-title">From intent to action.</h2><p>Move from a clear need to a useful next step without losing the context behind each option.</p></header>
      <div className="bn-home-journey-experience" data-step={activeJourneyIndex}>
        <div className="bn-home-journey-track" role="tablist" aria-label="Decision stages">
          {journey.map((step, index) => <button key={step.label} type="button" role="tab" aria-selected={index === activeJourneyIndex} aria-controls="journey-focus" id={`journey-tab-${index}`} onClick={() => setActiveJourneyIndex(index)}><span>{step.label}</span></button>)}
        </div>
        <article key={activeJourney.label} id="journey-focus" className="bn-home-journey-focus" role="tabpanel" aria-labelledby={`journey-tab-${activeJourneyIndex}`}>
          <div className="bn-home-journey-copy"><span>Step {activeJourneyIndex + 1} of {journey.length}</span><h3>{activeJourney.title}</h3><p>{activeJourney.body}</p></div>
        </article>
      </div>
    </div></section>

    <ApiAdvertisingSlot placement={["home_hero", "category_top"]} kind="native" context="Sponsored on Bharat Navya" fallbackTitle="Put your business in front of people looking for what you do." fallbackSummary="Feature your business where relevant users are exploring products, services, and suppliers—without changing organic ranking or verification." fallbackAction="Explore placements" summary="A clearly labelled promotion, kept separate from organic records and decision signals." action="View promotion" />

  </div>;
}
