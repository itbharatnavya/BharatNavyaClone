"use client";

// /profile — the main user's own basic account details (name, email, mobile,
// city/state, contact visibility, interests). Deliberately separate from the
// Directory dashboard's seller/company profile (/dashboard?tab=profile) — this
// page never shows company/business fields. Email and mobile are read-only for
// now (no change-email/change-mobile flow exists yet).

import React, { useEffect, useState } from "react";
import type { Category, User } from "@/lib/types";
import { getCategories, updateProfile } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { statesList, citiesForState } from "@/lib/indiaGeo";
import { PanelHeader, Icon, Loading, useTr } from "@/components/dashboard/shared";

type ContactVisibility = "public" | "on_request" | "hidden";

const STATE_OPTIONS = statesList().map((s) => ({ value: s, label: s }));
const OTHER_CITY = "__other__";

// interests / contactVisibility aren't in the User type yet — read defensively.
function readInterests(u: User): string[] {
  const v = (u as unknown as { interests?: unknown }).interests;
  return Array.isArray(v) ? (v as string[]) : [];
}
function readVisibility(u: User): ContactVisibility {
  const v = (u as unknown as { contactVisibility?: string }).contactVisibility;
  return v === "on_request" || v === "hidden" ? v : "public";
}

// City <select> driven by the chosen state, with a free-text fallback so a city
// that isn't in our dataset is never blocked. Remount (via `key`) to reset "other".
function CityField({
  state,
  city,
  onChange,
}: {
  state: string;
  city: string;
  onChange: (city: string) => void;
}) {
  const cities = citiesForState(state);
  const known = city !== "" && cities.includes(city);
  const [other, setOther] = useState<boolean>(city !== "" && !known);
  const selectValue = other ? OTHER_CITY : known ? city : "";

  return (
    <div>
      <Select
        label="City"
        placeholder={state ? "Select city" : "State first"}
        value={selectValue}
        disabled={!state}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER_CITY) {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(v);
          }
        }}
        options={[
          ...cities.map((c) => ({ value: c, label: c })),
          { value: OTHER_CITY, label: "Other city…" },
        ]}
        id="profile-city"
      />
      {other && (
        <Input
          placeholder="Enter city name"
          value={city}
          onChange={(e) => onChange(e.target.value)}
          id="profile-city-other"
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card card-flat" style={{ padding: 22 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const tr = useTr();
  const { user, loading } = useRequireAuth({ redirectTo: "/login?next=/profile" });
  const { addToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ContactVisibility>("public");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setCity(user.city || "");
    setState(user.state || "");
    setInterests(readInterests(user));
    setVisibility(readVisibility(user));
  }, [user]);

  useEffect(() => {
    let alive = true;
    getCategories()
      .then((c) => {
        if (alive) setCategories(c);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);


  function toggleInterest(slug: string) {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function save() {
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        interests,
        contactVisibility: visibility,
      });
      addToast(tr("profile.saved", "Profile updated"), "success");
    } catch (e) {
      addToast((e as Error).message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="container-bs counter-workspace-page" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <Loading label={tr("profile.loading", "Loading your profile…")} />
      </div>
    );
  }

  // Only top-level categories — the full ~280-category leaf list is unusable as
  // a chip picker. 24 broad areas is a real choice; sub-category precision isn't
  // needed for "what are you generally interested in."
  const topLevelCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="container-bs counter-workspace-page counter-profile-page" style={{ paddingTop: 28, paddingBottom: 64, maxWidth: 820 }}>
      <PanelHeader
        title={tr("profile.title", "My Profile")}
        subtitle={tr("profile.subtitle", "Your basic account details.")}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Section title={tr("profile.account", "Account")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <Input label={tr("profile.name", "Name")} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={tr("profile.email", "Email")} value={user.email || "—"} readOnly />
            <Input label={tr("profile.mobile", "Mobile")} value={user.mobile || "—"} readOnly />
            <Select
              label={tr("profile.state", "State")}
              placeholder="Select state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
              options={STATE_OPTIONS}
            />
            <CityField state={state} city={city} onChange={setCity} />
            <Select
              label={tr("profile.visibility", "Contact visibility")}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ContactVisibility)}
              options={[
                { value: "public", label: "Public" },
                { value: "on_request", label: "On request" },
                { value: "hidden", label: "Hidden" },
              ]}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="field-label">{tr("profile.interests", "Interests")}</label>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: -2, marginBottom: 10 }}>
              {tr("profile.interestsHint", "Pick a few broad areas you're interested in — we'll tailor your feed.")}
            </p>
            {topLevelCategories.length === 0 ? (
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>
                {tr("profile.loadingCats", "Loading categories…")}
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topLevelCategories.map((c) => {
                  const active = interests.includes(c.slug);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={active ? "chip chip-active" : "chip"}
                      aria-pressed={active}
                      onClick={() => toggleInterest(c.slug)}
                    >
                      {active && <Icon name="check" size={13} />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? tr("common.saving", "Saving…") : tr("profile.save", "Save changes")}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
