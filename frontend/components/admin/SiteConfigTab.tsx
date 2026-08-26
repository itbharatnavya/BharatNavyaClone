"use client";

// components/admin/SiteConfigTab.tsx — the no-code control center.
// adminSettings() GET → editable branding / homepage / FEATURE FLAGS grid /
// contact / footer / ranking weights. Save → adminUpdateSettings(patch).

import React, { useEffect, useState } from "react";
import {
  getSettings,
  updateSettings,
  type SiteSettings,
  type SiteBranding,
  type SiteHomepage,
  type SiteContact,
  type SiteFooter,
} from "./adminApi";
import {
  SectionHeader,
  Panel,
  Toggle,
  LoadingState,
  ErrorState,
} from "./ui";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import { useToast } from "@/components/Toast";

// pretty labels for known feature flags
const FLAG_LABEL: Record<string, string> = {
  recruitmentLive: "Recruitment (go-live)",
  consultationsLive: "Consultations (go-live)",
  chat: "In-app Chat",
  ai: "AI Concierge Search",
  voiceSearch: "Voice Search",
  aiAutofill: "AI Listing Auto-fill",
  stories: "24h Stories",
  storyHighlights: "Story Highlights",
  blogs: "Seller Blogs",
  referral: "Referral Program",
  follow: "Follow Sellers",
  notifications: "Notifications",
  reviews: "Ratings & Reviews",
  reports: "Report Listing",
  nearMe: "Near-Me / Distance",
  multiLanguage: "Multi-Language",
  ads: "In-App Ads",
  featuredListings: "Featured Listings",
};

function labelFor(key: string): string {
  return (
    FLAG_LABEL[key] ||
    key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

const linesToArr = (s: string): string[] =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

export default function SiteConfigTab() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [branding, setBranding] = useState<SiteBranding>({});
  const [homepage, setHomepage] = useState<SiteHomepage>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [contact, setContact] = useState<SiteContact>({});
  const [footer, setFooter] = useState<SiteFooter>({});
  const [tierBaseline, setTierBaseline] = useState<Record<string, number>>({});
  const [ranking, setRanking] = useState({
    wOrganic: "0.7",
    wPaid: "0.3",
    maxSponsoredPerPage: "3",
    relevanceFloorThreshold: "0.1",
  });
  const [sponsoredRowEnabled, setSponsoredRowEnabled] = useState(true);

  // list editors bound to textareas
  const [heroExamplesText, setHeroExamplesText] = useState("");
  const [featuredSlugsText, setFeaturedSlugsText] = useState("");

  // add-flag input
  const [newFlag, setNewFlag] = useState("");

  function hydrate(s: SiteSettings) {
    setBranding(s.branding || {});
    setHomepage(s.homepage || {});
    setFlags(s.featureFlags || {});
    setContact(s.contact || {});
    setFooter(s.footer || {});
    setTierBaseline(s.tierBaseline || {});
    setRanking({
      wOrganic: String(s.wOrganic ?? 0.7),
      wPaid: String(s.wPaid ?? 0.3),
      maxSponsoredPerPage: String(s.maxSponsoredPerPage ?? 3),
      relevanceFloorThreshold: String(s.relevanceFloorThreshold ?? 0.1),
    });
    setSponsoredRowEnabled(s.sponsoredRowEnabled ?? true);
    setHeroExamplesText((s.homepage?.heroExamples || []).join("\n"));
    setFeaturedSlugsText((s.homepage?.featuredCategorySlugs || []).join("\n"));
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      hydrate(await getSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function addFlag() {
    const key = newFlag.trim();
    if (!key) return;
    setFlags((f) => ({ ...f, [key]: f[key] ?? true }));
    setNewFlag("");
  }

  async function save() {
    setSaving(true);
    try {
      const patch: Partial<SiteSettings> = {
        branding,
        homepage: {
          ...homepage,
          heroExamples: linesToArr(heroExamplesText),
          featuredCategorySlugs: linesToArr(featuredSlugsText),
        },
        featureFlags: flags,
        contact,
        footer,
        tierBaseline,
        wOrganic: Number(ranking.wOrganic) || 0,
        wPaid: Number(ranking.wPaid) || 0,
        maxSponsoredPerPage: Number(ranking.maxSponsoredPerPage) || 0,
        relevanceFloorThreshold: Number(ranking.relevanceFloorThreshold) || 0,
        sponsoredRowEnabled,
      };
      const saved = await updateSettings(patch);
      hydrate(saved);
      addToast("Site config saved", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading site config…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const flagKeys = Object.keys(flags).sort();

  return (
    <div>
      <SectionHeader
        title="Site Config"
        subtitle="No-code control center. Everything here is read live by the public site."
        actions={
          <Button variant="brand" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save all changes"}
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Branding */}
        <Panel title="Branding">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Site name"
              value={branding.siteName || ""}
              onChange={(e) =>
                setBranding({ ...branding, siteName: e.target.value })
              }
            />
            <Input
              label="Logo text"
              value={branding.logoText || ""}
              onChange={(e) =>
                setBranding({ ...branding, logoText: e.target.value })
              }
            />
            <Input
              label="Tagline"
              value={branding.tagline || ""}
              onChange={(e) =>
                setBranding({ ...branding, tagline: e.target.value })
              }
              containerClassName="sm:col-span-2"
            />
            <div>
              <span className="field-label">Accent blue (trust)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accentBlue || "#2563EB"}
                  onChange={(e) =>
                    setBranding({ ...branding, accentBlue: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded-md border border-border-strong"
                />
                <Input
                  value={branding.accentBlue || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, accentBlue: e.target.value })
                  }
                  containerClassName="flex-1"
                />
              </div>
            </div>
            <div>
              <span className="field-label">Accent orange (action)</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accentOrange || "#F97316"}
                  onChange={(e) =>
                    setBranding({ ...branding, accentOrange: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded-md border border-border-strong"
                />
                <Input
                  value={branding.accentOrange || ""}
                  onChange={(e) =>
                    setBranding({ ...branding, accentOrange: e.target.value })
                  }
                  containerClassName="flex-1"
                />
              </div>
            </div>
          </div>
        </Panel>

        {/* Homepage */}
        <Panel title="Homepage" desc="Hero copy, examples, featured categories and section toggles.">
          <div className="space-y-4">
            <Input
              label="Hero title"
              value={homepage.heroTitle || ""}
              onChange={(e) =>
                setHomepage({ ...homepage, heroTitle: e.target.value })
              }
            />
            <Textarea
              label="Hero subtitle"
              value={homepage.heroSubtitle || ""}
              onChange={(e) =>
                setHomepage({ ...homepage, heroSubtitle: e.target.value })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label="Hero search examples (one per line)"
                value={heroExamplesText}
                onChange={(e) => setHeroExamplesText(e.target.value)}
                placeholder={"CA in Pune for GST filing\nstainless steel suppliers"}
              />
              <Textarea
                label="Featured category slugs (one per line)"
                value={featuredSlugsText}
                onChange={(e) => setFeaturedSlugsText(e.target.value)}
                placeholder={"industrial-machinery-equipment\nfood-agriculture-farming"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Toggle
                label="Show Stories"
                checked={!!homepage.showStories}
                onChange={(v) => setHomepage({ ...homepage, showStories: v })}
              />
              <Toggle
                label="Show Trending"
                checked={!!homepage.showTrending}
                onChange={(v) => setHomepage({ ...homepage, showTrending: v })}
              />
              <Toggle
                label="Show Featured Sellers"
                checked={!!homepage.showFeaturedSellers}
                onChange={(v) =>
                  setHomepage({ ...homepage, showFeaturedSellers: v })
                }
              />
              <Toggle
                label="Show Category Grid"
                checked={!!homepage.showCategoryGrid}
                onChange={(v) =>
                  setHomepage({ ...homepage, showCategoryGrid: v })
                }
              />
            </div>
          </div>
        </Panel>

        {/* Feature flags grid */}
        <Panel
          title="Feature flags"
          desc="Toggle any capability on or off across the whole platform."
          right={
            <div className="flex items-center gap-2">
              <input
                className="input"
                style={{ height: 34, width: 160 }}
                placeholder="newFlagName"
                value={newFlag}
                onChange={(e) => setNewFlag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFlag()}
              />
              <Button size="sm" variant="secondary" onClick={addFlag}>
                + Add flag
              </Button>
            </div>
          }
        >
          {flagKeys.length === 0 ? (
            <p className="text-sm text-muted">No flags defined yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {flagKeys.map((key) => (
                <Toggle
                  key={key}
                  label={labelFor(key)}
                  hint={key}
                  checked={!!flags[key]}
                  onChange={(v) => setFlags({ ...flags, [key]: v })}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Ranking weights */}
        <Panel
          title="Ranking weights"
          desc="Balance organic relevance vs. paid boost, and cap sponsored density."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Organic weight (wOrganic)"
              type="number"
              step="0.05"
              value={ranking.wOrganic}
              onChange={(e) =>
                setRanking({ ...ranking, wOrganic: e.target.value })
              }
            />
            <Input
              label="Paid weight (wPaid)"
              type="number"
              step="0.05"
              value={ranking.wPaid}
              onChange={(e) => setRanking({ ...ranking, wPaid: e.target.value })}
            />
            <Input
              label="Max sponsored / page"
              type="number"
              value={ranking.maxSponsoredPerPage}
              onChange={(e) =>
                setRanking({ ...ranking, maxSponsoredPerPage: e.target.value })
              }
            />
            <Input
              label="Relevance floor threshold"
              type="number"
              step="0.05"
              value={ranking.relevanceFloorThreshold}
              onChange={(e) =>
                setRanking({
                  ...ranking,
                  relevanceFloorThreshold: e.target.value,
                })
              }
            />
          </div>

          {Object.keys(tierBaseline).length > 0 && (
            <div className="mt-4">
              <span className="field-label">
                Priority tier baseline boost
              </span>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(tierBaseline).map(([tier, val]) => (
                  <Input
                    key={tier}
                    label={tier}
                    type="number"
                    value={String(val)}
                    onChange={(e) =>
                      setTierBaseline({
                        ...tierBaseline,
                        [tier]: Number(e.target.value) || 0,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 max-w-sm">
            <Toggle
              label="Sponsored row enabled"
              hint="Show the sponsored results row on search/category pages."
              checked={sponsoredRowEnabled}
              onChange={setSponsoredRowEnabled}
            />
          </div>
        </Panel>

        {/* Contact + footer */}
        <Panel title="Contact & footer">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Contact email"
              value={contact.email || ""}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
            <Input
              label="Contact phone"
              value={contact.phone || ""}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            />
            <Input
              label="Address"
              value={contact.address || ""}
              onChange={(e) =>
                setContact({ ...contact, address: e.target.value })
              }
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Footer about text"
              value={footer.about || ""}
              onChange={(e) => setFooter({ ...footer, about: e.target.value })}
            />
          </div>
        </Panel>

        <div className="flex justify-end">
          <Button variant="brand" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save all changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
