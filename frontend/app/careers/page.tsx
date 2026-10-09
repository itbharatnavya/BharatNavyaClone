"use client";

// About > Careers: why join, the teams we hire for, how hiring works (a real sequence, so the
// steps are numbered), and open roles. Roles come from OPEN_ROLES in components/about/company.tsx;
// when it's empty the page says so and points to jobs on Bharat Navya Recruitment instead. A
// "send your profile" line appears only once COMPANY.careersEmail is set.

import Link from "next/link";
import AboutShell from "@/components/about/AboutShell";
import { COMPANY, OPEN_ROLES, TEAMS } from "@/components/about/company";

const WHY = [
  { title: "Real users from day one", body: "Business owners, buyers and job seekers use what you build." },
  { title: "Own whole problems", body: "You take an idea from the first sketch to live on the site." },
  { title: "See your work ship", body: "Small team, short loops. Changes go live in days, not months." },
  { title: "Work across products", body: "Directory, Recruitment and Ask Navya share one platform." },
];

const STEPS = [
  { title: "Apply", body: "Send your profile and a line on why this role." },
  { title: "Intro call", body: "A short call to get to know each other." },
  { title: "Show your work", body: "Walk us through past work or a small task." },
  { title: "Offer", body: "We move fast and tell you where you stand." },
];

const Arrow = () => <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default function CareersPage() {
  return <AboutShell id="careers-title" title={<><span>Build what India&rsquo;s</span> businesses run on.</>} lead="Join a small team working on Directory, Recruitment and Ask Navya."
    actions={<Link className="le-button is-primary" href="#open-roles">See open roles</Link>}>
    <section className="hs-sec" aria-labelledby="why-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="why-title">Why work here</h2></div></header>
      <ul className="ap-ways ap-stagger" role="list">
        {WHY.map((item) => <li key={item.title}><h3>{item.title}</h3><p>{item.body}</p></li>)}
      </ul>
    </div></section>

    <section className="hs-sec" aria-labelledby="hire-teams-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="hire-teams-title">Teams we hire for</h2></div></header>
      <ul className="ap-cards ap-stagger" role="list">
        {TEAMS.map((team) => <li key={team.name}><span className="hs-prod-icon">{team.icon}</span><h3>{team.name}</h3><p>{team.body}</p></li>)}
      </ul>
    </div></section>

    <section className="hs-sec" aria-labelledby="how-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="how-title">How hiring works</h2></div></header>
      <ol className="ap-steps ap-stagger">
        {STEPS.map((step, index) => <li key={step.title}><b>{index + 1}</b><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </div></section>

    <section className="hs-sec" id="open-roles" aria-labelledby="roles-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="roles-title">Open roles</h2></div></header>
      {OPEN_ROLES.length ? <ul className="ap-roles ap-stagger" role="list">
        {OPEN_ROLES.map((role) => <li key={role.href}><Link href={role.href}>
          <span><strong>{role.title}</strong><small>{[role.team, role.location, role.type].join(" · ")}</small></span>
          <Arrow />
        </Link></li>)}
      </ul> : <div className="ap-empty ap-rise">
        <h3>No open roles right now.</h3>
        <p>{COMPANY.careersEmail ? <>We still want to hear from good people. Send your profile to <a href={`mailto:${COMPANY.careersEmail}`}>{COMPANY.careersEmail}</a>.</> : "New roles are posted here first. In the meantime, browse jobs from other companies on Bharat Navya."}</p>
        <Link className="le-button" href="/recruitment/jobs">Browse jobs on Bharat Navya</Link>
      </div>}
    </div></section>
  </AboutShell>;
}
