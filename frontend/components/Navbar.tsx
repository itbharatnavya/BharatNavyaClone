"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import { useSearchDock } from "@/lib/searchDock";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import AISearchBar from "./AISearchBar";
import { MobileCategoryAccordion } from "./CategoryMegaMenu";
import CategoryStrip from "./directory/CategoryStrip";
import SuiteProductsMenu, { MobileSuiteProductsList } from "./suite/SuiteNavMenu";

// Split a camelCase brand ("BharatSource") into ink + accent halves for the
// wordmark. Falls back to the whole name in ink when there's no interior split.
function splitBrand(name: string): [string, string] {
  const m = name.match(/^(.*[a-z])([A-Z].*)$/);
  if (m) return [m[1], m[2]];
  return [name, ""];
}

function Logo({ siteName }: { siteName: string }) {
  const [head, tail] = splitBrand(siteName);
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={`${siteName} home`}>
      <span
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: "linear-gradient(135deg, var(--navy) 0%, var(--action) 100%)", fontWeight: 800 }}
      >
        {siteName.charAt(0) || "B"}
      </span>
      <span className="truncate text-[18px] font-extrabold tracking-tight text-ink">
        {head}
        {tail && <span className="text-action">{tail}</span>}
      </span>
    </Link>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { branding, featureFlags } = useConfig();
  const { t } = useT();
  const { progress: searchDockProgress, chips, query: dockedQuery, setQuery: setDockedQuery, city: dockedCity, setCity: setDockedCity } = useSearchDock();
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);
  const mobileUserRef = useRef<HTMLDivElement | null>(null);

  const siteName = branding.siteName || "BharatSource";

  // The umbrella (suite) homepage and the non-Directory pages get a lean brand
  // nav. Directory-specific items (Advertise, My Listings, Inbox) only show
  // inside the Directory product — not on these suite-level pages. Dashboard
  // and Admin are app-wide (the suite has multiple products; Directory is
  // just one of them, and Admin manages all of them), so those stay visible
  // in the user menu everywhere the visitor is logged in. As of the
  // Directory nav redesign, the
  // Directory's row-1 dropped Products/Categories/Explore/Pricing/Blog
  // entirely — category browsing now lives in the persistent CategoryStrip
  // second nav row (see components/directory/CategoryStrip.tsx). Both this
  // header and CategoryStrip are sticky and stack directly under one
  // another (header top:0, strip top:64px in globals.css) so they stay
  // pinned together while scrolling. See
  // frontend-design-guide.md. The standalone search icon and +Sell CTA were
  // dropped from the nav bar — search already lives in the docked search bar
  // (lib/searchDock.tsx) and selling is reached through the listing flow, not
  // a persistent nav button.
  const p = pathname || "/";
  // Directory's own pages are a dynamic catch-all (app/[category]/page.tsx, ~250
  // category-slug URLs), so this has to stay a denylist of non-Directory paths —
  // an allowlist of Directory paths would break every category page. `/dashboard`
  // and `/admin` are here too: neither is a Directory page, and the dashboard's
  // own tab nav (or, for a non-seller, its single Profile view) makes the
  // Directory category strip/mega-menu/Advertise button redundant there.
  const NON_DIRECTORY_PATHS = [
    "/",
    "/credit-card",
    "/mutual",
    "/recruitment",
    "/about",
    "/pricing",
    "/features",
    "/offer",
    "/register",
    "/login",
    "/dashboard",
    "/admin",
  ];
  const showDirectoryNav = !(
    NON_DIRECTORY_PATHS.includes(p) ||
    p.startsWith("/consultations") ||
    p.startsWith("/blog")
  );
  // For the profile-icon dropdown only: `/dashboard` counts as "Directory
  // context" even though it's excluded from showDirectoryNav above (its own
  // tab nav makes the category strip/mega-menu redundant there) — it's still
  // Directory's own dashboard, so the dropdown should offer Dashboard/Profile,
  // not the main-user "Profile" link.
  const inDirectoryContext = showDirectoryNav || p === "/dashboard";

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu overlay is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // close user menu on outside click — two possible triggers share this one
  // open/closed boolean (desktop's row and the mobile top bar's Avatar), but
  // only one is ever actually visible/interactive at a given viewport width,
  // so a click is "outside" only if it's outside BOTH wrapper refs.
  useEffect(() => {
    if (!userOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = userRef.current && userRef.current.contains(target);
      const insideMobile = mobileUserRef.current && mobileUserRef.current.contains(target);
      if (!insideDesktop && !insideMobile) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userOpen]);

  const navLink = "text-sm text-muted hover:text-ink transition-colors";

  // Logged out → log in first; logged in → straight to the dashboard's
  // Advertise tab (components/dashboard/AdvertiseTab.tsx), where ad-slot
  // booking already lives.
  function handleAdvertiseClick() {
    router.push(user ? "/dashboard?tab=advertise" : "/login");
  }

  return (
    <>
    <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur nav-header">
      <div className="container-bs flex h-16 items-center gap-3 nav:gap-6">
        <Logo siteName={siteName} />

        {/* Desktop nav — Directory row-1 is intentionally minimal now (see note
            above); the suite branch is unchanged. Once the Directory homepage's
            hero search scrolls out of view (lib/searchDock.tsx), a compact
            search docks in here so it stays reachable while
            the header + CategoryStrip both stay pinned. */}
        <nav className="hidden nav:flex items-center gap-5 flex-1 min-w-0">
          {!showDirectoryNav && (
            /* Suite / non-Directory pages: Products (Directory + Recruitment only,
               Bharat Agent has no route yet) + Blog + About us. */
            <>
              <SuiteProductsMenu />
              {featureFlags.blogs && (
                <Link href="/blog" className={navLink}>{t("nav.blog")}</Link>
              )}
              <Link href="/about" className={navLink}>{t("nav.about")}</Link>
            </>
          )}
          {showDirectoryNav && searchDockProgress > 0 && (
            <div
              className="w-full max-w-xl"
              style={{
                opacity: searchDockProgress,
                // Slides UP into its resting spot (matches the mobile docked
                // row + HomeHero's own bar, which also moves upward as it
                // exits) so the handoff reads as one continuous motion
                // instead of two independently-animated elements.
                transform: `translateY(${(1 - searchDockProgress) * 10}px) scale(${0.97 + searchDockProgress * 0.03})`,
                transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
                pointerEvents: searchDockProgress > 0.5 ? "auto" : "none",
              }}
            >
              <AISearchBar
                size="compact"
                examples={chips}
                showCity
                showExamples={false}
                query={dockedQuery}
                onQueryChange={setDockedQuery}
                city={dockedCity}
                onCityChange={setDockedCity}
                aiEnabled={false}
              />
            </div>
          )}
        </nav>

        {/* Right actions */}
        <div className="hidden nav:flex items-center gap-3 flex-shrink-0 ml-auto">
          {/* Advertise — Directory-scoped. Not logged in → send to login;
              logged in → acknowledge only, real flow ships later. */}
          {showDirectoryNav && (
            <button
              type="button"
              onClick={handleAdvertiseClick}
              className={`inline-flex items-center gap-1.5 ${navLink}`}
            >
              <MegaphoneIcon />
              {t("nav.advertise")}
            </button>
          )}

          {loading ? (
            <span className="skeleton inline-block h-9 w-9 rounded-full" />
          ) : user ? (
            <>
              {featureFlags.notifications && <NotificationBell />}
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full"
                  aria-label={t("nav.account")}
                >
                  <Avatar src={user.avatarUrl} name={user.name} size={34} />
                  <Chevron />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 card card-flat p-1.5">
                    <div className="px-3 py-2">
                      <div className="text-sm font-semibold text-ink line-clamp-1">{user.name}</div>
                      <div className="text-xs text-faint line-clamp-1">{user.email || user.mobile}</div>
                    </div>
                    {/* Two different dropdowns depending on where the user is: on a
                        Directory page (or the dashboard itself), they're "inside a
                        service" and get Dashboard + its Profile (seller/company
                        details) tab. Everywhere else (suite home, register, login,
                        pricing, blog, admin…) they just get their own basic-account
                        Profile page — no Dashboard concept for a plain main user. */}
                    <div className="divider my-1" />
                    {inDirectoryContext ? (
                      <>
                        <MenuLink href="/dashboard" label={t("nav.dashboard")} />
                        <MenuLink href="/dashboard?tab=profile" label={t("nav.dashboardProfile")} />
                      </>
                    ) : (
                      <MenuLink href="/profile" label={t("nav.myProfile")} />
                    )}
                    {user.roles?.includes("admin") && <MenuLink href="/admin" label={t("nav.admin")} />}
                    <div className="divider my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.push("/");
                      }}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm text-error hover:bg-bg-subtle transition-colors"
                    >
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/register" className="btn btn-primary btn-sm">{t("nav.joinUs")}</Link>
          )}
        </div>

        {/* Mobile: Advertise + profile + hamburger. The desktop row above
            shows the account Avatar (opens a Dashboard/My listings/Inbox/
            Log out dropdown) — that Avatar had no mobile equivalent at all,
            so a logged-in visitor on a phone had no visible sign they were
            signed in from the top bar. Tapping it now opens the SAME kind of
            small anchored dropdown as desktop (not the hamburger's
            full-screen category menu — that was the previous, wrong
            behavior: it took the user into category browsing instead of
            their account). Shares the `userOpen` boolean with the desktop
            trigger; only one of the two is ever visible at a given viewport
            width. */}
        <div className="flex nav:hidden items-center gap-2 ml-auto flex-shrink-0">
          {user && featureFlags.notifications && <NotificationBell />}
          {showDirectoryNav && (
            <button
              type="button"
              onClick={handleAdvertiseClick}
              aria-label={t("nav.advertise")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-bg-subtle hover:text-ink transition-colors"
            >
              <MegaphoneIcon />
            </button>
          )}
          {loading ? (
            <span className="skeleton inline-block h-8 w-8 rounded-full" />
          ) : user ? (
            <div className="relative" ref={mobileUserRef}>
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                aria-label={t("nav.account")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              >
                <Avatar src={user.avatarUrl} name={user.name} size={30} />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 card card-flat p-1.5 z-10">
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold text-ink line-clamp-1">{user.name}</div>
                    <div className="text-xs text-faint line-clamp-1">{user.email || user.mobile}</div>
                  </div>
                  {/* Same directory-context split as the desktop dropdown above. */}
                  <div className="divider my-1" />
                  {inDirectoryContext ? (
                    <>
                      <MenuLink href="/dashboard" label={t("nav.dashboard")} />
                      <MenuLink href="/dashboard?tab=profile" label={t("nav.dashboardProfile")} />
                    </>
                  ) : (
                    <MenuLink href="/profile" label={t("nav.myProfile")} />
                  )}
                  {user.roles?.includes("admin") && <MenuLink href="/admin" label={t("nav.admin")} />}
                  <div className="divider my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserOpen(false);
                      router.push("/");
                    }}
                    className="w-full text-left rounded-lg px-3 py-2 text-sm text-error hover:bg-bg-subtle transition-colors"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Signed-out mobile visitors had no path to register from the top
            // bar at all — only the desktop row (hidden nav:flex) carried
            // this "Join us" fallback. Mirrors it here, same as the Avatar
            // above mirrors the desktop dropdown trigger.
            <Link href="/register" className="btn btn-primary btn-sm">
              {t("nav.joinUs")}
            </Link>
          )}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-bg-subtle transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile docked search — same trigger as the desktop version above, but
          shown as its own row (mobile has no room to fold it into the h-16
          row). Absolutely positioned against the header (which is already a
          positioned ancestor via `sticky`) rather than sitting in normal
          flow: an earlier version let this row grow the header's own box
          height as it faded in, which desynced HomeHero's IntersectionObserver
          (rootMargin assumes a constant 64px header) from the header's real,
          now-taller height — the two fed back on each other and made the bar
          flicker in and out while scrolling. Floating it over the page
          instead keeps the header locked at 64px always, exactly like the
          desktop copy above (which never grows the header either), so the
          observer's math stays correct throughout the transition. Translates
          UP into its resting spot (not down) so it reads as a continuation of
          HomeHero's own bar sliding away upward, not an unrelated element
          popping in from the opposite direction. */}
      {showDirectoryNav && searchDockProgress > 0 && (
        <div
          className="container-bs pb-3 nav:hidden"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--canvas)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 8px 16px -8px rgba(16,24,40,0.12)",
            paddingTop: 10,
            opacity: searchDockProgress,
            transform: `translateY(${(1 - searchDockProgress) * 14}px)`,
            transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: searchDockProgress > 0.5 ? "auto" : "none",
          }}
        >
          <AISearchBar
            size="compact"
            examples={chips}
            showCity
            showExamples={false}
            query={dockedQuery}
            onQueryChange={setDockedQuery}
            city={dockedCity}
            onCityChange={setDockedCity}
            aiEnabled={false}
          />
        </div>
      )}

    </header>

    {/* Mobile overlay — deliberately a SIBLING of <header>, not nested inside
        it. <header> carries `backdrop-blur` (backdrop-filter), which per spec
        makes it a containing block for any `position: fixed` descendant —
        nesting this overlay inside <header> trapped it at the header's own
        64px box instead of the full viewport, crushing every row on top of
        itself and leaving the category list with no real space to scroll in.
        Living outside <header> lets `fixed inset-0` resolve against the true
        viewport as intended. */}
    {mobileOpen && (
      <div className="fixed inset-0 z-[60] bg-canvas flex flex-col nav:hidden">
        <div className="container-bs flex items-center justify-between h-16 flex-shrink-0 border-b border-border">
          <Logo siteName={siteName} />
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-bg-subtle transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="container-bs flex-1 overflow-y-auto overscroll-contain py-4">
          {/* Account summary — shown when the menu is opened via the mobile
              top bar's Avatar button (or the hamburger, while signed in), so
              it's clear whose account this is rather than just a generic
              nav list. Dashboard/My listings/Log out live in the footer
              below. */}
          {user && (
            <div className="flex items-center gap-3 px-3 pb-4 mb-4 border-b border-border">
              <Avatar src={user.avatarUrl} name={user.name} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink line-clamp-1">{user.name}</div>
                <div className="text-xs text-faint line-clamp-1">{user.email || user.mobile}</div>
              </div>
            </div>
          )}
          {/* Directory mobile menu is just the category accordion — Products/
              Explore/Pricing/Blog were dropped from Directory nav entirely
              (desktop and mobile) in favor of CategoryStrip on desktop. */}
          {showDirectoryNav ? (
            <MobileCategoryAccordion />
          ) : (
            <>
              <MobileSuiteProductsList onNavigate={() => setMobileOpen(false)} />
              <nav className="flex flex-col gap-1 mt-2">
                {featureFlags.blogs && (
                  <Link href="/blog" className="rounded-lg px-3 py-3 text-lg font-semibold text-ink hover:bg-bg-subtle">{t("nav.blog")}</Link>
                )}
                <Link href="/about" className="rounded-lg px-3 py-3 text-lg font-semibold text-ink hover:bg-bg-subtle">{t("nav.about")}</Link>
              </nav>
            </>
          )}
        </div>

        {/* Sticky footer actions */}
        <div className="container-bs flex-shrink-0 border-t border-border py-4 flex flex-col gap-2">
          {showDirectoryNav && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handleAdvertiseClick();
              }}
              className="btn btn-primary btn-block btn-lg"
            >
              <MegaphoneIcon />
              {t("nav.advertise")}
            </button>
          )}
          {user ? (
            <>
              {/* Dashboard is app-wide, not Directory-specific — shown on every page. */}
              <Link href="/dashboard" className="btn btn-secondary btn-block">{t("nav.dashboard")}</Link>
              {user.roles?.includes("admin") && (
                <Link href="/admin" className="btn btn-secondary btn-block">{t("nav.admin")}</Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                  router.push("/");
                }}
                className="btn btn-ghost btn-block"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link href="/register" className="btn btn-primary btn-block">{t("nav.joinUs")}</Link>
          )}
        </div>
      </div>
    )}

    {showDirectoryNav && <CategoryStrip />}
    </>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-bg-subtle transition-colors"
    >
      {label}
    </Link>
  );
}
