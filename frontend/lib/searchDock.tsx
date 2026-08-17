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

import React, { createContext, useContext, useMemo, useState } from "react";
import { PAN_INDIA_LABEL } from "./indiaGeo";

interface SearchDockValue {
  // 0 = hero search fully in view, 1 = fully docked in the navbar.
  progress: number;
  // Convenience boolean for callers that only need an on/off gate.
  docked: boolean;
  chips: string[];
  query: string;
  city: string;
  setProgress: (progress: number, chips?: string[]) => void;
  setQuery: (query: string) => void;
  setCity: (city: string) => void;
}

const SearchDockContext = createContext<SearchDockValue>({
  progress: 0,
  docked: false,
  chips: [],
  query: "",
  city: PAN_INDIA_LABEL,
  setProgress: () => {},
  setQuery: () => {},
  setCity: () => {},
});

export function SearchDockProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(PAN_INDIA_LABEL);

  const value = useMemo<SearchDockValue>(
    () => ({
      progress,
      docked: progress > 0,
      chips,
      query,
      city,
      setProgress: (p, c) => {
        setProgressState(p);
        if (c) setChips(c);
      },
      setQuery,
      setCity,
    }),
    [progress, chips, query, city]
  );

  return <SearchDockContext.Provider value={value}>{children}</SearchDockContext.Provider>;
}

export function useSearchDock() {
  return useContext(SearchDockContext);
}
