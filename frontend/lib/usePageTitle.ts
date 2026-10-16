"use client";

// Names the browser tab after data a page loads (a company, a listing, a job). Static pages
// name themselves through metadata in their route layout instead. Next re-applies the
// layout's default title when a page rewrites its own URL (filters, sort), so the title is
// put back whenever document.title changes away from it.
import { useEffect } from "react";

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return;
    const want = `${title} | Bharat Navya`;
    document.title = want;
    const observer = new MutationObserver(() => { if (document.title !== want) document.title = want; });
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [title]);
}
