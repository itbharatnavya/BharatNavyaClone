"use client";

// About > Contact. There is no contact form or support inbox in the backend, so this page routes
// people to the flow that actually handles their need (post a requirement, list a business,
// advertise, hire, find a job, Ask Navya), answers the common questions, and shows the company's
// email / phone / address only once they're set in COMPANY (components/about/company.tsx).

import Link from "next/link";
import AboutShell from "@/components/about/AboutShell";
import { COMPANY } from "@/components/about/company";
import ContactForm from "@/components/about/ContactForm";
import { useAuth } from "@/lib/auth";

const glyph = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
const Arrow = () => <svg className="ap-help-arrow" aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const FAQ = [
  { q: "Does Bharat Navya take payments?", a: "No. You deal with the company directly. We never handle money between buyers and sellers." },
  { q: "How do I contact a company?", a: "Open the company's page and tap Call or WhatsApp. Sign in first to see their number." },
  { q: "How do I list my business?", a: "Sign in and use List your business. Your company page goes live once it's set up." },
  { q: "How do reviews work?", a: "Anyone signed in can rate a company once and edit it later. You can't review your own company." },
  { q: "How do I advertise?", a: "Sign in and open the Advertise tab in your dashboard to book a slot." },
  { q: "I can't sign in.", a: "Use your mobile number and the one-time code (OTP) instead of a password." },
];

export default function ContactPage() {
  const { user } = useAuth();
  const advertise = user ? "/dashboard?tab=advertise" : `/login?next=${encodeURIComponent("/dashboard?tab=advertise")}`;
  const help = [
    { title: "Find a supplier", body: "Post what you need once and get quotes.", cta: "Post a requirement", href: "/rfq", icon: glyph("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|m20 20-4-4") },
    { title: "List your business", body: "Add your company so buyers can find you.", cta: "List your business", href: "/sell", icon: glyph("M4 9l1.5-5h13L20 9|M4 9h16v11H4z|M9 20v-6h6v6") },
    { title: "Advertise", body: "Show your company in sponsored slots.", cta: "Book an ad", href: advertise, icon: glyph("M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z|M15.5 8.5a5 5 0 0 1 0 7|M18.5 6a8.5 8.5 0 0 1 0 12") },
    { title: "Hire people", body: "Post a job and see ranked candidates.", cta: "Post a job", href: "/post-job", icon: glyph("M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M19 8v6|M16 11h6") },
    { title: "Find a job", body: "Search roles and track your applications.", cta: "Browse jobs", href: "/recruitment/jobs", icon: glyph("M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16") },
    { title: "Ask a question", body: "Ask Navya in plain words and get pointed the right way.", cta: "Ask Navya", href: "/#ask-navya", icon: glyph("M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01") },
  ];
  const details = [
    COMPANY.email ? { label: "Email", value: COMPANY.email, href: `mailto:${COMPANY.email}` } : null,
    COMPANY.phone ? { label: "Phone", value: COMPANY.phone, href: `tel:${COMPANY.phone.replace(/\s+/g, "")}` } : null,
    COMPANY.address ? { label: "Office", value: COMPANY.address } : null,
    COMPANY.hours ? { label: "Hours", value: COMPANY.hours } : null,
  ].filter(Boolean) as { label: string; value: string; href?: string }[];

  return <AboutShell id="contact-title" title={<><span>Talk to</span> the right team.</>} lead="Pick what you need. Most things are fastest straight from the site.">
    <section className="hs-sec" aria-labelledby="help-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="help-title">What do you need?</h2></div></header>
      <ul className="ap-help ap-stagger" role="list">
        {help.map((item) => <li key={item.title}><Link href={item.href}>
          <span className="hs-prod-icon">{item.icon}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <span className="ap-help-cta">{item.cta}<Arrow /></span>
        </Link></li>)}
      </ul>
    </div></section>

    <section className="hs-sec" id="write" aria-labelledby="form-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="form-title">Send us a message</h2></div></header>
      <div className="cf-layout ap-rise">
        <ContactForm />
        <aside className="cf-aside" aria-label="What happens next">
          <h3>What happens next</h3>
          <ol>
            <li><b>1</b><span>Your message reaches our team straight away.</span></li>
            <li><b>2</b><span>The right person picks it up, based on the topic.</span></li>
            <li><b>3</b><span>We reply by email or phone within 1 to 2 working days.</span></li>
          </ol>
          {COMPANY.email && <p>Prefer email? <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>}
          <div className="cf-aside-quick">
            <p>Need an answer right now?</p>
            <Link href="/#ask-navya">Ask Navya<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
            <Link href="/rfq">Post a requirement<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
          </div>
        </aside>
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="faq-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="faq-title">Common questions</h2></div></header>
      <div className="ap-faq ap-rise">
        {FAQ.map((item, index) => <details key={item.q} name="faq" open={index === 0} onToggle={(event) => { const el = event.currentTarget; if (el.open) el.parentElement?.querySelectorAll("details[open]").forEach((other) => { if (other !== el) (other as HTMLDetailsElement).open = false; }); }}>
          <summary>{item.q}<svg aria-hidden viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></summary>
          <p>{item.a}</p>
        </details>)}
      </div>
    </div></section>

    {details.length > 0 && <section className="hs-sec" aria-labelledby="reach-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="reach-title">Reach us directly</h2></div></header>
      <dl className="ap-details ap-stagger">
        {details.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.href ? <a href={item.href}>{item.value}</a> : item.value}</dd></div>)}
      </dl>
    </div></section>}
  </AboutShell>;
}
