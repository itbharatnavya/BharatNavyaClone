"use client";

// Guard for guest-only pages (Login/Register): once auth state resolves and
// a user IS logged in, send them onward instead of leaving the form up for
// re-submission. Mirrors the loading/!user idiom DashboardShell already uses
// for the opposite (auth-required) case.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth";
import { safeNext } from "./redirect";

export function useGuestOnly(next: string, fallback: string) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(safeNext(next, fallback));
    }
  }, [loading, user, next, fallback, router]);

  // While loading, or once we know a user IS present (redirect underway),
  // the caller should hold off rendering the form.
  return { loading, redirecting: !loading && !!user };
}
