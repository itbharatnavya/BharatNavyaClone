"use client";

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
  { href: "/about", label: "About", match: (path: string) => path === "/about" },
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
  const [productsOpen, setProductsOpen] = useState(false);
  // At the very top of the page the bar fades open around a larger logo; once anything can scroll under
  // the header it becomes the solid bar again (styles: .bn-header-surface, .is-at-top).
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const sync = () => setAtTop(window.scrollY <= 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  const productsRef = useRef<HTMLDivElement>(null);
  const productsTimer = useRef<number | undefined>(undefined);
  const openProducts = () => { window.clearTimeout(productsTimer.current); setProductsOpen(true); };
  const closeProductsSoon = () => { window.clearTimeout(productsTimer.current); productsTimer.current = window.setTimeout(() => setProductsOpen(false), 140); };
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

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); setProductsOpen(false); }, [pathname]);
  useEffect(() => {
    if (!productsOpen) return;
    const close = (event: MouseEvent) => { if (!productsRef.current?.contains(event.target as Node)) setProductsOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setProductsOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [productsOpen]);
  const inProducts = inDirectoryContext || inRecruitmentContext;
  // Self-serve ads live in the dashboard's Advertise tab; signed-out visitors sign in first and land there.
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
          <div className={`bn-nav-products${productsOpen ? " is-open" : ""}`} ref={productsRef} onMouseEnter={openProducts} onMouseLeave={closeProductsSoon}>
            <button type="button" className="bn-nav-trigger" aria-expanded={productsOpen} aria-haspopup="true" aria-current={inProducts ? "page" : undefined} onClick={() => setProductsOpen((value) => !value)} onFocus={openProducts}>Products<Chevron /></button>
            <div className="bn-nav-panel" role="menu" aria-label="Products">
              {PRODUCTS.map((item) => <Link key={item.href} href={item.href} role="menuitem" className={(item.href === "/directory" ? inDirectoryContext : inRecruitmentContext) ? "is-current" : undefined} onClick={() => setProductsOpen(false)}>
                <span className="bn-nav-panel-icon">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{item.blurb}</small></span>
              </Link>)}
              {UPCOMING.map((item) => <span key={item.label} className="bn-nav-panel-soon" aria-disabled="true" title="Coming soon">
                <span className="bn-nav-panel-icon">{item.icon}</span>
                <span><strong>{item.label}</strong><small>{item.blurb}</small></span>
              </span>)}
            </div>
          </div>
          <Link href="/about" aria-current={links[3].match(pathname) ? "page" : undefined}>About</Link>
        </nav>}
        {directoryDocked && <DirectoryDockedSearch />}
        {recruitmentDocked && <RecruitmentDockedSearch />}
        <div className="bn-header-actions">
          {!loading && user && featureFlags.notifications && <NotificationBell />}
          {!loading && <Link className="bn-advertise" href={advertiseHref}><svg aria-hidden viewBox="0 0 24 24"><path d="M3.5 10.5v3a1 1 0 0 0 1 1H7l6 4V5.5l-6 4H4.5a1 1 0 0 0-1 1Z" /><path d="M7 14.5 8.2 19a1 1 0 0 0 1 .75h1.1" /><path d="M16.5 9a3.5 3.5 0 0 1 0 6" /><path d="M18.8 6.6a7 7 0 0 1 0 10.8" /></svg>Advertise</Link>}
          {!loading && !user && pathname !== "/login" && pathname !== "/register" && <Link className="bn-sign-in" href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}
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
          {menuOpen && <nav className="bn-mobile-nav" aria-label="Mobile navigation"><Link href="/" aria-current={links[0].match(pathname) ? "page" : undefined}>Home</Link><span className="bn-mobile-nav-group">Products</span>{PRODUCTS.map((item) => <Link key={item.href} className="is-sub" href={item.href} aria-current={(item.href === "/directory" ? inDirectoryContext : inRecruitmentContext) ? "page" : undefined}>{item.label}</Link>)}{UPCOMING.map((item) => <span key={item.label} className="bn-mobile-nav-soon" aria-disabled="true" title="Coming soon">{item.label}</span>)}<Link href="/about" aria-current={links[3].match(pathname) ? "page" : undefined}>About</Link>{!loading && <Link href={advertiseHref}>Advertise</Link>}{!loading && !user && <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}</nav>}
        </div>
      </div>
    </header>
  );
}
