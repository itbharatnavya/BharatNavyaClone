"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UniversalSearch from "@/components/home/UniversalSearch";
import NativePromotionSlot from "@/components/home/NativePromotionSlot";
import Avatar from "@/components/Avatar";
import { useFeaturedSellers } from "@/lib/catalog";
import { getJobs, getRecentActivity } from "@/lib/api";
import type { Job, RecentActivityItem } from "@/lib/types";
import { mapDirectoryCompany, mapRecruitmentJob, relativeAge } from "@/lib/productDesign";

function DirectoryIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2m-8 4h2m4 0h2M9 21v-3h6v3"/></svg>; }
function RecruitmentIcon() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></svg>; }
function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>; }
function Check() { return <svg aria-hidden viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>; }

const proofStories = [
  { id: "company", label: "A credible company", summary: "Identity, capability and evidence stay together.", title: "Know who is behind the work.", body: "A company record brings verified identity, service context, work evidence and reviews into one decision surface.", checks: ["Claim and verification status", "Capabilities and work evidence", "Structured inquiry"] },
  { id: "role", label: "A role with context", summary: "Salary, workplace and freshness stay visible.", title: "Understand the role before applying.", body: "Job records keep the hiring company, salary context, workplace preference and closing information easy to inspect.", checks: ["Named hiring company", "Salary and workplace context", "Published and closing dates"] },
  { id: "closure", label: "A process with closure", summary: "Actions do not disappear into a black box.", title: "Keep the next step accountable.", body: "Inquiries and applications are designed around visible progress, communication and an explicit outcome.", checks: ["Clear submission state", "Stage updates", "Terminal outcome"] },
];

export default function BharatNavyaHome() {
  const { sellers, loading: sellersLoading } = useFeaturedSellers();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeProofId, setActiveProofId] = useState("company");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getJobs({ limit: 4 }), getRecentActivity({ limit: 5 })]).then(([jobResult, activityResult]) => {
      if (!active) return;
      if (jobResult.status === "fulfilled") setJobs(jobResult.value.jobs || []);
      if (activityResult.status === "fulfilled") setActivity(activityResult.value || []);
      setLoadFailed(jobResult.status === "rejected" && activityResult.status === "rejected");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const companies = useMemo(() => sellers.map(mapDirectoryCompany).filter((value): value is NonNullable<typeof value> => Boolean(value)).slice(0, 3), [sellers]);
  const roles = useMemo(() => jobs.map(mapRecruitmentJob).slice(0, 3), [jobs]);
  const activeProof = proofStories.find((story) => story.id === activeProofId) || proofStories[0];
  const visibleActivity = activity.length ? activity.slice(0, 4) : [{ reviewId:"fallback", sellerName:"Bharat Navya businesses", sellerSlug:null, sellerCity:"Across India", reviewText:"Public updates, verified reviews and work evidence will appear here as businesses share them.", createdAt:new Date().toISOString(), rating:5, buyerName:"", buyerAvatarUrl:null, sellerId:"", whatsappNumber:null, image:null }];
  const selectedActivity = visibleActivity.find((item) => item.reviewId === selectedActivityId) || visibleActivity[0];

  return <div className="bn-home">
    <section className="bn-hero" aria-labelledby="home-title">
      <div className="bn-hero-orb bn-hero-orb-left" aria-hidden /><div className="bn-hero-orb bn-hero-orb-right" aria-hidden />
      <div className="bn-container bn-hero-inner">
        <p className="bn-eyebrow">Companies, work and opportunity—connected</p>
        <h1 id="home-title">Move your next business<br />decision forward.</h1>
        <p className="bn-lead">Find credible companies, useful services, and transparent startup and SME roles across India.</p>
        <UniversalSearch />
        <div className="bn-gateways" aria-label="Explore Bharat Navya">
          <Link href="/directory" className="bn-gateway"><span className="bn-gateway-icon bn-directory-icon"><DirectoryIcon /></span><span>Directory</span></Link>
          <Link href="/recruitment" className="bn-gateway"><span className="bn-gateway-icon bn-recruitment-icon"><RecruitmentIcon /></span><span>Recruitment</span></Link>
        </div>
      </div>
    </section>

    <section className="bn-section bn-proof-section" aria-labelledby="proof-title">
      <div className="bn-container bn-split-heading"><div><p className="bn-kicker">Inspect before you act</p><h2 id="proof-title">Useful proof, not empty claims.</h2></div><p>Identity, working context, fresh roles and clear next steps are surfaced where they help a decision.</p></div>
      <div className="bn-proof-story">
        <div className="bn-proof-tabs" role="group" aria-label="Bharat Navya trust principles">
          {proofStories.map((story, index) => <button key={story.id} type="button" aria-pressed={story.id === activeProofId} onClick={() => setActiveProofId(story.id)} onFocus={() => setActiveProofId(story.id)} onMouseEnter={() => setActiveProofId(story.id)}><span>0{index + 1}</span><strong>{story.label}</strong><small>{story.summary}</small></button>)}
        </div>
        <article id="bn-proof-panel" className="bn-proof-panel" aria-live="polite">
          <span className="bn-proof-number">Selected proof</span><h3>{activeProof.title}</h3><p>{activeProof.body}</p><ul>{activeProof.checks.map((check) => <li key={check}><Check />{check}</li>)}</ul>
          {activeProof.id === "role" && <div className="bn-mini-role"><Avatar src={roles[0]?.companyLogo} name={roles[0]?.companyName || "Hiring company"} size={46} /><div><strong>{roles[0]?.title || "Operations Manager"}</strong><span>{roles[0]?.companyName || "Verified hiring company"}</span></div></div>}
          {activeProof.id === "closure" && <><div className="bn-stage"><span className="done">Applied</span><span className="done">Reviewed</span><span>Decision</span></div><small>Illustrative process—not a live application.</small></>}
        </article>
      </div>
    </section>

    <section className="bn-section bn-record-section" aria-labelledby="records-title">
      <div className="bn-container"><div className="bn-section-heading"><div><p className="bn-kicker">Start with real records</p><h2 id="records-title">Companies to assess. Roles to explore.</h2></div><p>Live public data is adapted into a clearer, company-first view.</p></div>
        {loadFailed && <div className="bn-state" role="status" aria-live="polite">Live records are temporarily unavailable. Directory and Recruitment remain available.</div>}
        <div className="bn-record-columns">
          <div><div className="bn-column-label"><span>Directory</span><Link href="/directory">Explore all <Arrow /></Link></div>
            {(sellersLoading ? [1,2,3] : companies).map((company, index) => typeof company === "number" ? <div className="bn-record bn-skeleton" key={company} /> : <Link className="bn-record" key={company.id} href={`/seller/${company.slug}`}><Avatar src={company.logo} name={company.name} size={50} /><div><strong>{company.name}</strong><span>{company.location} · {company.verified ? "Identity verified" : "Profile available"}</span><p>{company.descriptor}</p></div><Arrow /></Link>)}
            {!sellersLoading && companies.length === 0 && <div className="bn-state">No featured companies yet. Browse Directory to search all companies.</div>}
          </div>
          <div><div className="bn-column-label"><span>Recruitment</span><Link href="/recruitment/jobs">Explore all <Arrow /></Link></div>
            {(loading ? [1,2,3] : roles).map((role, index) => typeof role === "number" ? <div className="bn-record bn-skeleton" key={role} /> : <Link className="bn-record" key={role.id} href={`/job/${role.id}`}><Avatar src={role.companyLogo} name={role.companyName} size={50} /><div><strong>{role.title}</strong><span>{role.companyName} · {role.location}</span><p>{role.salary} · {relativeAge(role.postedAt)}</p></div><Arrow /></Link>)}
            {!loading && roles.length === 0 && <div className="bn-state">No active roles right now. Visit Recruitment to set your search.</div>}
          </div>
        </div>
      </div>
    </section>

    <section className="bn-section bn-journey-section" aria-labelledby="journey-title"><div className="bn-container"><p className="bn-kicker">One connected journey</p><h2 id="journey-title">Discover. Inspect. Decide. Stay informed.</h2><div className="bn-journey"><div><b>1</b><h3>Describe the need</h3><p>Search in plain language and land in the right section.</p></div><div><b>2</b><h3>Inspect context</h3><p>Compare evidence, fit, working terms and current activity.</p></div><div><b>3</b><h3>Take a structured action</h3><p>Contact a company or apply to a role with clear expectations.</p></div><div><b>4</b><h3>Receive closure</h3><p>Track the request or application instead of losing the thread.</p></div></div></div></section>

    <section className="bn-section bn-activity-section" aria-labelledby="activity-title"><div className="bn-container"><div className="bn-section-heading"><div><p className="bn-kicker">Public activity</p><h2 id="activity-title">What businesses are doing now.</h2></div><p>Recent public reviews and work context add texture without exposing private activity.</p></div>
      <div className="bn-activity-grid"><div className="bn-activity-media">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={selectedActivity.image || "/demo/business-1.jpg"} alt={selectedActivity.image ? `Work shared by ${selectedActivity.sellerName}` : "A small business team working together"} /></div><div className="bn-activity-list">{visibleActivity.map((item) => <article key={item.reviewId} className={item.reviewId === selectedActivity.reviewId ? "is-selected" : undefined}><button type="button" onClick={() => setSelectedActivityId(item.reviewId)} onFocus={() => setSelectedActivityId(item.reviewId)} onMouseEnter={() => setSelectedActivityId(item.reviewId)} aria-pressed={item.reviewId === selectedActivity.reviewId}><span>{item.sellerCity || "India"}</span><h3>{item.sellerName}</h3><p>{item.reviewText}</p></button>{item.sellerSlug && <Link href={`/seller/${item.sellerSlug}`}>View company <Arrow /></Link>}</article>)}</div></div>
      <div className="bn-activity-summary"><section><p className="bn-kicker">Current opportunities</p><h3>Fresh reasons to look again</h3>{roles.slice(0,2).map(role => <Link key={role.id} href={`/job/${role.id}`}><span>{role.workplace} · {relativeAge(role.postedAt)}</span><strong>{role.title}</strong><small>{role.companyName} · {role.location}</small></Link>)}{!loading && roles.length === 0 && <p>No current public roles are available.</p>}</section><section><p className="bn-kicker">Platform snapshot</p><h3>Public context, without inflated claims</h3><dl><div><dt>Featured companies</dt><dd>{companies.length}</dd></div><div><dt>Fresh roles</dt><dd>{roles.length}</dd></div><div><dt>Public signals</dt><dd>{activity.length}</dd></div></dl><Link href="/directory">Explore current companies <Arrow /></Link></section></div>
    </div></section>

    <NativePromotionSlot />

    <section className="bn-section bn-closing"><div className="bn-container"><div><p className="bn-eyebrow">Build the next decision on better context</p><h2>Find the company—or the opportunity—that moves your work forward.</h2><div><Link href="/directory" className="bn-button bn-button-light">Explore Directory</Link><Link href="/recruitment" className="bn-button bn-button-ghost">Explore Recruitment</Link></div></div></div></section>
  </div>;
}
