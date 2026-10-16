"use client";

import React, { useState } from "react";
import type { User, SellerProfile } from "@/lib/types";
import {
  becomeSeller,
  updateSellerProfile,
  requestVerification,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Select from "@/components/Select";
import LocationsManager from "@/components/seller/LocationsManager";
import { statesList, citiesForState } from "@/lib/indiaGeo";
import { PanelHeader, useTr } from "./shared";
import {
  validateSellerProfile,
  validateVerification,
  type Errors,
} from "./validation";

interface Props {
  user: User;
}

const STATE_OPTIONS = statesList().map((s) => ({ value: s, label: s }));
const OTHER_CITY = "__other__";

// City <select> driven by the chosen state, with a free-text fallback so a city that
// isn't in our dataset is never blocked. Remount (via `key`) to reset "other".
function CityField({
  state,
  city,
  onChange,
  idPrefix,
  label = "City",
}: {
  state: string;
  city: string;
  onChange: (city: string) => void;
  idPrefix: string;
  label?: string;
}) {
  const cities = citiesForState(state);
  const known = city !== "" && cities.includes(city);
  const [other, setOther] = useState<boolean>(city !== "" && !known);
  const selectValue = other ? OTHER_CITY : known ? city : "";

  return (
    <div>
      <Select
        label={label}
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
        id={`${idPrefix}-city`}
      />
      {other && (
        <Input
          placeholder="Enter city name"
          value={city}
          onChange={(e) => onChange(e.target.value)}
          id={`${idPrefix}-city-other`}
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

export default function ProfileTab({ user }: Props) {
  const tr = useTr();
  const { addToast } = useToast();
  const { refresh } = useAuth();

  // seller fields
  const sp = user.sellerProfile;
  const [companyName, setCompanyName] = useState(sp?.companyName || "");
  const [about, setAbout] = useState(sp?.about || "");
  const [gstNumber, setGstNumber] = useState(sp?.gstNumber || "");
  const [yearEstablished, setYearEstablished] = useState(
    sp?.yearEstablished != null ? String(sp.yearEstablished) : ""
  );
  const [website, setWebsite] = useState(sp?.website || "");
  const [employeeCount, setEmployeeCount] = useState(sp?.employeeCount || "");
  const [contactMobile, setContactMobile] = useState(sp?.contactMobile || "");
  const [contactEmail, setContactEmail] = useState(sp?.contactEmail || "");
  const [savingSeller, setSavingSeller] = useState(false);
  const [sellerTried, setSellerTried] = useState(false);

  const sellerErrors: Errors = sellerTried
    ? validateSellerProfile({
        companyName,
        gstNumber,
        yearEstablished,
        website,
        employeeCount,
        contactMobile,
        contactEmail,
        about,
      })
    : {};

  // Get verified — GST/PAN submission for the trust badge + seal.
  const [vGst, setVGst] = useState(sp?.gstNumber || "");
  const [vPan, setVPan] = useState(
    (sp as unknown as { panNumber?: string })?.panNumber || ""
  );
  const [vNote, setVNote] = useState("");
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vSubmitted, setVSubmitted] = useState(false);
  const [vTried, setVTried] = useState(false);

  const vErrors: Errors = vTried
    ? validateVerification({ gst: vGst, pan: vPan, note: vNote })
    : {};

  async function submitVerification() {
    setVTried(true);
    const errs = validateVerification({ gst: vGst, pan: vPan, note: vNote });
    if (Object.keys(errs).length > 0) {
      addToast(
        tr("dashboard.profile.fixFields", "Please fix the highlighted fields."),
        "error"
      );
      return;
    }
    setVSubmitting(true);
    try {
      await requestVerification({
        gstNumber: vGst.trim() || undefined,
        panNumber: vPan.trim() || undefined,
        note: vNote.trim() || undefined,
      });
      setVSubmitted(true);
      await refresh();
      addToast(
        tr("dashboard.profile.verifySubmitted", "Submitted for review"),
        "success"
      );
    } catch (e) {
      addToast((e as Error).message || "Could not submit", "error");
    } finally {
      setVSubmitting(false);
    }
  }

  // Service areas — the cities/states this seller operates in (multi-add → chips).
  const [serviceAreas, setServiceAreas] = useState<{ state: string; city: string }[]>(
    Array.isArray(sp?.serviceAreas) ? sp!.serviceAreas : []
  );
  const [saState, setSaState] = useState("");
  const [saCity, setSaCity] = useState("");
  const [saKey, setSaKey] = useState(0); // remounts the picker CityField after add
  const [savingAreas, setSavingAreas] = useState(false);

  async function persistServiceAreas(next: { state: string; city: string }[]) {
    setSavingAreas(true);
    try {
      await updateSellerProfile({ serviceAreas: next });
      setServiceAreas(next);
      await refresh();
    } catch (e) {
      addToast((e as Error).message || "Could not save service areas", "error");
    } finally {
      setSavingAreas(false);
    }
  }

  async function addServiceArea() {
    if (!saState || !saCity.trim()) {
      addToast(tr("dashboard.profile.areaNeedsCity", "Pick a state and city first."), "error");
      return;
    }
    const city = saCity.trim();
    if (city.length > 60 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(city)) {
      addToast(
        tr("dashboard.profile.areaBadCity", "Enter a valid city name."),
        "error"
      );
      return;
    }
    const exists = serviceAreas.some(
      (a) => a.state === saState && a.city.toLowerCase() === city.toLowerCase()
    );
    if (exists) {
      addToast(tr("dashboard.profile.areaDup", "That city is already added."), "info");
      return;
    }
    await persistServiceAreas([...serviceAreas, { state: saState, city }]);
    setSaState("");
    setSaCity("");
    setSaKey((k) => k + 1);
  }

  function removeServiceArea(idx: number) {
    persistServiceAreas(serviceAreas.filter((_, i) => i !== idx));
  }

  async function saveSeller() {
    setSellerTried(true);
    const errs = validateSellerProfile({
      companyName,
      gstNumber,
      yearEstablished,
      website,
      employeeCount,
      contactMobile,
      contactEmail,
      about,
    });
    if (Object.keys(errs).length > 0) {
      addToast(
        tr("dashboard.profile.fixFields", "Please fix the highlighted fields."),
        "error"
      );
      return;
    }
    setSavingSeller(true);
    try {
      const body: Partial<SellerProfile> = {
        companyName: companyName.trim(),
        about: about.trim() || undefined,
        gstNumber: gstNumber.trim() || null,
        yearEstablished: yearEstablished ? Number(yearEstablished) : null,
        website: website.trim() || null,
        employeeCount: employeeCount.trim() || undefined,
        contactMobile: contactMobile.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
      };
      if (sp) {
        await updateSellerProfile(body);
        addToast(tr("dashboard.profile.sellerSaved", "Seller profile updated"), "success");
      } else {
        await becomeSeller(body);
        addToast(tr("dashboard.profile.becameSeller", "Seller profile created"), "success");
      }
      await refresh();
    } catch (e) {
      addToast((e as Error).message || "Update failed", "error");
    } finally {
      setSavingSeller(false);
    }
  }

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.profile.title", "Profile")}
        subtitle={tr("dashboard.profile.subtitle", "Manage your business/company details, verification and locations.")}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Seller profile */}
        <Section
          title={sp ? tr("dashboard.profile.sellerEdit", "Seller profile") : tr("dashboard.profile.becomeSeller", "Become a seller")}
          subtitle={
            sp
              ? tr("dashboard.profile.sellerEditHint", "Your public business details.")
              : tr("dashboard.profile.becomeSellerHint", "Add your business details to start listing and getting leads.")
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <Input
              label={tr("dashboard.profile.companyName", "Company name")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              error={sellerErrors.companyName}
            />
            <Input
              label={tr("dashboard.profile.gst", "GST number")}
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              error={sellerErrors.gstNumber}
              placeholder="22AAAAA0000A1Z5"
            />
            <Input
              label={tr("dashboard.profile.year", "Year established")}
              type="number"
              value={yearEstablished}
              onChange={(e) => setYearEstablished(e.target.value)}
              error={sellerErrors.yearEstablished}
            />
            <Input
              label={tr("dashboard.profile.employees", "Employee count")}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              error={sellerErrors.employeeCount}
              placeholder="e.g. 11-50"
            />
            <Input
              label={tr("dashboard.profile.website", "Website")}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              error={sellerErrors.website}
              placeholder="https://…"
            />
            <Input
              label={tr("dashboard.profile.contactMobile", "Contact mobile")}
              value={contactMobile}
              onChange={(e) => setContactMobile(e.target.value)}
              error={sellerErrors.contactMobile}
            />
            <Input
              label={tr("dashboard.profile.contactEmail", "Contact email")}
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              error={sellerErrors.contactEmail}
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <Textarea
              label={tr("dashboard.profile.about", "About")}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              error={sellerErrors.about}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={saveSeller} disabled={savingSeller}>
              {savingSeller
                ? tr("common.saving", "Saving…")
                : sp
                  ? tr("dashboard.profile.saveSeller", "Save seller profile")
                  : tr("dashboard.profile.createSeller", "Create seller profile")}
            </Button>
          </div>
        </Section>

        {/* Get verified — GST/PAN submission → admin approves → trust badge + seal */}
        {sp && (
          <Section
            title={tr("dashboard.profile.getVerified", "Get verified")}
            subtitle={tr(
              "dashboard.profile.getVerifiedHint",
              "Submit your GST / PAN. Once an admin approves it, your profile earns the verified badge and trust seal."
            )}
          >
            {sp.isVerified ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-subtle)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    color: "var(--success)",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <div>
                  <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                    {tr("dashboard.profile.verified", "Your business is verified")}
                  </div>
                  <div style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 2 }}>
                    {tr(
                      "dashboard.profile.verifiedHint",
                      "The verified badge and trust seal are live on your public profile."
                    )}
                  </div>
                </div>
              </div>
            ) : vSubmitted ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-subtle)",
                }}
              >
                <span style={{ display: "inline-flex", color: "var(--warn)", flexShrink: 0 }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--ink)" }}>
                  {tr(
                    "dashboard.profile.verifyPending",
                    "Submitted for review. An admin will verify your business shortly."
                  )}
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                  }}
                >
                  <Input
                    label={tr("dashboard.profile.gst", "GST number")}
                    value={vGst}
                    onChange={(e) => setVGst(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    error={vErrors.vGst}
                  />
                  <Input
                    label={tr("dashboard.profile.pan", "PAN number")}
                    value={vPan}
                    onChange={(e) => setVPan(e.target.value)}
                    placeholder="AAAAA0000A"
                    error={vErrors.vPan}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <Textarea
                    label={tr("dashboard.profile.verifyNote", "Note (optional)")}
                    value={vNote}
                    onChange={(e) => setVNote(e.target.value)}
                    rows={3}
                    error={vErrors.vNote}
                    placeholder={tr(
                      "dashboard.profile.verifyNotePlaceholder",
                      "Anything the reviewer should know."
                    )}
                  />
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button variant="primary" onClick={submitVerification} disabled={vSubmitting}>
                    {vSubmitting
                      ? tr("common.saving", "Submitting…")
                      : tr("dashboard.profile.submitVerification", "Submit for verification")}
                  </Button>
                </div>
              </>
            )}
          </Section>
        )}

        {/* Business locations / branches — only for existing sellers */}
        {sp && (
          <Section
            title={tr("dashboard.profile.locations", "Business locations / branches")}
            subtitle={tr(
              "dashboard.profile.locationsHint",
              "Add each branch you operate from. You can assign every product to a branch when you list it."
            )}
          >
            <LocationsManager user={user} />
          </Section>
        )}

        {/* Service areas — the cities/states this seller operates in (multi-add). */}
        {sp && (
          <Section
            title={tr("dashboard.profile.serviceAreas", "Service areas / cities you operate in")}
            subtitle={tr(
              "dashboard.profile.serviceAreasHint",
              "Add every city you serve. Pick a state and city, then Add — each appears as a removable chip."
            )}
          >
            {serviceAreas.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {serviceAreas.map((a, i) => (
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
                      onClick={() => removeServiceArea(i)}
                      disabled={savingAreas}
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
                label={tr("dashboard.profile.state", "State")}
                placeholder="Select state"
                value={saState}
                onChange={(e) => {
                  setSaState(e.target.value);
                  setSaCity("");
                }}
                options={STATE_OPTIONS}
                id="sa-state"
              />
              <CityField
                key={`sa-city-${saKey}-${saState}`}
                state={saState}
                city={saCity}
                onChange={setSaCity}
                idPrefix="sa"
              />
              <div>
                <Button variant="secondary" onClick={addServiceArea} disabled={savingAreas}>
                  {savingAreas
                    ? tr("common.saving", "Saving…")
                    : tr("dashboard.profile.addArea", "Add area")}
                </Button>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
