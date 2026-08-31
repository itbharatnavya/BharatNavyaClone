"use client";

// SearchDock — lets the Directory homepage hero (components/home/HomeHero.tsx)
// tell the global Navbar (components/Navbar.tsx) how far its search has
// scrolled out of view, as a continuous 0→1 `progress` rather than a single
// on/off flip, so the compact search bar can visibly slide/fade into the
// sticky main navbar row instead of just popping in. Directory
// homepage is the only publisher today; Navbar just renders whatever it's
// told, and defaults to "not docked" everywhere else.
//
// It also holds the shared `query`/`city` the hero search box and the
// navbar's docked copy both read/write through as CONTROLLED AISearchBar
// props — without this, each AISearchBar instance keeps its own local
// state, so text typed in the hero box would vanish once the docked copy
// (a completely separate component instance) takes over on scroll.
//
// `query`/`selectedCategory` must only ever survive onto a page that's the
// direct result of an actual search action — never just because the visitor
// browsed somewhere via a plain link/tile/mega-menu/back-button. `markSearchNav()`
// is how DirectorySearchBar (the only writer of a *committed* search) tells this
// provider "the navigation I'm about to trigger is expected, don't wipe what I
// just set." Any OTHER pathname change (not preceded by a mark) clears both —
// see the effect below. Deliberately keyed on `pathname` alone, not the full
// URL/search-params: a filter-pill `router.replace` that only changes query
// params (e.g. DiscoveryResults' `syncUrl`) must never trip this, or every
// filter click on /search would wipe the docked query/chip.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PAN_INDIA_LABEL } from "./indiaGeo";

export interface SelectedCategory {
  slug: string;
  name: string;
}

interface SearchDockValue {
  // 0 = hero search fully in view, 1 = fully docked in the navbar.
  progress: number;
  // Convenience boolean for callers that only need an on/off gate.
  docked: boolean;
  chips: string[];
  query: string;
  city: string;
  // The category picked from a suggestion dropdown (or the category page
  // currently being browsed) — shown as a removable chip in the compact
  // Directory search bars, alongside (not instead of) the free-text query.
  selectedCategory: SelectedCategory | null;
  // Recruitment's own docked-search fields (RoleSearchBar's "[role] jobs in
  // [city]"), kept SEPARATE from `query`/`city` above rather than reusing
  // them: those are Directory's free-text search + city, and this same
  // provider is mounted once for the whole app (layout.tsx) — sharing one
  // pair of fields between two different products' search bars would leak
  // Directory's typed text into Recruitment's role field (or vice versa) on
  // every navigation between the two. `progress` (below) IS shared: only one
  // hero is ever mounted at a time, so there's no cross-product ambiguity
  // there. `chips` (Directory example searches) stays Directory-only too.
  roleQuery: string;
  roleCity: string;
  setProgress: (progress: number, chips?: string[]) => void;
  setQuery: (query: string) => void;
  setCity: (city: string) => void;
  setSelectedCategory: (category: SelectedCategory | null) => void;
  setRoleQuery: (query: string) => void;
  setRoleCity: (city: string) => void;
  // Call immediately before a `router.push` that a real search action (submit,
  // or picking a category/listing suggestion) triggers — see file header.
  markSearchNav: () => void;
}

const SearchDockContext = createContext<SearchDockValue>({
  progress: 0,
  docked: false,
  chips: [],
  query: "",
  city: PAN_INDIA_LABEL,
  selectedCategory: null,
  roleQuery: "",
  roleCity: "",
  setProgress: () => {},
  setQuery: () => {},
  setCity: () => {},
  setSelectedCategory: () => {},
  setRoleQuery: () => {},
  setRoleCity: () => {},
  markSearchNav: () => {},
});

export function SearchDockProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(PAN_INDIA_LABEL);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [roleQuery, setRoleQuery] = useState("");
  const [roleCity, setRoleCity] = useState("");

  const pathname = usePathname();
  const pendingSearchNavRef = useRef(false);
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathname === prevPathnameRef.current) return; // no real route change (covers first render)
    prevPathnameRef.current = pathname;
    if (pendingSearchNavRef.current) {
      pendingSearchNavRef.current = false; // expected — a real search action drove this navigation
      return;
    }
    // Some other navigation (plain link/tile/mega-menu/back-button) — the
    // previous page's search state must not leak onto a page nobody searched for.
    setQuery("");
    setSelectedCategory(null);
    setRoleQuery("");
  }, [pathname]);
  const markSearchNav = useCallback(() => {
    pendingSearchNavRef.current = true;
  }, []);

  const value = useMemo<SearchDockValue>(
    () => ({
      progress,
      docked: progress > 0,
      chips,
      query,
      city,
      selectedCategory,
      roleQuery,
      roleCity,
      setProgress: (p, c) => {
        setProgressState(p);
        if (c) setChips(c);
      },
      setQuery,
      setCity,
      setSelectedCategory,
      setRoleQuery,
      setRoleCity,
      markSearchNav,
    }),
    [progress, chips, query, city, selectedCategory, roleQuery, roleCity, markSearchNav]
  );

  return <SearchDockContext.Provider value={value}>{children}</SearchDockContext.Provider>;
}

export function useSearchDock() {
  return useContext(SearchDockContext);
}
