"use client";

// vendorAuthors — resolves a blog's authoring vendor (seller) for interlinking.
//
// Blogs carry only `sellerId` (a user id). There is no public "seller by id"
// endpoint — getSeller() is keyed by slug — so to turn a blog into a link to
// `/seller/<slug>` (and to show the vendor's company name / logo / city) we build
// a best-effort id→seller map from the public, id-carrying surfaces we DO have:
//   • getFeaturedSellers()  → { id, slug, name, city }
//   • getListings()         → listing.seller (when the API denormalizes it)
//   • getStories()          → { sellerId, sellerSlug, sellerName }
// plus any fields a blog itself may denormalize (authorName / sellerSlug / seller).
//
// Everything is guarded and non-fatal: if a vendor can't be resolved we degrade
// gracefully (show "BharatSource Seller", card still links to the article) and
// never crash the page.

import { useEffect, useState } from "react";
import {
  getFeaturedSellers,
  getListings,
  getStories,
  getSeller,
} from "@/lib/api";
import type { Blog, SellerPublicProfile } from "@/lib/types";

export interface VendorAuthor {
  id: string;
  name: string; // company / vendor name (best available)
  slug?: string; // seller-profile slug → enables the /seller/<slug> link
  logo?: string | null; // avatar / logo (Avatar falls back to initials if absent)
  city?: string;
  // "employer" when the author is a Recruitment employer, not a Directory seller
  // (blogs.js's attachAuthors sets authorType — build plan Phase 7). Defaults to
  // "seller" when absent, matching every blog authored before this field existed.
  type?: "seller" | "employer";
}

// A blog may (now or later) carry denormalized author fields — read them defensively.
type BlogWithAuthor = Blog & {
  authorName?: string;
  sellerSlug?: string;
  authorType?: "seller" | "employer";
  seller?: {
    slug?: string;
    companyName?: string;
    name?: string;
    logo?: string | null;
    city?: string;
  };
};

function pickName(...vals: Array<string | undefined | null>): string {
  for (const v of vals) if (v && v.trim()) return v.trim();
  return "";
}

// Build the best-effort id→VendorAuthor map from public sources. Never throws.
async function buildIdSlugMap(): Promise<Record<string, VendorAuthor>> {
  const map: Record<string, VendorAuthor> = {};

  const put = (v: VendorAuthor) => {
    const prev = map[v.id];
    map[v.id] = {
      id: v.id,
      name: pickName(prev?.name, v.name),
      slug: prev?.slug || v.slug,
      logo: prev?.logo ?? v.logo ?? null,
      city: prev?.city || v.city,
    };
  };

  const [featured, listings, stories] = await Promise.allSettled([
    getFeaturedSellers(),
    getListings({ limit: 100 }),
    getStories(),
  ]);

  if (featured.status === "fulfilled" && Array.isArray(featured.value)) {
    for (const s of featured.value) {
      if (s && s.id) {
        put({
          id: s.id,
          name: pickName(s.companyName, s.name),
          slug: s.slug,
          logo: s.logo ?? null,
          city: s.city,
        });
      }
    }
  }

  if (listings.status === "fulfilled" && listings.value?.listings) {
    for (const l of listings.value.listings) {
      const sel = l.seller;
      if (sel && sel.id) {
        put({
          id: sel.id,
          name: pickName(sel.companyName, sel.name, l.sellerName),
          slug: sel.slug,
          logo: sel.logo ?? null,
          city: sel.city,
        });
      }
    }
  }

  if (stories.status === "fulfilled" && Array.isArray(stories.value)) {
    for (const g of stories.value) {
      if (g && g.sellerId) {
        put({
          id: g.sellerId,
          name: pickName(g.sellerName),
          slug: g.sellerSlug,
          logo: g.avatarUrl ?? null,
        });
      }
    }
  }

  return map;
}

// Merge the id→map lookup with any denormalized fields on the blog itself.
export function vendorFor(
  blog: Blog,
  map: Record<string, VendorAuthor>
): VendorAuthor {
  const b = blog as BlogWithAuthor;
  const fromMap = map[blog.sellerId];
  const name = pickName(
    fromMap?.name,
    b.seller?.companyName,
    b.seller?.name,
    b.authorName,
    "BharatSource Seller"
  );
  const slug = fromMap?.slug || b.sellerSlug || b.seller?.slug;
  const logo = fromMap?.logo ?? b.seller?.logo ?? null;
  const city = fromMap?.city || b.seller?.city;
  // fromMap only ever resolves sellers (see buildIdSlugMap's sources, all
  // seller-specific) — an employer author is never in it, so b.authorType is the only
  // source of truth for that case and always wins when present.
  const type = b.authorType || "seller";
  return { id: blog.sellerId, name, slug, logo, city, type };
}

// Hook for the blog index: resolve the authoring vendor for a set of blogs.
export function useVendorAuthors(blogs: Blog[]): {
  authorFor: (blog: Blog) => VendorAuthor;
  ready: boolean;
} {
  const [map, setMap] = useState<Record<string, VendorAuthor>>({});
  const [ready, setReady] = useState(false);
  const ids = Array.from(new Set(blogs.map((b) => b.sellerId))).sort().join(",");

  useEffect(() => {
    let active = true;
    if (!ids) {
      setReady(true);
      return;
    }
    setReady(false);
    buildIdSlugMap()
      .then((m) => active && setMap(m))
      .catch(() => active && setMap({}))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [ids]);

  return { authorFor: (blog: Blog) => vendorFor(blog, map), ready };
}

// Hook for the article page: resolve the vendor + fetch their full public profile
// (about text, listings) for the "About the vendor" mini-card. Best-effort.
export function useVendorProfile(blog: Blog | null): {
  author: VendorAuthor | null;
  profile: SellerPublicProfile | null;
} {
  const [author, setAuthor] = useState<VendorAuthor | null>(null);
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const sellerId = blog?.sellerId || "";

  useEffect(() => {
    let active = true;
    setAuthor(null);
    setProfile(null);
    if (!blog) return;

    (async () => {
      const map = await buildIdSlugMap().catch(
        () => ({} as Record<string, VendorAuthor>)
      );
      if (!active) return;
      const a = vendorFor(blog, map);
      setAuthor(a);

      // getSeller() only resolves Directory sellers — an employer author has no
      // seller_profiles row, so this enrichment step (and the listings-promotion data
      // it feeds) is skipped for type:"employer"; the best-effort author from
      // vendorFor() (already correctly name/slug/logo-populated from the blog's own
      // denormalized fields) is used as-is.
      if (a.slug && a.type !== "employer") {
        try {
          const p = await getSeller(a.slug);
          if (!active) return;
          setProfile(p);
          // Enrich the author with the fuller profile data (company name, logo, city).
          setAuthor({
            id: a.id,
            name: pickName(p.seller?.companyName, a.name),
            slug: p.seller?.slug || a.slug,
            logo: p.seller?.logo ?? a.logo ?? null,
            city: p.seller?.location?.city || p.city || a.city,
            type: a.type,
          });
        } catch {
          /* non-fatal — keep the best-effort author */
        }
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  return { author, profile };
}
