"use client";

// Directory landing hero: copy + search + quick category chips over a photo
// slideshow underlay (a route-colour scrim keeps the copy legible), with a row
// of three route actions straddling the hero's bottom edge. Also exports
// CategoryShowcase, the "browse by category" section used by Directory and
// Recruitment. Layout reference supplied by the owner (ofbusiness.com hero);
// colours, type and geometry stay on the Counter tokens.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface HeroSlide { src: string }
export interface HeroChip { label: string; href: string; icon?: ReactNode }
export interface HeroAction { title: string; detail: string; href: string; icon: ReactNode }
export interface ShowcaseGroup { key: string; label: string; href: string; image: string; meta?: string }

const SLIDE_MS = 5000;

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }

function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(query.matches); setHidden(document.hidden); };
    sync();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { query.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  // Keeps going under the cursor; only reduced motion or a background tab holds it.
  const playing = !reduced && !hidden && slides.length > 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, active, slides.length]);

  if (!slides.length) return null;

  return <div className={`bn-landing-media${playing ? " is-playing" : ""}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {slides.map((item, index) => <img key={item.src} src={item.src} alt="" aria-hidden className={index === active ? "is-active" : undefined} loading={index === 0 ? "eager" : "lazy"} />)}
    <div className="bn-landing-media-bar">
      {slides.length > 1 && <div className="bn-landing-media-controls">
        {slides.map((item, index) => <button key={item.src} type="button" className="bn-landing-media-step" aria-label={`Show photo ${slides.indexOf(item) + 1} of ${slides.length}`} aria-pressed={index === active} onClick={() => setActive(index)} />)}
      </div>}
    </div>
  </div>;
}

export interface HeroMenuGroup { label: string; href: string; children?: { label: string; href: string }[] }

// A native <select> dressed as the first pill: every category (with its sub-categories
// grouped under it) in one dropdown. Choosing one goes straight to that category's results.
function HeroCategoryMenu({ label, groups }: { label: string; groups: HeroMenuGroup[] }) {
  const router = useRouter();
  return <label className="bn-chip-menu">
    <svg aria-hidden viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></svg>
    <span className="sr-only">{label}</span>
    <select value="" aria-label={label} onChange={(event) => { if (event.target.value) router.push(event.target.value); }}>
      <option value="">{label}</option>
      {groups.map((group) => group.children?.length
        ? <optgroup key={group.href} label={group.label}>
          <option value={group.href}>All in {group.label}</option>
          {group.children.map((child) => <option key={child.href} value={child.href}>{child.label}</option>)}
        </optgroup>
        : <option key={group.href} value={group.href}>{group.label}</option>)}
    </select>
    <svg className="bn-chip-menu-caret" aria-hidden viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
  </label>;
}

export function HeroChips({ label, items, menu }: { label: string; items: HeroChip[]; menu?: { label: string; groups: HeroMenuGroup[] } }) {
  return <div className="le-examples bn-landing-chips" role="group" aria-label={label}>
    {menu && menu.groups.length > 0 && <HeroCategoryMenu label={menu.label} groups={menu.groups} />}
    {items.map((item) => <Link key={item.href} href={item.href}>{item.icon}<span>{item.label}</span></Link>)}
  </div>;
}

export default function LandingHero({ id, title, search, chips, slides, actions, actionsLabel }: {
  id: string;
  title: string;
  search: ReactNode;
  chips: ReactNode;
  slides: HeroSlide[];
  actions: HeroAction[];
  actionsLabel: string;
}) {
  return <section className="le-hero bn-landing-hero" aria-labelledby={id}>
    <HeroSlideshow slides={slides} />
    <div className="le-shell bn-landing-copy">
      <h1 id={id}>{title}</h1>
      {search}
      {chips}
    </div>
    <nav className="le-shell bn-landing-actions" aria-label={actionsLabel}>
      {actions.map((action) => <Link key={action.href} href={action.href} className="bn-landing-action">
        <span className="bn-landing-action-icon">{action.icon}</span>
        <span><strong>{action.title}</strong><small>{action.detail}</small></span>
        <b aria-hidden><Arrow /></b>
      </Link>)}
    </nav>
  </section>;
}

// Renders inside a `.bn-feed` grid. The heading sits beside the promotion and
// the body is two auto-scrolling card rows (top right-to-left, bottom the other
// way). Each row renders its cards four times so the loop stays seamless;
// copies after the first are hidden from assistive tech and the tab order.
// It plays by default; hover or focus pauses it, and reduced-motion users get
// plain horizontally scrollable rows instead.
const MARQUEE_CARDS = 8;

function MarqueeRow({ cards, reverse }: { cards: ShowcaseGroup[]; reverse?: boolean }) {
  const count = cards.length;
  return <div className={`bn-marquee-row${reverse ? " is-reverse" : ""}`} style={{ ["--marquee-count" as string]: count }}>
    {[0, 1, 2, 3].map((copy) => <div className="bn-marquee-set" key={copy} aria-hidden={copy > 0 || undefined}>
      {cards.map((card) => <Link key={card.key} className="bn-cat-card" href={card.href} tabIndex={copy > 0 ? -1 : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.image} alt="" loading="lazy" />
        <span><strong>{card.label}</strong>{card.meta && <small>{card.meta}</small>}</span>
      </Link>)}
    </div>)}
  </div>;
}

export function CategoryShowcase({ id, title, groups, allHref, allLabel }: {
  id: string;
  title: string;
  groups: ShowcaseGroup[];
  allHref: string;
  allLabel: string;
}) {
  if (!groups.length) return null;
  const cards = groups.slice(0, MARQUEE_CARDS);
  const half = Math.ceil(cards.length / 2);

  return <>
    <header className="bn-category-head">
      <h2 id={id}>{title}</h2>
      <span className="bn-category-head-actions">
        <Link className="le-button" href={allHref}>{allLabel}</Link>
      </span>
    </header>
    <div className="bn-category-body" role="region" aria-labelledby={id}>
      <div className="bn-marquee">
        <MarqueeRow cards={cards.slice(0, half)} />
        <MarqueeRow cards={cards.slice(half)} reverse />
      </div>
    </div>
  </>;
}
