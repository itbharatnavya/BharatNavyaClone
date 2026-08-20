"use client";

// Directory — the marketplace product landing within the BharatSource suite.
// Section order is deliberate (v9 rework — see frontend-design-guide.md): a
// classic attention → interest → desire → action funnel rather than a flat
// stack of unrelated blocks. Browse (categories + trending/popular) comes
// right after the trust bar so visitors can act immediately; "How it works"
// sits before the social-proof block to remove friction about the lead
// model before showing sellers/reviews/brands; "Why BharatSource" moves to
// just before the final CTA as the persuasive close, once real proof has
// already been shown. Backgrounds alternate white/tinted bands instead of
// one flat white page, and every section enters via the shared Reveal
// primitive (components/Reveal.tsx) — the same motion language already used
// on the suite homepage (app/page.tsx). No emojis anywhere — inline SVG
// icons only.

import React, { useMemo } from "react";
import type { Category } from "@/lib/types";
import { useCategories, useCategoryTree } from "@/lib/catalog";
import Breadcrumbs from "@/components/Breadcrumbs";
import Reveal from "@/components/Reveal";
import StoryRail from "@/components/StoryRail";
import SectionHeading from "@/components/home/SectionHeading";
import HomeHero from "@/components/home/HomeHero";
import PromoBanner from "@/components/home/PromoBanner";
import CategoryIconGrid from "@/components/home/CategoryIconGrid";
import CategoryGroupGrid from "@/components/home/CategoryGroupGrid";
import TrustBar from "@/components/home/TrustBar";
import ValueProps from "@/components/home/ValueProps";
import TrendingSearches from "@/components/home/TrendingSearches";
import PopularSearches from "@/components/home/PopularSearches";
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

  const { categories: allCategories } = useCategories();
  const { tree: categoryTree } = useCategoryTree();

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

      {/* ---------------- 1 · HERO — attention ---------------- */}
      <HomeHero
        title={heroTitle}
        examples={homepage.heroExamples || []}
      />

      {/* ---------------- 1.5 · STORIES (flag-gated) — right after the hero,
          same spot Instagram/WhatsApp give status updates: highest-visibility
          real estate, before any other content competes for attention. ---------------- */}
      {storiesOn && shown(homepage.showStories) && (
        <section className="container-bs" style={{ paddingTop: 28 }}>
          <Reveal>
            <SectionHeading
              eyebrow={t("home.stories.eyebrow", "Updates")}
              title={t("home.stories.title", "Fresh from sellers")}
              subtitle={t("home.stories.subtitle", "New stock and offers — updates disappear after 24 hours.")}
            />
            <StoryRail />
          </Reveal>
        </section>
      )}

      {/* ---------------- 2 · TRUST BAR (live stats) ---------------- */}
      <section className="container-bs" style={{ paddingTop: 22 }}>
        <Reveal>
          <TrustBar />
        </Reveal>
      </section>

      {/* ---------------- 3 · ADVERTISEMENT + CATEGORY QUICK NAV ---------------- */}
      <section className="container-bs" style={{ paddingTop: 28 }}>
        <Reveal>
          <PromoBanner />
        </Reveal>
      </section>
      <section className="container-bs" style={{ paddingTop: 30, paddingBottom: 8 }}>
        <Reveal>
          <CategoryIconGrid categories={featuredCategories} />
        </Reveal>
      </section>

      {/* ---------------- 4 · BROWSE BY CATEGORY — interest (tinted band) ---------------- */}
      {shown(homepage.showCategoryGroups) && (
        <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs section-pad-sm">
            <Reveal>
              <SectionHeading
                title="Browse by category"
                subtitle="Real sub-categories from our own catalog, not a generic list."
              />
            </Reveal>
            <CategoryGroupGrid categories={categoryTree} />
          </div>
        </section>
      )}

      {/* ---------------- 5 · TRENDING + POPULAR SEARCHES — what people want ---------------- */}
      {shown(homepage.showTrendingSearches) && (
        <section className="container-bs section-pad-sm">
          <Reveal>
            <TrendingSearches />
          </Reveal>
        </section>
      )}
      {shown(homepage.showPopularSearches) && (
        <section className="container-bs section-pad-sm">
          <PopularSearches />
        </section>
      )}

      {/* ---------------- 6 · HOW IT WORKS — remove friction before proof (tinted band) ---------------- */}
      {shown(homepage.showHowItWorks) && (
        <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs section-pad">
            <Reveal>
              <SectionHeading
                eyebrow={t("home.how.eyebrow", "How it works")}
                title={t("home.how.title", "Sourcing made simple")}
                subtitle={t("home.how.subtitle", "No checkout, no middlemen taking a cut — just direct connections.")}
              />
            </Reveal>
            <HowItWorks />
          </div>
        </section>
      )}

      {/* ---------------- 9 · TOP BRANDS (self-hiding) ---------------- */}
      <TopBrands />

      {/* ---------------- 11 · VALUE PROPS — persuasive recap, right before the ask (tinted band) ---------------- */}
      <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)" }}>
        <div className="container-bs section-pad">
          <Reveal>
            <SectionHeading
              eyebrow={t("home.value.eyebrow", "Why BharatSource")}
              title={t("home.value.title", "One platform to buy and to sell")}
              subtitle={t("home.value.subtitle", "A single account, a lead-and-directory model, and an AI concierge doing the searching for you.")}
            />
          </Reveal>
          <ValueProps />
        </div>
      </section>

      {/* ---------------- 12 · FINAL CTA BAND — action ---------------- */}
      {shown(homepage.showSellCta) && (
        <section className="container-bs section-pad">
          <Reveal>
            <FinalCta />
          </Reveal>
        </section>
      )}
    </div>
  );
}
