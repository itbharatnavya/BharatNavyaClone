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
    <header className={`bn-header ${counterPublic || counterWorkspace ? "is-counter-public" : ""} ${counterWorkspace ? "is-counter-workspace" : ""} ${searchDocked ? "is-search-docked" : ""}`}>
      <div className="bn-header-inner">
        <Link href="/" className="bn-wordmark" aria-label="Bharat Navya home">
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/bharat-navya-logo.png" alt="" />
          <span>Bharat Navya</span>
        </Link>
        {!searchDocked && <nav className="bn-primary-nav" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={link.match(pathname) ? "page" : undefined}>{link.label}</Link>)}
        </nav>}
        {directoryDocked && <DirectoryDockedSearch />}
        {recruitmentDocked && <RecruitmentDockedSearch />}
        <div className="bn-header-actions">
          {!loading && user && featureFlags.notifications && <NotificationBell />}
          {!loading && !user && pathname !== "/login" && pathname !== "/register" && <Link className="bn-sign-in" href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}
          {!loading && user && <div className="bn-account" ref={accountRef}>
            <button type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)}><Avatar name={user.name} size={40} /></button>
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
          <button className="bn-menu-button" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><MenuIcon open={menuOpen} /></button>
        </div>
      </div>
      {menuOpen && <nav className="bn-mobile-nav" aria-label="Mobile navigation">{links.map((link) => <Link key={link.href} href={link.href} aria-current={link.match(pathname) ? "page" : undefined}>{link.label}</Link>)}{!loading && !user && <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Join / Sign in</Link>}</nav>}
    </header>
  );
}
