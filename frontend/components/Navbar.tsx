"use client";

import { ABOUT_PAGES, isAboutRoute } from "@/components/about/company";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import { useSearchDock } from "@/lib/searchDock";
import { DirectoryDockedSearch, RecruitmentDockedSearch } from "./SectionSearchDock";
import {
  isCounterPublicRoute,
  isCounterWorkspaceRoute,
  isDirectoryRoute,
  isRecruitmentPublicRoute,
} from "@/lib/routePresentation";

const links = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/directory", label: "Directory", match: isDirectoryRoute },
  { href: "/recruitment", label: "Recruitment", match: (path: string) => isRecruitmentPublicRoute(path) || path.startsWith("/job/") || path.startsWith("/employer/") },
  { href: "/about", label: "About", match: isAboutRoute },
];

// "Products" groups the two suite products under one menu item; hovering, focusing or tapping it opens a small panel.
const PRODUCTS = [
  { href: "/directory", label: "Directory", blurb: "Companies, products and services", icon: <svg aria-hidden viewBox="0 0 24 24"><path d="M4 20V9l8-5 8 5v11" /><path d="M9 20v-6h6v6" /></svg> },
  { href: "/recruitment", label: "Recruitment", blurb: "Roles, employers and hiring", icon: <svg aria-hidden viewBox="0 0 24 24"><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5M3.5 13h17" /></svg> },
];
// Announced but not live yet: shown in the Products menu, not linked.
const UPCOMING = [
  { label: "Growth OS", blurb: "Business intelligence", icon: <svg aria-hidden viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M20 19H2M4 9l6-4 6 7 4-5" /></svg> },
];

// A nav item that opens a panel of tiles on hover, focus or tap (Products, About). Closes on
// route change, outside click or Escape. Styles: .bn-nav-products / .bn-nav-panel.
function NavDropdown({ label, current, children, pathname }: { label: string; current: boolean; children: (close: () => void) => React.ReactNode; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = () => { window.clearTimeout(timer.current); setOpen(true); };
  const hideSoon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 140); };
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return <div className={`bn-nav-products${open ? " is-open" : ""}`} ref={ref} onMouseEnter={show} onMouseLeave={hideSoon}>
    <button type="button" className="bn-nav-trigger" aria-expanded={open} aria-haspopup="true" aria-current={current ? "page" : undefined} onClick={() => setOpen((value) => !value)} onFocus={show}>{label}<Chevron /></button>
    <div className="bn-nav-panel" role="menu" aria-label={label}>{children(() => setOpen(false))}</div>
  </div>;
}

// One row in a nav dropdown (ofbusiness-style): accent bar, icon tile, label + blurb, chevron.
// The hover animation lives in CSS (.bn-nav-row). `soon` rows are shown but not links.
function NavRow({ href, icon, label, blurb, current, soon, onClick, index }: { href?: string; icon: React.ReactNode; label: string; blurb: string; current?: boolean; soon?: boolean; onClick?: () => void; index: number }) {
  const inner = <>
    <span className="bn-nav-row-bar" aria-hidden />
    <span className="bn-nav-panel-icon">{icon}</span>
    <span className="bn-nav-row-copy"><strong>{label}{soon && <em>Coming soon</em>}</strong><small>{blurb}</small></span>
    {!soon && <svg className="bn-nav-row-chev" aria-hidden viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>}
  </>;
  const style = { ["--i" as string]: index };
  return soon || !href
    ? <span className="bn-nav-row is-soon" aria-disabled="true" style={style}>{inner}</span>
    : <Link href={href} role="menuitem" className={`bn-nav-row${current ? " is-current" : ""}`} onClick={onClick} style={style}>{inner}</Link>;
}

function Chevron() { return <svg aria-hidden viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>; }

function MenuIcon({ open }: { open: boolean }) {
  return open ? <svg aria-hidden viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg> : <svg aria-hidden viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
}

export default function Navbar() {
  const pathname = usePathname() || "/";
  const { user, loading, logout, isAdmin } = useAuth();
  const { featureFlags } = useConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  // The menu repeats "Join / Sign in" only when the header button itself is hidden (it is
  // dropped at some widths), checked each time the menu opens.
  const signInRef = useRef<HTMLAnchorElement>(null);
  const [signInShown, setSignInShown] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const el = signInRef.current;
    setSignInShown(Boolean(el && el.offsetWidth > 0 && getComputedStyle(el).visibility !== "hidden"));
  }, [menuOpen]);
  // At the very top of the page the bar fades open around a larger logo; once anything can scroll under
  // the header it becomes the solid bar again (styles: .bn-header-surface, .is-at-top).
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const sync = () => setAtTop(window.scrollY <= 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  const { progress } = useSearchDock();
  const directoryDocked = (pathname === "/directory" || pathname === "/search") && progress > 0;
  const recruitmentDocked = (pathname === "/recruitment" || pathname === "/recruitment/jobs") && progress > 0;
  const searchDocked = directoryDocked || recruitmentDocked;
  const counterPublic = isCounterPublicRoute(pathname);
  const counterWorkspace = isCounterWorkspaceRoute(pathname);
  // Account-menu context: which workspace link to offer depends on which product's
  // pages the visitor is currently on — not on role/profile ownership, since both
  // dashboards already self-onboard a non-member (Directory: a non-seller sees only
  // its Profile tab; Recruitment: no recruitmentRole yet shows a role chooser).
  // Mirrors the pre-redesign Navbar's inDirectoryContext/inRecruitmentContext.
  const inDirectoryContext = links[1].match(pathname) || pathname === "/dashboard";
  const inRecruitmentContext = links[2].match(pathname) || pathname === "/recruitment/dashboard";

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);
  const inProducts = inDirectoryContext || inRecruitmentContext;
  // Self-serve ads live in the dashboard's Advertise tab; signed-out visitors sign in first and land there.
  // On the sign-in / sign-up pages Advertise just leads back to sign-in, so it is hidden there.
  const onAuthPage = pathname === "/login" || pathname === "/register";
  const advertiseHref = user ? "/dashboard?tab=advertise" : `/login?next=${encodeURIComponent("/dashboard?tab=advertise")}`;
  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [accountOpen]);

  useEffect(() => {
    if (searchDocked) setMenuOpen(false);
  }, [searchDocked]);

  return (
    <header className={`bn-header ${counterPublic || counterWorkspace ? "is-counter-public" : ""} ${counterWorkspace ? "is-counter-workspace" : ""} ${searchDocked ? "is-search-docked" : ""} ${atTop && !searchDocked ? "is-at-top" : ""}`}>
      <span className="bn-header-surface" aria-hidden />
      <div className="bn-header-inner">
        <Link href="/" className="bn-wordmark" aria-label="Bharat Navya home">
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt="" /><span className="bn-mark" aria-hidden>{/* eslint-disable @next/next/no-img-element */}<img src="/brand/bn-navy.png" alt="" /><img className="is-white" src="/brand/bn-white.png" alt="" /><img className="is-green" src="/brand/bn-green.png" alt="" /><img className="is-orange" src="/brand/bn-orange.png" alt="" /></span>
        </Link>
        {!searchDocked && <nav className="bn-primary-nav" aria-label="Primary navigation">
          <Link href="/" aria-current={links[0].match(pathname) ? "page" : undefined}>Home</Link>
          <NavDropdown label="Products" current={inProducts} pathname={pathname}>{(close) => <>
            {PRODUCTS.map((item, index) => <NavRow key={item.href} index={index} href={item.href} icon={item.icon} label={item.label} blurb={item.blurb} current={item.href === "/directory" ? inDirectoryContext : inRecruitmentContext} onClick={close} />)}
            {UPCOMING.map((item, index) => <NavRow key={item.label} index={PRODUCTS.length + index} icon={item.icon} label={item.label} blurb={item.blurb} soon />)}
          </>}</NavDropdown>
          <NavDropdown label="About" current={isAboutRoute(pathname)} pathname={pathname}>{(close) => ABOUT_PAGES.map((page, index) => <NavRow key={page.href} index={index} href={page.href} icon={page.icon} label={page.label} blurb={page.blurb} current={page.match(pathname)} onClick={close} />)}</NavDropdown>
        </nav>}
        {directoryDocked && <DirectoryDockedSearch />}
        {recruitmentDocked && <RecruitmentDockedSearch />}
        <div className="bn-header-actions">
          {!loading && user && featureFlags.notifications && <NotificationBell />}
          {!loading && !onAuthPage && <Link className="bn-advertise" href={advertiseHref}><svg aria-hidden viewBox="0 0 24 24"><path d="M3.5 10.5v3a1 1 0 0 0 1 1H7l6 4V5.5l-6 4H4.5a1 1 0 0 0-1 1Z" /><path d="M7 14.5 8.2 19a1 1 0 0 0 1 .75h1.1" /><path d="M16.5 9a3.5 3.5 0 0 1 0 6" /><path d="M18.8 6.6a7 7 0 0 1 0 10.8" /></svg>Advertise</Link>}
          {!loading && !user && pathname !== "/login" && pathname !== "/register" && <Link ref={signInRef} className="bn-sign-in" href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}
          {!loading && user && <div className="bn-account" ref={accountRef}>
            <button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => { setMenuOpen(false); setAccountOpen((value) => !value); }}><Avatar name={user.name} size={40} /></button>
            {accountOpen && <div className="bn-account-menu">
              <strong>{user.name}</strong>
              {inDirectoryContext ? (
                <><Link href="/dashboard">Directory workspace</Link><Link href="/dashboard?tab=profile">Directory profile</Link></>
              ) : inRecruitmentContext ? (
                <Link href="/recruitment/dashboard">Recruitment workspace</Link>
              ) : (
                <Link href="/profile">My profile</Link>
              )}
              {isAdmin && <Link href="/admin">Admin</Link>}
              <button type="button" onClick={logout}>Sign out</button>
            </div>}
          </div>}
          <button className="bn-menu-button" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => { setAccountOpen(false); setMenuOpen((value) => !value); }}><MenuIcon open={menuOpen} /></button>
          {menuOpen && <nav className="bn-mobile-nav" aria-label="Mobile navigation"><Link href="/" aria-current={links[0].match(pathname) ? "page" : undefined}>Home</Link><span className="bn-mobile-nav-group">Products</span>{PRODUCTS.map((item) => <Link key={item.href} className="is-sub" href={item.href} aria-current={(item.href === "/directory" ? inDirectoryContext : inRecruitmentContext) ? "page" : undefined}>{item.label}</Link>)}{UPCOMING.map((item) => <span key={item.label} className="bn-mobile-nav-soon" aria-disabled="true" title="Coming soon">{item.label}</span>)}<span className="bn-mobile-nav-group">About</span>{ABOUT_PAGES.map((page) => <Link key={page.href} className="is-sub" href={page.href} aria-current={page.match(pathname) ? "page" : undefined}>{page.label}</Link>)}{!loading && !onAuthPage && <Link href={advertiseHref}>Advertise</Link>}{!loading && !user && !signInShown && <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}</nav>}
        </div>
      </div>
    </header>
  );
}
