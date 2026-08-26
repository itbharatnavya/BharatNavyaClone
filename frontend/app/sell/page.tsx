"use client";

// /sell — create a listing (product or service). One identity: any signed-in
// user can post. Three steps: choose type → pick category → dynamic details.
// Auto-fill from photo (AI, with graceful fallback). Submits via createListing
// and routes to the new listing page.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useConfig } from "@/lib/config";
import { useToast } from "@/components/Toast";
import { getCategories, createListing } from "@/lib/api";
import type {
  Category,
  ListingType,
  Listing,
  ProductDetail,
  ServiceDetail,
  SellerLocation,
} from "@/lib/types";
import type { AiAutofillDraft } from "@/lib/api";

import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import Button from "@/components/Button";
import Stepper from "@/components/sell/Stepper";
import CategoryPicker from "@/components/sell/CategoryPicker";
import AutofillButton from "@/components/sell/AutofillButton";
import ProductFields from "@/components/sell/ProductFields";
import ServiceFields from "@/components/sell/ServiceFields";
import { Section, TagInput, MediaEditor } from "@/components/sell/editors";
import { STATE_OPTIONS, CityField } from "@/components/LocationPicker";
import {
  initialProduct,
  initialService,
  type ProductFormState,
  type ServiceFormState,
  type ProductCondition,
} from "@/components/sell/formTypes";

const STEPS = [
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "details", label: "Details" },
];

// Location picker sentinels for the "Available in" <select>.
const LOC_PAN = "__pan__";
const LOC_CITIES = "__cities__";

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth({ redirectTo: "/login?next=/sell" });
  const { featureFlags } = useConfig();
  const { addToast } = useToast();

  // ---- categories ----
  const [categories, setCategories] = useState<Category[]>([]);
  const [catError, setCatError] = useState<string | null>(null);
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e) =>
        setCatError(e instanceof Error ? e.message : "Failed to load categories")
      );
  }, []);

  // ---- flow state ----
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ListingType | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  // ---- common fields ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [media, setMedia] = useState<string[]>([""]);
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");

  // ---- seller branch locations (multi-location) ----
  const sellerLocations = useMemo<SellerLocation[]>(() => {
    const sp = user?.sellerProfile;
    if (!sp) return [];
    if (Array.isArray(sp.locations) && sp.locations.length > 0) return sp.locations;
    if (sp.location && sp.location.city) {
      return [
        {
          id: "loc_primary",
          label: "Head Office",
          city: sp.location.city,
          state: sp.location.state || "",
          pincode: sp.location.pincode,
          address: "",
        },
      ];
    }
    return [];
  }, [user]);

  // ---- "Available in" picker: PAN India | a branch id | "add specific cities" ----
  // Defaults to PAN India; overridden to the first branch once branches load.
  const [locChoice, setLocChoice] = useState<string>(LOC_PAN);
  const branchInited = useRef(false);
  // Multi-city coverage (used when locChoice === LOC_CITIES).
  const [serviceCities, setServiceCities] = useState<{ state: string; city: string }[]>([]);
  const [scState, setScState] = useState("");
  const [scCity, setScCity] = useState("");
  const [scKey, setScKey] = useState(0); // remounts the picker CityField after add

  // Preselect the first branch (also covers the single-branch case) and reflect its
  // city/state into the location fields so validation + display line up.
  useEffect(() => {
    if (!branchInited.current && sellerLocations.length > 0) {
      branchInited.current = true;
      const first = sellerLocations[0];
      setLocChoice(first.id);
      setCity(first.city || "");
      setState(first.state || "");
    }
  }, [sellerLocations]);

  // Change the "Available in" choice: a branch reflects its city/state; PAN India and
  // "specific cities" clear the single city/state (they don't use it directly).
  const onLocChoice = (v: string) => {
    setLocChoice(v);
    if (v === LOC_PAN || v === LOC_CITIES) return;
    const loc = sellerLocations.find((l) => l.id === v);
    if (loc) {
      setCity(loc.city || "");
      setState(loc.state || "");
    }
  };

  const addServiceCity = () => {
    if (!scState || !scCity.trim()) {
      addToast("Pick a state and city first.", "error");
      return;
    }
    const c = scCity.trim();
    const exists = serviceCities.some(
      (a) => a.state === scState && a.city.toLowerCase() === c.toLowerCase()
    );
    if (exists) {
      addToast("That city is already added.", "info");
      return;
    }
    setServiceCities((prev) => [...prev, { state: scState, city: c }]);
    setScState("");
    setScCity("");
    setScKey((k) => k + 1);
  };

  const removeServiceCity = (idx: number) =>
    setServiceCities((prev) => prev.filter((_, i) => i !== idx));

  // ---- type-specific fields ----
  const [product, setProduct] = useState<ProductFormState>(initialProduct);
  const [service, setService] = useState<ServiceFormState>(initialService);

  const [submitting, setSubmitting] = useState(false);

  const patchProduct = (patch: Partial<ProductFormState>) =>
    setProduct((p) => ({ ...p, ...patch }));
  const patchService = (patch: Partial<ServiceFormState>) =>
    setService((s) => ({ ...s, ...patch }));

  const chooseType = (t: ListingType) => {
    setType(t);
    setCategory(null);
    setStep(1);
  };

  // ---- AI auto-fill: merge the draft into the form ----
  const applyDraft = (draft: AiAutofillDraft) => {
    if (draft.title) setTitle(draft.title);
    if (draft.description) setDescription(draft.description);
    if (draft.keywords?.length)
      setKeywords((k) => Array.from(new Set([...k, ...draft.keywords!])));
    if (draft.specifications && type === "product") {
      patchProduct({
        specifications: { ...product.specifications, ...draft.specifications },
      });
    }
    if (draft.categorySlug) {
      const match = categories.find((c) => c.slug === draft.categorySlug);
      if (match) {
        setCategory(match);
        addToast(`Category set to “${match.name}” from AI.`, "info");
      }
    }
  };

  // ---- submit ----
  const validate = (): string | null => {
    if (!type) return "Choose product or service.";
    if (!category) return "Pick a category.";
    if (!title.trim()) return "Add a title.";
    if (!description.trim()) return "Add a description.";
    // Location: PAN India needs no city; specific-cities needs at least one; a branch
    // (or the derived single location) needs a city.
    if (locChoice === LOC_CITIES) {
      if (serviceCities.length === 0)
        return "Add at least one city, or choose PAN India.";
    } else if (locChoice !== LOC_PAN) {
      if (!city.trim()) return "Add your city.";
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      addToast(err, "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: Partial<Listing> = {
        type: type!,
        title: title.trim(),
        description: description.trim(),
        categoryId: category!.id,
        keywords,
        media: media
          .filter((u) => u.trim())
          .map((url) => ({ type: "image" as const, url: url.trim() })),
      };

      // ---- Location: PAN India | specific cities | a branch/derived location ----
      if (locChoice === LOC_PAN) {
        // Serves all of India — no locationId, no city; backend stamps location.panIndia.
        body.panIndia = true;
      } else if (locChoice === LOC_CITIES) {
        body.serviceCities = serviceCities;
        // First city seeds the primary location for display.
        const first = serviceCities[0];
        body.location = { city: first.city, state: first.state };
      } else {
        body.locationId = locChoice;
        body.location = { city: city.trim(), state: state.trim() };
      }

      if (type === "product") {
        const detail: ProductDetail & { condition?: ProductCondition } = {
          price: product.price ? Number(product.price) : null,
          currency: product.currency || "INR",
          priceTiers: product.priceTiers,
          unitOfMeasure: product.unitOfMeasure || undefined,
          moq: product.moq ? Number(product.moq) : null,
          specifications: product.specifications,
          certifications: [],
          variants: [],
          sampleAvailable: false,
          condition: product.condition,
        };
        body.product = detail;
      } else {
        const detail: ServiceDetail = {
          rateCard: service.rateCard,
          pricingModel: service.pricingModel,
          serviceArea: service.serviceArea,
          credentials: service.credentials,
          experienceYears: service.experienceYears
            ? Number(service.experienceYears)
            : undefined,
          availabilitySchedule: service.availabilitySchedule || undefined,
          portfolio: [],
          bookingType: "enquiry",
        };
        body.service = detail;
      }

      const created = await createListing(body);
      if (created.status === "active") {
        addToast("Listing verified automatically — it's live now.", "success");
      } else {
        addToast(
          "Listing submitted. It's being verified (AI first, then our team if needed) and will go live once approved.",
          "info"
        );
      }
      router.push(`/listing/${created.id}`);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to publish listing.", "error");
      setSubmitting(false);
    }
  };

  const showAutofill = type === "product" && featureFlags.aiAutofill !== false;

  const canGoDetails = !!category;

  // ---- gate render ----
  if (loading || !user) {
    return (
      <div className="container-bs section-pad">
        <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, width: "100%" }} />
      </div>
    );
  }

  return (
    <div className="container-bs section-pad-sm" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 8 }}>
        <span className="eyebrow">Create a listing</span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>
        Sell on BharatSource
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 24 }}>
        Reach buyers across India. Your seller profile is created automatically on
        your first listing.
      </p>

      <div style={{ marginBottom: 28 }}>
        <Stepper
          steps={STEPS}
          current={step}
          onStepClick={(i) => {
            if (i === 0) setStep(0);
            if (i === 1 && type) setStep(1);
            if (i === 2 && canGoDetails) setStep(2);
          }}
        />
      </div>

      {/* ---------- Step 1: type ---------- */}
      {step === 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {(
            [
              {
                t: "product" as const,
                icon: (
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5" />
                    <path d="M12 13v8" />
                  </svg>
                ),
                title: "Product",
                desc: "Goods you sell — with price, MOQ, specs and photos.",
              },
              {
                t: "service" as const,
                icon: (
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 3 3 6-6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" />
                  </svg>
                ),
                title: "Service",
                desc: "Skills you offer — with a rate-card, areas and credentials.",
              },
            ]
          ).map((opt) => {
            const active = type === opt.t;
            return (
              <button
                key={opt.t}
                type="button"
                onClick={() => chooseType(opt.t)}
                className="card"
                style={{
                  textAlign: "left",
                  padding: 22,
                  cursor: "pointer",
                  borderColor: active ? "var(--brand)" : "var(--border)",
                  outline: active ? "2px solid var(--brand)" : "none",
                }}
              >
                <div style={{ color: "var(--brand)", lineHeight: 0 }}>{opt.icon}</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginTop: 10,
                    color: "var(--ink)",
                  }}
                >
                  {opt.title}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- Step 2: category ---------- */}
      {step === 1 && type && (
        <div>
          {catError && (
            <p style={{ color: "var(--error)", marginBottom: 12 }}>{catError}</p>
          )}
          <CategoryPicker
            categories={categories}
            type={type}
            value={category?.id}
            onSelect={setCategory}
          />
          <div
            style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "space-between" }}
          >
            <Button variant="ghost" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button
              variant="brand"
              disabled={!category}
              onClick={() => setStep(2)}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Step 3: details ---------- */}
      {step === 2 && type && (
        <div>
          {showAutofill && (
            <AutofillButton hintContext={title} onDraft={applyDraft} />
          )}

          <Section title="Basics">
            <div style={{ display: "grid", gap: 16 }}>
              <Input
                label="Title"
                placeholder={
                  type === "product"
                    ? "e.g. Stainless Steel 304 Sheet — 2mm"
                    : "e.g. GST filing & bookkeeping for SMEs"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                label="Description"
                placeholder="Describe what you're offering, quality, terms…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 130 }}
              />
              <TagInput
                label="Keywords"
                hint="Help buyers find you. Press Enter to add each keyword."
                value={keywords}
                onChange={setKeywords}
                placeholder="e.g. wholesale, ss304, industrial"
              />
            </div>
          </Section>

          {type === "product" ? (
            <ProductFields value={product} onChange={patchProduct} />
          ) : (
            <ServiceFields value={service} onChange={patchService} />
          )}

          <Section
            title="Photos"
            desc="Add image URLs. Clear photos get far more responses."
          >
            <MediaEditor value={media} onChange={setMedia} />
          </Section>

          <Section title="Available in" desc="Where buyers can find this listing.">
            <div style={{ display: "grid", gap: 12 }}>
              <Select
                label="Available in"
                hint="Serve all of India, a specific branch, or a set of cities."
                value={locChoice}
                onChange={(e) => onLocChoice(e.target.value)}
                options={[
                  { value: LOC_PAN, label: "PAN India (all of India)" },
                  ...sellerLocations.map((l) => ({
                    value: l.id,
                    label: `${l.label} — ${l.city}${l.state ? ", " + l.state : ""}`,
                  })),
                  { value: LOC_CITIES, label: "Add specific cities…" },
                ]}
              />

              {locChoice === LOC_CITIES && (
                <div style={{ display: "grid", gap: 12 }}>
                  {serviceCities.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {serviceCities.map((a, i) => (
                        <span
                          key={`${a.state}-${a.city}-${i}`}
                          className="chip"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          {a.city}
                          {a.state ? `, ${a.state}` : ""}
                          <button
                            type="button"
                            aria-label={`Remove ${a.city}`}
                            onClick={() => removeServiceCity(i)}
                            style={{
                              display: "inline-flex",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--muted)",
                              padding: 0,
                              lineHeight: 0,
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M18 6L6 18" />
                              <path d="M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <Select
                      label="State"
                      placeholder="Select state"
                      value={scState}
                      onChange={(e) => {
                        setScState(e.target.value);
                        setScCity("");
                      }}
                      options={STATE_OPTIONS}
                      id="sc-state"
                    />
                    <CityField
                      key={`sc-city-${scKey}-${scState}`}
                      state={scState}
                      city={scCity}
                      onChange={setScCity}
                      idPrefix="sc"
                    />
                    <div>
                      <Button variant="secondary" onClick={addServiceCity}>
                        Add city
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <div
            style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "space-between" }}
          >
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Publishing…" : "Publish listing"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
