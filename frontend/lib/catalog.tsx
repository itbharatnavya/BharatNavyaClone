"use client";

// BharatSource — shared catalog context. Fetches categories, brands and
// featured sellers ONCE per session on mount and hands them out via context,
// instead of every component that needs one of these re-fetching it
// independently. Before this existed, landing on /directory fired
// getCategories() 3x at once (this page, TrustBar, CategoryMegaMenu/
// MobileCategoryAccordion in the Navbar), getBrands()/getFeaturedSellers()
// 2x each, alongside ~10 other independent fetches — 15-20+ simultaneous
// requests to one origin on page mount, which is what made the very first
// click after a page load feel unresponsive (the click's own navigation
// request queued behind that burst on the browser's ~6-connections-per-
// origin cap). Mirrors the fetch-once/safe-default/non-blocking shape of
// ConfigProvider (lib/config.tsx) — pages render immediately with empty
// arrays before (or even if) the fetch resolves.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCategories, getBrands, getFeaturedSellers } from "./api";
import type { Brand } from "./api";
import type { Category } from "./types";
import { buildTree, type CategoryTreeNode } from "./categoryTree";

interface CatalogContextValue {
  categories: Category[];
  categoryTree: CategoryTreeNode[];
  categoriesLoading: boolean;
  brands: Brand[];
  brandsLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featuredSellers: any[];
  featuredSellersLoading: boolean;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [featuredSellers, setFeaturedSellers] = useState<any[]>([]);
  const [featuredSellersLoading, setFeaturedSellersLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((c) => active && setCategories(c))
      .catch(() => {
        /* keep empty — every consumer already guards for a still-empty list */
      })
      .finally(() => active && setCategoriesLoading(false));
    getBrands()
      .then((b) => active && setBrands(b))
      .catch(() => {})
      .finally(() => active && setBrandsLoading(false));
    getFeaturedSellers()
      .then((s) => active && Array.isArray(s) && setFeaturedSellers(s))
      .catch(() => {})
      .finally(() => active && setFeaturedSellersLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const categoryTree = useMemo(() => buildTree(categories), [categories]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      categories,
      categoryTree,
      categoriesLoading,
      brands,
      brandsLoading,
      featuredSellers,
      featuredSellersLoading,
    }),
    [categories, categoryTree, categoriesLoading, brands, brandsLoading, featuredSellers, featuredSellersLoading]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    // Fall back to safe empty defaults instead of throwing, matching
    // useConfig() — a component rendered outside the provider (tests,
    // isolated stories) still works, it just sees an empty catalog.
    return {
      categories: [],
      categoryTree: [],
      categoriesLoading: false,
      brands: [],
      brandsLoading: false,
      featuredSellers: [],
      featuredSellersLoading: false,
    };
  }
  return ctx;
}

export function useCategories(): { categories: Category[]; loading: boolean } {
  const { categories, categoriesLoading } = useCatalog();
  return { categories, loading: categoriesLoading };
}

export function useCategoryTree(): { tree: CategoryTreeNode[]; loading: boolean } {
  const { categoryTree, categoriesLoading } = useCatalog();
  return { tree: categoryTree, loading: categoriesLoading };
}

export function useBrands(): { brands: Brand[]; loading: boolean } {
  const { brands, brandsLoading } = useCatalog();
  return { brands, loading: brandsLoading };
}

export function useFeaturedSellers(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sellers: any[];
  loading: boolean;
} {
  const { featuredSellers, featuredSellersLoading } = useCatalog();
  return { sellers: featuredSellers, loading: featuredSellersLoading };
}

// Walks a category list's `.children` (when populated) into one flat array —
// shared by every call site that needs to name-match against the whole
// catalog (search-bar suggestion dropdowns, the global-search results list),
// instead of each one copy-pasting the same walk.
export function flattenCategories(cats: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (list: Category[]) => {
    for (const c of list) {
      out.push(c);
      if (c.children && c.children.length) walk(c.children);
    }
  };
  walk(cats || []);
  return out;
}
