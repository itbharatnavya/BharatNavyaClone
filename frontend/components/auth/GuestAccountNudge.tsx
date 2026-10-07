"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import ContactAuthModal from "@/components/auth/ContactAuthModal";

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

// Storage can be blocked (private windows, strict settings); the nudge must still close.
function read(store: "local" | "session", key: string): string | null {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(key); } catch { return null; }
}
function write(store: "local" | "session", key: string, value: string) {
  try { (store === "local" ? localStorage : sessionStorage).setItem(key, value); } catch { /* ignore */ }
}
// Once closed or shown this session, never again (also guards against storage being unavailable).
let closedThisLoad = false;
const blocked = () => closedThisLoad || !!read("session", SHOWN_KEY) || Date.now() - Number(read("local", DISMISSED_KEY) || 0) < DISMISS_MS;

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
    if (blocked()) return;

    const startedAt = Number(read("session", START_KEY) || Date.now());
    write("session", START_KEY, String(startedAt));
    const lastPath = read("session", LAST_PATH_KEY);
    const views = Number(read("session", VIEWS_KEY) || 0) + (lastPath === pathname ? 0 : 1);
    write("session", VIEWS_KEY, String(views));
    write("session", LAST_PATH_KEY, pathname);

    let engaged = views >= 2;
    let done = false;
    const stop = () => {
      done = true;
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
    // Shows at most once: rechecks the closed/shown flags every time and stops listening after.
    const reveal = () => {
      if (done) return;
      if (blocked()) { stop(); return; }
      if (!engaged || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      write("session", SHOWN_KEY, "true");
      stop();
      setVisible(true);
    };
    const onScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available > 0 && window.scrollY / available >= 0.35) {
        engaged = true;
        if (Date.now() - startedAt >= WAIT_MS) reveal();
      }
    };
    const remaining = Math.max(0, WAIT_MS - (Date.now() - startedAt));
    const timer = window.setTimeout(reveal, remaining);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return stop;
  }, [eligible, loading, pathname, user]);

  if (!visible || user || !eligible) return null;

  const dismiss = () => {
    closedThisLoad = true;
    write("local", DISMISSED_KEY, String(Date.now()));
    write("session", SHOWN_KEY, "true");
    setVisible(false);
  };

  return <ContactAuthModal open purpose="account" onClose={dismiss} onSuccess={() => { closedThisLoad = true; setVisible(false); }} />;
}
