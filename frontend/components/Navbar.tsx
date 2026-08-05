"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useT } from "@/lib/i18n";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import LanguageToggle from "./LanguageToggle";
import CategoryMegaMenu, { MobileCategoryAccordion } from "./CategoryMegaMenu";
import ProductsMenu, { MobileProductsList } from "./suite/ProductsMenu";
import { PRODUCTS } from "./suite/products";

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
        style={{ background: "linear-gradient(135deg,#F97316,#EA580C)", fontWeight: 800 }}
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

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16l5 5" />
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
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);

  const siteName = branding.siteName || "BharatSource";

  // The umbrella (suite) homepage and the non-Directory products get a lean brand
  // nav. Directory-specific items (Categories, Explore, Pricing, +Sell, search) only
  // show inside the Directory product — not on /, /consultations, /credit-card, /mutual.
  const p = pathname || "/";
  const showDirectoryNav = !(
    p === "/" ||
    p === "/credit-card" ||
    p === "/mutual" ||
    p === "/consultations" ||
    p.startsWith("/consultations/")
  );

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

  // close user menu on outside click
  useEffect(() => {
    if (!userOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userOpen]);

  const navLink = "text-sm text-muted hover:text-ink transition-colors";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="container-bs flex h-16 items-center gap-3 nav:gap-6">
        <Logo siteName={siteName} />

        {/* Desktop nav */}
        <nav className="hidden nav:flex items-center gap-5 flex-1">
          {showDirectoryNav ? (
            <>
              {/* Inside the Directory: compact Products switcher + Directory nav */}
              <ProductsMenu />
              <CategoryMegaMenu />
              <Link href="/search" className={navLink}>{t("nav.explore")}</Link>
              <Link href="/pricing" className={navLink}>{t("nav.pricing")}</Link>
              {featureFlags.blogs && (
                <Link href="/blog" className={navLink}>{t("nav.blog")}</Link>
              )}
            </>
          ) : (
            /* Suite / non-Directory pages: the products shown inline (no dropdown) */
            PRODUCTS.map((pr) => (
              <Link
                key={pr.key}
                href={pr.href}
                className={
                  pr.status === "live"
                    ? navLink
                    : "text-sm text-faint hover:text-muted transition-colors inline-flex items-center gap-1.5"
                }
              >
                {pr.name}
                {pr.status === "soon" && (
                  <span className="badge badge-neutral" style={{ fontSize: 10, padding: "1px 6px" }}>
                    Soon
                  </span>
                )}
              </Link>
            ))
          )}
        </nav>

        {/* Right actions */}
        <div className="hidden nav:flex items-center gap-3 flex-shrink-0 ml-auto">
          {featureFlags.multiLanguage && <LanguageToggle />}

          {/* Search + Sell — Directory-scoped */}
          {showDirectoryNav && (
            <>
              <Link
                href="/search"
                aria-label={t("common.search")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-bg-subtle hover:text-ink transition-colors"
              >
                <SearchIcon />
              </Link>
              <Link href="/sell" className="btn btn-primary btn-sm">
                + {t("nav.sell")}
              </Link>
            </>
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
                    <div className="divider my-1" />
                    <MenuLink href="/dashboard" label={t("nav.dashboard")} />
                    <MenuLink href="/dashboard/listings" label={t("nav.myListings")} />
                    <MenuLink href="/dashboard/inbox" label={t("nav.inbox")} />
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
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">{t("nav.login")}</Link>
              <Link href="/register" className="btn btn-secondary btn-sm">{t("nav.register")}</Link>
            </>
          )}
        </div>

        {/* Mobile: Sell + hamburger */}
        <div className="flex nav:hidden items-center gap-2 ml-auto flex-shrink-0">
          {user && featureFlags.notifications && <NotificationBell />}
          {showDirectoryNav && (
            <Link href="/sell" className="btn btn-primary btn-sm">+ {t("nav.sell")}</Link>
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

      {/* Mobile overlay */}
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
            {/* Products (suite) switcher */}
            <MobileProductsList onNavigate={() => setMobileOpen(false)} />

            <div className="divider my-3" />

            {showDirectoryNav && (
              <nav className="flex flex-col gap-1">
                <Link href="/search" className="rounded-lg px-3 py-3 text-lg font-semibold text-ink hover:bg-bg-subtle">{t("nav.explore")}</Link>
                <Link href="/pricing" className="rounded-lg px-3 py-3 text-lg font-semibold text-ink hover:bg-bg-subtle">{t("nav.pricing")}</Link>
                {featureFlags.blogs && (
                  <Link href="/blog" className="rounded-lg px-3 py-3 text-lg font-semibold text-ink hover:bg-bg-subtle">{t("nav.blog")}</Link>
                )}
              </nav>
            )}

            {showDirectoryNav && (
              <>
                <div className="divider my-3" />
                <MobileCategoryAccordion />
              </>
            )}
          </div>

          {/* Sticky footer actions */}
          <div className="container-bs flex-shrink-0 border-t border-border py-4 flex flex-col gap-2">
            {featureFlags.multiLanguage && (
              <div className="flex items-center justify-between pb-1">
                <span className="text-sm text-muted">Language</span>
                <LanguageToggle />
              </div>
            )}
            {showDirectoryNav && (
              <Link href="/sell" className="btn btn-primary btn-block btn-lg">+ {t("nav.sell")}</Link>
            )}
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-secondary btn-block">{t("nav.dashboard")}</Link>
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
              <div className="flex gap-2">
                <Link href="/login" className="btn btn-secondary btn-block">{t("nav.login")}</Link>
                <Link href="/register" className="btn btn-brand btn-block">{t("nav.register")}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
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
