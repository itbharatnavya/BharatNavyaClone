"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";

const START_KEY = "bn_guest_nudge_started_at";
const VIEWS_KEY = "bn_guest_nudge_views";
const LAST_PATH_KEY = "bn_guest_nudge_last_path";
const SHOWN_KEY = "bn_guest_nudge_shown";
const DISMISSED_KEY = "bn_guest_nudge_dismissed_at";
const WAIT_MS = 120_000;
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const EXCLUDED_PREFIXES = [
  "/login", "/register", "/dashboard", "/admin", "/onboarding",
  "/seller/dashboard", "/employer/dashboard", "/my-", "/messages",
];

export default function GuestAccountNudge() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const eligible = useMemo(
    () => !EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname]
  );

  useEffect(() => {
    if (loading || user || !eligible) {
      setVisible(false);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_MS || sessionStorage.getItem(SHOWN_KEY)) return;

    const startedAt = Number(sessionStorage.getItem(START_KEY) || Date.now());
    sessionStorage.setItem(START_KEY, String(startedAt));
    const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
    const views = Number(sessionStorage.getItem(VIEWS_KEY) || 0) + (lastPath === pathname ? 0 : 1);
    sessionStorage.setItem(VIEWS_KEY, String(views));
    sessionStorage.setItem(LAST_PATH_KEY, pathname);

    let engaged = views >= 2;
    const reveal = () => {
      if (!engaged || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      sessionStorage.setItem(SHOWN_KEY, "true");
      setVisible(true);
    };
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available > 0 && window.scrollY / available >= 0.35) {
        engaged = true;
        if (Date.now() - startedAt >= WAIT_MS) reveal();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const remaining = Math.max(0, WAIT_MS - (Date.now() - startedAt));
    const timer = window.setTimeout(reveal, remaining);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [eligible, loading, pathname, user]);

  if (!visible || user || !eligible) return null;

  const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <aside className="guest-account-nudge" aria-label="Create an account to keep your progress">
      <button className="guest-account-nudge-close" type="button" onClick={dismiss} aria-label="Dismiss account reminder">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <div className="guest-account-nudge-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 4.5h10a2 2 0 0 1 2 2v13l-7-3.5-7 3.5v-13a2 2 0 0 1 2-2Z" /></svg>
      </div>
      <div className="guest-account-nudge-copy">
        <strong>Keep what you find.</strong>
        <p>Create an account to return to shortlisted companies and roles without starting over.</p>
        <div>
          <Link className="btn btn-brand btn-sm" href={`/register${next}`}>Create account</Link>
          <Link className="guest-account-nudge-login" href={`/login${next}`}>Sign in</Link>
        </div>
      </div>
    </aside>
  );
}
