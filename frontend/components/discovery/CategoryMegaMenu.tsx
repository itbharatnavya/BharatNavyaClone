"use client";

// Directory hero: the "All categories" pill. Opens a two-pane browser (layout reference from the
// owner: ofbusiness.com's Categories menu). Left: every top category with its photo. Right: the
// selected category's sub-categories, with their own children listed under them, and a View all
// link. A search box at the top filters across every level. On desktop it drops under the pill
// (hovering a category on the left previews it). Phones get the same attached dropdown, with the
// categories as a scrolling row of photos across the top instead of a column, and the page
// scrolls the pill up first if there isn't room below it. Escape, the close button or a click outside closes it.
// Styles: .bn-mega-* in app/counter-soft-system.css.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export interface MegaLeaf { label: string; href: string; children?: MegaLeaf[] }
export interface MegaGroup { label: string; href: string; image?: string; count?: number; children?: MegaLeaf[] }

const LEAF_LIMIT = 5;

function flatten(groups: MegaGroup[]) {
  const rows: { label: string; href: string; trail: string }[] = [];
  const walk = (items: MegaLeaf[] | undefined, trail: string) => items?.forEach((item) => {
    rows.push({ label: item.label, href: item.href, trail });
    walk(item.children, `${trail} / ${item.label}`);
  });
  groups.forEach((group) => { rows.push({ label: group.label, href: group.href, trail: "Category" }); walk(group.children, group.label); });
  return rows;
}

export default function CategoryMegaMenu({ label, groups }: { label: string; groups: MegaGroup[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [spot, setSpot] = useState({ top: 0, left: 16, width: 0 });
  const [mounted, setMounted] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      // Hangs straight off the pill (its flat bottom runs into the panel's top edge), left
      // edges lined up, and kept inside the hero card with a margin on the right.
      const el = trigger.current;
      const box = el?.getBoundingClientRect();
      if (!el || !box) return;
      if (box.bottom < 0) { setOpen(false); return; }
      const hero = (el.closest(".bn-landing-hero") || document.body).getBoundingClientRect();
      const gap = window.innerWidth < 641 ? Math.max(12, box.left - hero.left) : window.innerWidth < 900 ? 16 : 24;
      const width = Math.min(1120, Math.min(hero.right, window.innerWidth) - gap - box.left);
      setSpot({ top: Math.floor(box.bottom) - 1, left: Math.round(box.left), width: Math.floor(width) });
    };
    // Phones: make room below the pill by scrolling it up under the header first.
    const box = trigger.current?.getBoundingClientRect();
    if (box && window.innerWidth < 641 && window.innerHeight - box.bottom < 460) {
      window.scrollTo({ top: window.scrollY + box.top - 96, behavior: "instant" as ScrollBehavior });
    }
    place();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    if (window.matchMedia("(hover: hover)").matches) search.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    panel.current?.querySelector<HTMLElement>(".bn-mega-rail [aria-pressed='true']")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const rows = useMemo(() => flatten(groups), [groups]);
  const needle = query.trim().toLowerCase();
  const matches = needle ? rows.filter((row) => row.label.toLowerCase().includes(needle)).slice(0, 40) : [];
  const group = groups[active] || groups[0];
  const close = () => setOpen(false);

  const sheet = <div className="bn-mega-layer" data-open={open || undefined}>
    <div className="bn-mega-scrim" aria-hidden onClick={close} />
    <div ref={panel} id="bn-mega" className="bn-mega" role="dialog" aria-label={label} style={{ ["--mega-top" as string]: `${spot.top}px`, ["--mega-left" as string]: `${spot.left}px`, ["--mega-width" as string]: `${spot.width}px` }}>
      <header className="bn-mega-head">
        <label className="bn-mega-search">
          <svg aria-hidden viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="m20 20-4-4" /></svg>
          <input ref={search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search categories" aria-label="Search categories" />
        </label>
        <button type="button" className="bn-mega-close" onClick={() => { close(); trigger.current?.focus(); }} aria-label="Close categories">
          <svg aria-hidden viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </header>

      {needle ? <div className="bn-mega-results">
        {matches.length ? <ul>
          {matches.map((row) => <li key={row.href + row.trail}><Link href={row.href} onClick={close}><strong>{row.label}</strong><small>{row.trail}</small></Link></li>)}
        </ul> : <p className="bn-mega-empty">No category called &ldquo;{query.trim()}&rdquo;. Try a shorter word, or search all listings from the main search box.</p>}
      </div> : <div className="bn-mega-main">
        <nav className="bn-mega-rail" aria-label="Categories">
          <p className="bn-mega-kicker">All categories</p>
          {groups.map((item, index) => <button key={item.href} type="button" aria-pressed={index === active}
            onClick={() => setActive(index)}
            onMouseEnter={(event) => { if (event.nativeEvent instanceof MouseEvent && window.matchMedia("(hover: hover)").matches) setActive(index); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.image ? <img src={item.image} alt="" loading="lazy" /> : <i aria-hidden />}
            <span>{item.label}</span>
          </button>)}
        </nav>

        {group && <div ref={body} className="bn-mega-body">
          <div className="bn-mega-title">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {group.image && <img src={group.image} alt="" />}
            <h3>{group.label}{group.count ? <small>{group.count.toLocaleString("en-IN")} listings</small> : null}</h3>
            <Link className="bn-mega-all" href={group.href} onClick={close}>View all<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
          </div>
          <div className="bn-mega-grid">
            {(group.children || []).map((child) => <section key={child.href} className={child.children?.length ? "has-leaves" : undefined}>
              <Link className="bn-mega-sub" href={child.href} onClick={close}>{child.label}</Link>
              {child.children?.length ? <ul>
                {child.children.slice(0, LEAF_LIMIT).map((leaf) => <li key={leaf.href}><Link href={leaf.href} onClick={close}>{leaf.label}</Link></li>)}
                {child.children.length > LEAF_LIMIT && <li><Link className="is-more" href={child.href} onClick={close}>{child.children.length - LEAF_LIMIT} more</Link></li>}
              </ul> : null}
            </section>)}
          </div>
        </div>}
      </div>}
    </div>
  </div>;

  return <>
    <button ref={trigger} type="button" className="bn-chip-menu" aria-expanded={open} aria-controls="bn-mega" aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" /></svg>
      <span>{label}</span>
      <svg className="bn-chip-menu-caret" aria-hidden viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {mounted && createPortal(sheet, document.body)}
  </>;
}
