"use client";

// About > Team. Leadership cards come from LEADERSHIP in components/about/company.tsx: until a
// name/photo/bio is filled in, a card shows the role and what it looks after, with a monogram
// in place of the photo. Then how the team is split up, how we work, and a nudge to Careers.

import Link from "next/link";
import AboutShell from "@/components/about/AboutShell";
import { LEADERSHIP, TEAMS } from "@/components/about/company";

const WAYS = [
  { title: "Phone first", body: "Most of our users are on a phone. Every screen is built for that first." },
  { title: "Plain words", body: "If a business owner has to read it twice, we rewrite it." },
  { title: "Proof over promises", body: "Verified details and real reviews beat big claims." },
  { title: "Small team, full ownership", body: "Each person owns a whole problem, start to finish." },
];

export default function TeamPage() {
  const named = LEADERSHIP.some((person) => person.name);
  return <AboutShell id="team-title" title={<><span>The people</span> behind Bharat Navya.</>} lead="A small team building simple tools for Indian businesses.">
    <section className="hs-sec" aria-labelledby="lead-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="lead-title">Leadership</h2></div></header>
      <ul className="ap-people ap-stagger" role="list">
        {LEADERSHIP.map((person) => <li key={person.role} className="ap-person">
          <span className="ap-person-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {person.photo ? <img src={person.photo} alt={person.name || person.role} /> : <b aria-hidden>{(person.name || person.role).charAt(0)}</b>}
          </span>
          <div>
            {person.name && <h3>{person.name}</h3>}
            <p className={person.name ? "ap-person-role" : "ap-person-role is-title"}>{person.role}</p>
            <p className="ap-person-area">{person.bio || person.area}</p>
          </div>
        </li>)}
      </ul>
      {!named && <p className="ap-note">Names and photos coming soon.</p>}
    </div></section>

    <section className="hs-sec" aria-labelledby="teams-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="teams-title">How the team is set up</h2></div></header>
      <ul className="ap-cards ap-stagger" role="list">
        {TEAMS.map((team) => <li key={team.name}>
          <span className="hs-prod-icon">{team.icon}</span>
          <h3>{team.name}</h3>
          <p>{team.body}</p>
        </li>)}
      </ul>
    </div></section>

    <section className="hs-sec" aria-labelledby="ways-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="ways-title">How we work</h2></div></header>
      <ul className="ap-ways ap-stagger" role="list">
        {WAYS.map((way) => <li key={way.title}><h3>{way.title}</h3><p>{way.body}</p></li>)}
      </ul>
    </div></section>

    <section className="hs-sec" aria-labelledby="join-title"><div className="le-shell">
      <div className="ap-band ap-rise">
        <div><h2 id="join-title">Want to build this with us?</h2><p>See how we hire and what we are looking for.</p></div>
        <Link className="le-button is-primary" href="/careers">See careers</Link>
      </div>
    </div></section>
  </AboutShell>;
}
