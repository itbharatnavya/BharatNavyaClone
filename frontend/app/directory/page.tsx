"use client";

// Directory — the marketplace product landing within the BharatSource suite.
// This is EXACTLY the composition that used to be the site homepage (HomeHero /
// TrustBar / ValueProps / FeaturedSellers / TopBrands / Trending / Featured
// Categories / HowItWorks / FinalCta) — reusing the same components/home/* pieces
// unchanged. The only addition is a slim breadcrumb/eyebrow band up top so it
// reads as the "Directory" product. All CTAs still point at the marketplace
// routes (search, /categories, /register, category pages), which are unchanged.
// No emojis anywhere — inline SVG icons only.

import React, { useEffect, useMemo, useState } from "react";
import type { Category } from "@/lib/types";
import { getCategories } from "@/lib/api";
import Breadcrumbs from "@/components/Breadcrumbs";
import StoryRail from "@/components/StoryRail";
import SectionHeading from "@/components/home/SectionHeading";
import HomeHero from "@/components/home/HomeHero";
import TrustBar from "@/components/home/TrustBar";
import ValueProps from "@/components/home/ValueProps";
import FeaturedCategories from "@/components/home/FeaturedCategories";
import TrendingRail from "@/components/home/TrendingRail";
import FeaturedSellers from "@/components/home/FeaturedSellers";
import TopBrands from "@/components/home/TopBrands";
import HowItWorks from "@/components/home/HowItWorks";
import FinalCta from "@/components/home/FinalCta";
import { useAppConfig, useTr, useFlag, shown } from "@/components/discovery/hooks";

function flatten(cats: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (list: Category[]) => {
    for (const c of list) {
      out.push(c);
      if (c.children && c.children.length) walk(c.children);
    }
  };
  walk(cats);
  return out;
}

export default function DirectoryPage() {
  const config = useAppConfig();
  const t = useTr();
  const storiesOn = useFlag("stories");

  const homepage = config.homepage || {};
  const branding = config.branding || {};

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [sellersEmpty, setSellersEmpty] = useState(false);

  useEffect(() => {
    let alive = true;
    getCategories()
      .then((c) => alive && setAllCategories(c))
      .catch(() => alive && setAllCategories([]));
    return () => {
      alive = false;
    };
  }, []);

  // Curated, featured categories only — never the full directory. Prefer the
  // admin-configured slugs; otherwise the top-level industry roots by order.
  const featuredCategories = useMemo<Category[]>(() => {
    const flat = flatten(allCategories);
    const slugs = homepage.featuredCategorySlugs;
    if (slugs && slugs.length) {
      const bySlug = new Map(flat.map((c) => [c.slug, c]));
      return slugs.map((s) => bySlug.get(s)).filter((c): c is Category => !!c);
    }
    const roots = flat.filter((c) => !c.parentId);
    const base = roots.length ? roots : flat;
    return [...base].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 8);
  }, [allCategories, homepage.featuredCategorySlugs]);

  const heroTitle = homepage.heroTitle || t("home.hero.title", "Find any vendor. Sell anything.");
  const heroSubtitle =
    homepage.heroSubtitle ||
    t(
      "home.hero.subtitle",
      "Describe what you need and let AI find the right verified supplier across every Indian industry — products and services, one catalog."
    );
  const heroEyebrow = branding.tagline || branding.siteName || "Source anything across India";

  return (
    <div>
      {/* ---------------- 0 · DIRECTORY PRODUCT STRIP ---------------- */}
      <section
        style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="container-bs"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 12, paddingBottom: 12 }}
        >
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Directory" }]} />
          <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>
            BharatSource Directory
          </span>
        </div>
      </section>

      {/* ---------------- 1 · HERO ---------------- */}
      <HomeHero
        eyebrow={heroEyebrow}
        title={heroTitle}
        subtitle={heroSubtitle}
        examples={homepage.heroExamples || []}
      />

      {/* ---------------- 2 · TRUST BAR (live stats) ---------------- */}
      <section className="container-bs" style={{ marginTop: "clamp(-40px, -4vw, -24px)", position: "relative", zIndex: 1 }}>
        <TrustBar />
      </section>

      {/* ---------------- STORIES (flag-gated) ---------------- */}
      {storiesOn && shown(homepage.showStories) && (
        <section className="container-bs" style={{ paddingTop: 36 }}>
          <StoryRail />
        </section>
      )}

      {/* ---------------- 3 · VALUE PROPS ---------------- */}
      <section className="container-bs section-pad">
        <SectionHeading
          eyebrow={t("home.value.eyebrow", "Why BharatSource")}
          title={t("home.value.title", "One platform to buy and to sell")}
          subtitle={t("home.value.subtitle", "A single account, a lead-and-directory model, and an AI concierge doing the searching for you.")}
        />
        <ValueProps />
      </section>

      {/* ---------------- 4 · SOCIAL PROOF: FEATURED SELLERS ---------------- */}
      {shown(homepage.showFeaturedSellers) && !sellersEmpty && (
        <section className="container-bs section-pad-sm">
          <SectionHeading
            eyebrow={t("home.sellers.eyebrow", "Trusted")}
            title={t("home.sellers.title", "Featured verified sellers")}
            subtitle={t("home.sellers.subtitle", "Established businesses with strong ratings and fast response times.")}
          />
          <FeaturedSellers limit={4} onEmpty={() => setSellersEmpty(true)} />
        </section>
      )}

      {/* ---------------- 4 · SOCIAL PROOF: TOP BRANDS (self-hiding) ---------------- */}
      <TopBrands />

      {/* ---------------- 4 · SOCIAL PROOF: TRENDING ---------------- */}
      {shown(homepage.showTrending) && (
        <section className="container-bs section-pad-sm">
          <SectionHeading
            eyebrow={t("home.trending.eyebrow", "Fresh")}
            title={t("home.trending.title", "Trending now")}
            subtitle={t("home.trending.subtitle", "The newest listings from sellers across India.")}
            actionLabel={t("home.trending.action", "View all")}
            actionHref="/search"
          />
          <TrendingRail city={homepage.trendingCity} limit={8} />
        </section>
      )}

      {/* ---------------- 5 · EXPLORE CATEGORIES (curated) ---------------- */}
      {shown(homepage.showCategoryGrid) && featuredCategories.length > 0 && (
        <section className="container-bs section-pad-sm">
          <SectionHeading
            eyebrow={t("home.categories.eyebrow", "Browse")}
            title={t("home.categories.title", "Explore top categories")}
            subtitle={t("home.categories.subtitle", "From raw materials to professional services — every industry.")}
            actionLabel={t("home.categories.action", "Browse all categories")}
            actionHref="/categories"
          />
          <FeaturedCategories categories={featuredCategories} />
        </section>
      )}

      {/* ---------------- 6 · HOW IT WORKS ---------------- */}
      {shown(homepage.showHowItWorks) && (
        <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs section-pad">
            <SectionHeading
              eyebrow={t("home.how.eyebrow", "How it works")}
              title={t("home.how.title", "Sourcing made simple")}
              subtitle={t("home.how.subtitle", "No checkout, no middlemen taking a cut — just direct connections.")}
            />
            <HowItWorks />
          </div>
        </section>
      )}

      {/* ---------------- 7 · FINAL CTA BAND ---------------- */}
      {shown(homepage.showSellCta) && (
        <section className="container-bs section-pad">
          <FinalCta />
        </section>
      )}
    </div>
  );
}
