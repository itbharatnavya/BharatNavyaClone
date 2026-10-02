"use client";

// /sell — create a listing (product or service). One identity: any signed-in
// user can post. Three steps: choose type → pick category → dynamic details.
// Auto-fill from photo (AI, with graceful fallback). Submits via createListing
// and routes to the new listing page.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
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

import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import Button from "@/components/Button";
import Stepper from "@/components/sell/Stepper";
import CategoryPicker from "@/components/sell/CategoryPicker";
import ProductFields from "@/components/sell/ProductFields";
import ServiceFields from "@/components/sell/ServiceFields";
import { Section, TagInput } from "@/components/sell/editors";
import MediaUpload from "@/components/sell/MediaUpload";
import { STATE_OPTIONS, CityField } from "@/components/LocationPicker";
import {
  initialProduct,
  initialService,
  type ProductFormState,
  type ServiceFormState,
  type ProductCondition,
} from "@/components/sell/formTypes";
import {
  LIMITS,
  mergeErrors,
  validateBasics,
  validateCategory,
  validateLocation,
  validateMedia,
  validateProduct,
  validateService,
  type Errors,
} from "@/components/sell/validation";

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
  const [media, setMedia] = useState<string[]>([]);
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");

  // "Other" (custom) unit-of-measure mode — lifted out of ProductFields so submit
  // validation can require a non-empty custom unit once it's chosen.
  const [unitOther, setUnitOther] = useState(false);

  // Inline validation: errors only surface once the seller has tried to advance /
  // publish (`triedDetails`), then update live as fields are fixed. Step 2 has its
  // own flag so the category prompt doesn't show before the first Continue tap.
  const [triedCategory, setTriedCategory] = useState(false);
  const [triedDetails, setTriedDetails] = useState(false);

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

  // ---- validation ----
  // Full field-level check for the details step. Recomputed each render so inline
  // messages clear the moment a field is corrected (once `triedDetails` is set).
  const buildDetailErrors = (): Errors =>
    mergeErrors(
      validateBasics({ title, description, keywords }),
      validateMedia(media),
      validateLocation({
        locChoice,
        isPan: locChoice === LOC_PAN,
        isCities: locChoice === LOC_CITIES,
        city,
        serviceCitiesCount: serviceCities.length,
      }),
      type === "product"
        ? validateProduct(product, unitOther ? "other" : "preset")
        : type === "service"
        ? validateService(service)
        : {}
    );

  const detailErrors: Errors = triedDetails ? buildDetailErrors() : {};

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector(".field-error");
      if (el)
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const submit = async () => {
    setTriedDetails(true);
    const errs = buildDetailErrors();
    if (Object.keys(errs).length > 0) {
      addToast("Please fix the highlighted fields.", "error");
      scrollToFirstError();
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

  const canGoDetails = !!category;

  // ---- gate render ----
  if (loading || !user) {
    return (
      <div className="container-bs section-pad counter-workspace-page counter-sell-page">
        <div className="skeleton" style={{ height: 32, width: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200, width: "100%" }} />
      </div>
    );
  }

  return (
    <div className="container-bs section-pad-sm counter-workspace-page counter-sell-page" style={{ maxWidth: 960 }}>
      <header className="counter-workspace-intro">
      <div style={{ marginBottom: 8 }}>
        <span className="counter-workspace-label">Directory workspace</span>
      </div>
      <h1 style={{ fontSize: "var(--fs-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>
        Create a service or product listing
      </h1>
      <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 24 }}>
        Show what your company offers, where it operates, and the evidence people
        need before they make contact.
      </p>
      </header>

      <div className="counter-listing-stepper" style={{ marginBottom: 28 }}>
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
        <div className="counter-listing-type-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {(
            [
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
                desc: "Present capabilities, service areas, credentials and working terms.",
              },
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
                desc: "Keep the existing goods flow for price, MOQ, specifications and photos.",
              },
            ]
          ).map((opt) => {
            const active = type === opt.t;
            return (
              <button
                key={opt.t}
                type="button"
                onClick={() => chooseType(opt.t)}
                className={`card counter-listing-type is-${opt.t} ${active ? "is-active" : ""}`}
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
                    fontSize: "var(--fs-lg)",
                    fontWeight: 600,
                    marginTop: 10,
                    color: "var(--ink)",
                  }}
                >
                  {opt.title}
                </div>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 4 }}>
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
            onSelect={(c) => {
              setCategory(c);
              setTriedCategory(false);
            }}
          />
          {triedCategory && validateCategory(category?.id).category && (
            <p className="field-error" style={{ marginTop: 12 }}>
              {validateCategory(category?.id).category}
            </p>
          )}
          <div
            style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "space-between" }}
          >
            <Button variant="ghost" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                if (!category) {
                  setTriedCategory(true);
                  return;
                }
                setStep(2);
              }}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Step 3: details ---------- */}
      {step === 2 && type && (
        <div>
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
                maxLength={LIMITS.titleMax + 20}
                error={detailErrors.title}
                hint={
                  !detailErrors.title
                    ? `${title.trim().length}/${LIMITS.titleMax}`
                    : undefined
                }
              />
              <Textarea
                label="Description"
                placeholder="Describe what you're offering, quality, terms…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 130 }}
                maxLength={LIMITS.descMax + 100}
                error={detailErrors.description}
                hint={
                  !detailErrors.description
                    ? `At least ${LIMITS.descMin} characters — ${description.trim().length} so far.`
                    : undefined
                }
              />
              <TagInput
                label="Keywords"
                hint="Help buyers find you. Press Enter to add each keyword."
                error={detailErrors.keywords}
                value={keywords}
                onChange={setKeywords}
                placeholder="e.g. wholesale, ss304, industrial"
              />
            </div>
          </Section>

          {type === "product" ? (
            <ProductFields
              value={product}
              onChange={patchProduct}
              errors={detailErrors}
              unitOther={unitOther}
              onUnitOtherChange={setUnitOther}
            />
          ) : (
            <ServiceFields
              value={service}
              onChange={patchService}
              errors={detailErrors}
            />
          )}

          <Section
            title="Photos"
            desc="Upload clear photos from your phone or computer — listings with photos get far more responses."
          >
            <MediaUpload
              value={media}
              onChange={setMedia}
              max={LIMITS.mediaMax}
              error={detailErrors.media}
            />
          </Section>

          <Section title="Available in" desc="Where buyers can find this listing.">
            <div style={{ display: "grid", gap: 12 }}>
              <Select
                label="Available in"
                hint="Serve all of India, a specific branch, or a set of cities."
                value={locChoice}
                onChange={(e) => onLocChoice(e.target.value)}
                error={detailErrors.location}
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

          {triedDetails && Object.keys(detailErrors).length > 0 && (
            <p
              className="field-error"
              style={{ marginTop: 16, textAlign: "right" }}
            >
              {Object.keys(detailErrors).length} field
              {Object.keys(detailErrors).length > 1 ? "s need" : " needs"} attention
              before you can publish.
            </p>
          )}

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
