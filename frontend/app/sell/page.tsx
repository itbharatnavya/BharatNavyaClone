"use client";

// /sell — create a listing (product or service). One identity: any signed-in
// user can post. Three steps: choose type → pick category → dynamic details.
// Auto-fill from photo (AI, with graceful fallback). Submits via createListing
// and routes to the new listing page.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { getCategories, createListing, becomeSeller } from "@/lib/api";
import { tokenize } from "@/lib/categorySuggest";
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
import CategoryPicker from "@/components/sell/CategoryPicker";
import ProductFields from "@/components/sell/ProductFields";
import ServiceFields from "@/components/sell/ServiceFields";
import { Section, MoreOptions, TagInput } from "@/components/sell/editors";
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
  { key: "type", label: "What" },
  { key: "category", label: "Category" },
  { key: "details", label: "Details" },
];

const titleCase = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

function CheckMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

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
  // What the seller typed on the first step, used to suggest a category and pre-fill the title.
  const [hint, setHint] = useState("");
  // Brand-new accounts have no business profile yet, so we ask for the business name here.
  const [companyName, setCompanyName] = useState("");
  const [created, setCreated] = useState<Listing | null>(null);
  const { refresh } = useAuth();

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
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const goStep = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const needsBusiness = !user?.sellerProfile;

  const resetForAnother = () => {
    setCreated(null);
    setType(null);
    setCategory(null);
    setHint("");
    setTitle("");
    setDescription("");
    setKeywords([]);
    setMedia([]);
    setProduct(initialProduct);
    setService(initialService);
    setTriedCategory(false);
    setTriedDetails(false);
    setStep(0);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  // ---- validation ----
  // Full field-level check for the details step. Recomputed each render so inline
  // messages clear the moment a field is corrected (once `triedDetails` is set).
  const buildDetailErrors = (): Errors =>
    mergeErrors(
      needsBusiness && companyName.trim().length < 2
        ? { companyName: "Add your business name (at least 2 letters)." }
        : {},
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
      if (needsBusiness) {
        await becomeSeller({
          companyName: companyName.trim(),
          city: user?.city || undefined,
          state: user?.state || undefined,
        } as Parameters<typeof becomeSeller>[0]);
        await refresh();
      }
      // No search words added? Use the meaningful words from the title.
      const autoKeywords = keywords.length
        ? keywords
        : Array.from(new Set(tokenize(title))).filter((w) => w.length > 2).slice(0, 8);
      const body: Partial<Listing> = {
        type: type!,
        title: title.trim(),
        description: description.trim(),
        categoryId: category!.id,
        keywords: autoKeywords,
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

      const made = await createListing(body);
      setCreated(made);
      setSubmitting(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to publish listing.", "error");
      setSubmitting(false);
    }
  };

  const canGoDetails = !!category;

  // ---- gate render ----
  if (loading || !user) {
    return (
      <div className="sl-page">
        <div className="skeleton" style={{ height: 32, width: 260, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 220, width: "100%" }} />
      </div>
    );
  }

  const stepTitles = [
    { h: "What would you like to list?", p: "It takes about 3 minutes. You can change anything later." },
    { h: "Where does it belong?", p: "Pick the category buyers will look in." },
    { h: type === "service" ? "Tell buyers about your service" : "Tell buyers about your product", p: "Add a photo and a few details. A name and a short description are all you need." },
  ];

  // ---- published: confirmation with next steps ----
  if (created) {
    const live = created.status === "active";
    const shareText = `${created.title} on Bharat Navya`;
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/listing/${created.id}` : `/listing/${created.id}`;
    return (
      <div className="sl-page">
        <div className="sl-done">
          <span className="sl-done-mark"><CheckMark size={30} /></span>
          <h1>{live ? "Your listing is live" : "Your listing is submitted"}</h1>
          <p>
            {live
              ? "Buyers can find it now. Enquiries will reach you in your dashboard."
              : "We check every new business and listing before buyers see it, usually within a day. You will see it switch to live in your dashboard."}
          </p>
          <div className="sl-done-card">
            {created.media?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={created.media[0].url} alt="" />
            ) : (
              <span className="sl-done-initial">{created.title.charAt(0).toUpperCase()}</span>
            )}
            <span>
              <strong>{created.title}</strong>
              <small>{live ? "Live" : "Waiting for approval"}</small>
            </span>
          </div>
          <div className="sl-done-actions">
            <Link className="btn btn-primary" href={`/listing/${created.id}`}>View your listing</Link>
            <button type="button" className="btn btn-secondary" onClick={resetForAnother}>Add another listing</button>
          </div>
          <div className="sl-done-next">
            <h2>What to do next</h2>
            <ul>
              {live ? (
                <li>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">Share it on WhatsApp</a>
                  <span>Tell your regular customers it is here.</span>
                </li>
              ) : (
                <li>
                  <Link href="/dashboard?tab=listings">Watch its status</Link>
                  <span>You will see it switch to live here once it is approved. Then you can share it.</span>
                </li>
              )}
              <li>
                <Link href="/dashboard?tab=profile">Complete your business profile</Link>
                <span>A full profile and verified badge build trust with buyers.</span>
              </li>
              <li>
                <Link href="/dashboard?tab=listings">See all your listings</Link>
                <span>Edit, pause or add photos any time.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sl-page">
      <header className="sl-head">
        <span className="sl-eyebrow">List your business</span>
        <h1>{stepTitles[step].h}</h1>
        <p>{stepTitles[step].p}</p>
      </header>

      <ol className="sl-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((st, i) => {
          const done = i < step;
          const reachable = i <= step;
          return (
            <li key={st.key} className={`${i === step ? "is-active" : ""}${done ? " is-done" : ""}`}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={i === step ? "step" : undefined}
                onClick={() => {
                  if (i === 0) goStep(0);
                  if (i === 1 && type) goStep(1);
                  if (i === 2 && canGoDetails) goStep(2);
                }}
              >
                <span>{done ? <CheckMark size={14} /> : i + 1}</span>
                {st.label}
              </button>
            </li>
          );
        })}
      </ol>

      {/* ---------- Step 1: what ---------- */}
      {step === 0 && (
        <div className="sl-body sl-panel">
          <div className="sl-field">
            <label className="sl-label" htmlFor="sl-hint">What are you selling or offering?</label>
            <input
              id="sl-hint"
              className="sl-input"
              placeholder="e.g. Coconut water, 200 ml bottles"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={80}
              autoComplete="off"
            />
            <p className="sl-note">A few words is fine. We use it to suggest the right category for you.</p>
          </div>

          <p className="sl-label">It is a…</p>
          <div className="sl-choices">
            <button type="button" className="sl-choice" onClick={() => chooseType("product")}>
              <span className="sl-choice-icon" aria-hidden>
                <svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5" /><path d="M12 13v8" /></svg>
              </span>
              <strong>Product</strong>
              <span>Something you make or sell, like tea, cement, cloth or bottled water.</span>
              <em>Choose product</em>
            </button>
            <button type="button" className="sl-choice" onClick={() => chooseType("service")}>
              <span className="sl-choice-icon" aria-hidden>
                <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 3 3 6-6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" /></svg>
              </span>
              <strong>Service</strong>
              <span>Work you do for others, like accounting, repairs, design or transport.</span>
              <em>Choose service</em>
            </button>
          </div>
        </div>
      )}

      {/* ---------- Step 2: category ---------- */}
      {step === 1 && type && (
        <div className="sl-body sl-panel">
          {catError && <p className="sl-error">{catError}</p>}
          <CategoryPicker
            categories={categories}
            type={type}
            hint={hint}
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
          <div className="sl-actions">
            <Button variant="ghost" onClick={() => goStep(0)}>← Back</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!category) {
                  setTriedCategory(true);
                  return;
                }
                if (!title.trim() && hint.trim()) setTitle(titleCase(hint));
                goStep(2);
              }}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Step 3: details ---------- */}
      {step === 2 && type && (
        <div className="sl-body">
          {category && (
            <p className="sl-pill">
              <span>{type === "service" ? "Service" : "Product"}</span> in {category.name}
              <button type="button" onClick={() => goStep(1)}>Change</button>
            </p>
          )}

          {needsBusiness && (
            <Section title="Your business" desc="Buyers see this name on your listing. You can add the rest of your profile later.">
              <Input
                label="Business name"
                placeholder="e.g. Nair Coconut Traders"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={detailErrors.companyName}
                maxLength={80}
              />
            </Section>
          )}

          <Section
            title="Photos"
            desc="Start with a clear photo taken in daylight. Listings with a photo are approved faster and get far more enquiries."
          >
            <MediaUpload
              value={media}
              onChange={setMedia}
              max={LIMITS.mediaMax}
              error={detailErrors.media}
            />
          </Section>

          <Section title={type === "service" ? "About your service" : "About your product"}>
            <div className="sl-stack">
              <Input
                label={type === "service" ? "Name of your service" : "Product name"}
                placeholder={
                  type === "product"
                    ? "e.g. Tender Coconut Water, 200 ml bottle"
                    : "e.g. GST filing and bookkeeping for small businesses"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={LIMITS.titleMax + 20}
                error={detailErrors.title}
                hint={!detailErrors.title ? "Say what it is in plain words, with size or type." : undefined}
              />
              <Textarea
                label="Describe it"
                placeholder={
                  type === "product"
                    ? "What it is, how it is packed, how fast you can deliver, anything that makes it special."
                    : "What you do, who it is for, how you work and how soon you can start."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 120 }}
                maxLength={LIMITS.descMax + 100}
                error={detailErrors.description}
                hint={
                  !detailErrors.description
                    ? description.trim().length >= LIMITS.descMin
                      ? "Looks good."
                      : `A few sentences help buyers trust you (${Math.max(0, LIMITS.descMin - description.trim().length)} more characters to go).`
                    : undefined
                }
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

          <Section title="Where can you supply?" desc="Buyers in these places will see your listing first.">
            <div className="sl-stack">
              <Select
                label="Available in"
                value={locChoice}
                onChange={(e) => onLocChoice(e.target.value)}
                error={detailErrors.location}
                options={[
                  { value: LOC_PAN, label: "All over India" },
                  ...sellerLocations.map((l) => ({
                    value: l.id,
                    label: `${l.label}, ${l.city}${l.state ? ", " + l.state : ""}`,
                  })),
                  { value: LOC_CITIES, label: "Only some cities…" },
                ]}
              />

              {locChoice === LOC_CITIES && (
                <div className="sl-stack">
                  {serviceCities.length > 0 && (
                    <div className="sl-chips">
                      {serviceCities.map((a, i) => (
                        <span key={`${a.state}-${a.city}-${i}`} className="chip">
                          {a.city}
                          {a.state ? `, ${a.state}` : ""}
                          <button type="button" aria-label={`Remove ${a.city}`} onClick={() => removeServiceCity(i)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M18 6L6 18" />
                              <path d="M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="sl-grid3 is-end">
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
                    <Button variant="secondary" onClick={addServiceCity}>Add city</Button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <MoreOptions title="Help buyers find it (optional)" hint="Search words. We add some from your title if you skip this.">
            <TagInput
              label="Search words"
              hint="Words buyers might type. Press Enter after each one."
              error={detailErrors.keywords}
              value={keywords}
              onChange={setKeywords}
              placeholder="e.g. tender coconut, packaged drink, healthy"
            />
          </MoreOptions>

          {triedDetails && Object.keys(detailErrors).length > 0 && (
            <p className="sl-error" role="alert">
              {Object.keys(detailErrors).length === 1
                ? "One thing needs your attention before you can publish."
                : `${Object.keys(detailErrors).length} things need your attention before you can publish.`}
            </p>
          )}

          <div className="sl-actions">
            <Button variant="ghost" onClick={() => goStep(1)}>← Back</Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Publishing…" : "Publish listing"}
            </Button>
          </div>
          <p className="sl-note sl-foot">You can edit or remove it any time from your dashboard.</p>
        </div>
      )}
    </div>
  );
}
