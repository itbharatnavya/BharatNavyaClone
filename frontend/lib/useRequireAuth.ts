"use client";

// Shared guard for authenticated (and optionally role-gated) pages.
// Centralizes the `if (!loading && !user) router.replace(...)` idiom that
// was previously copy-pasted independently across DashboardShell, /profile,
// /rfq, /sell, /post-job, /recruitment/dashboard, and /admin (each slightly
// different — /admin in particular had no redirect at all for a non-admin
// authenticated user, just a dead-end "not allowed" screen).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth";
import type { Role } from "./types";

interface Options {
  role?: Role;
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
}

export function useRequireAuth({
  role,
  redirectTo,
  unauthorizedRedirectTo = "/",
}: Options = {}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const authorized = !!user && (!role || !!user.roles?.includes(role));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Default: sign in, then come back to this exact page (tab and filters included).
      const here = window.location.pathname + window.location.search;
      router.replace(redirectTo || `/login?next=${encodeURIComponent(here)}`);
      return;
    }
    if (role && !authorized) {
      router.replace(unauthorizedRedirectTo);
    }
  }, [loading, user, authorized, role, redirectTo, unauthorizedRedirectTo, router]);

  return { user, loading, authorized };
}
