"use client";

// LocationsManager — seller "Business locations / branches" editor.
// Lists each branch as a card (label, city, state, pincode, address) with Edit /
// Remove, plus an "Add location" form. Changes persist immediately via
// updateSellerProfile({ locations }); the list is derived from
// sellerProfile.locations, falling back to a single branch built from the legacy
// sellerProfile.location so existing sellers always start with one.

import React, { useState } from "react";
import type { User, SellerLocation } from "@/lib/types";
import { updateSellerProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { statesList, citiesForState } from "@/lib/indiaGeo";

// Indian states + union territories (native <select> per design rules).
const STATE_OPTIONS = statesList().map((s) => ({ value: s, label: s }));

// Sentinel value for the City <select> that reveals a free-text "Other city" input,
// so a city that isn't in our dataset is never blocked.
const OTHER_CITY = "__other__";

/**
 * City <select> driven by the selected state, with a free-text fallback. Internal
 * "other" state is seeded from whether the current city is a known city for the
 * state; remount (via `key`) to reset it between forms.
 */
function CityField({
  state,
  city,
  onChange,
  idPrefix,
}: {
  state: string;
  city: string;
  onChange: (city: string) => void;
  idPrefix: string;
}) {
  const cities = citiesForState(state);
  const known = city !== "" && cities.includes(city);
  const [other, setOther] = useState<boolean>(city !== "" && !known);
  const selectValue = other ? OTHER_CITY : known ? city : "";

  return (
    <div>
      <Select
        label="City"
        placeholder={state ? "Select city" : "Select state first"}
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
          containerClassName="mt-2"
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

interface Draft {
  label: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
}

const emptyDraft: Draft = { label: "", city: "", state: "", pincode: "", address: "" };

function genId(): string {
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveInitial(user: User): SellerLocation[] {
  const sp = user.sellerProfile;
  if (!sp) return [];
  if (Array.isArray(sp.locations) && sp.locations.length > 0) return sp.locations;
  if (sp.location && sp.location.city) {
    return [
      {
        id: "loc_primary",
        label: "Head Office",
        city: sp.location.city,
        state: sp.location.state || "",
        pincode: sp.location.pincode || "",
        address: "",
      },
    ];
  }
  return [];
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function LocationsManager({ user }: { user: User }) {
  const { refresh } = useAuth();
  const { addToast } = useToast();

  const [locations, setLocations] = useState<SellerLocation[]>(() => deriveInitial(user));
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Draft>(emptyDraft);
  const [addForm, setAddForm] = useState<Draft>(emptyDraft);
  // Bumped after a successful add so the add-form CityField remounts (resets "other").
  const [addKey, setAddKey] = useState(0);

  async function persist(next: SellerLocation[]): Promise<boolean> {
    setBusy(true);
    try {
      const updated = await updateSellerProfile({ locations: next });
      const saved = updated.sellerProfile?.locations;
      setLocations(Array.isArray(saved) ? saved : next);
      await refresh();
      return true;
    } catch (e) {
      addToast((e as Error).message || "Could not save locations", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addLocation() {
    if (!addForm.city.trim()) {
      addToast("A city is required for a location.", "error");
      return;
    }
    const loc: SellerLocation = {
      id: genId(),
      label: addForm.label.trim() || "Branch",
      city: addForm.city.trim(),
      state: addForm.state.trim(),
      pincode: addForm.pincode.trim(),
      address: addForm.address.trim(),
    };
    const ok = await persist([...locations, loc]);
    if (ok) {
      setAddForm(emptyDraft);
      setAddKey((k) => k + 1);
      addToast("Location added.", "success");
    }
  }

  async function removeLocation(id: string) {
    const ok = await persist(locations.filter((l) => l.id !== id));
    if (ok) {
      if (editingId === id) setEditingId(null);
      addToast("Location removed.", "success");
    }
  }

  function startEdit(loc: SellerLocation) {
    setEditingId(loc.id);
    setEditForm({
      label: loc.label || "",
      city: loc.city || "",
      state: loc.state || "",
      pincode: loc.pincode || "",
      address: loc.address || "",
    });
  }

  async function saveEdit() {
    if (!editForm.city.trim()) {
      addToast("A city is required for a location.", "error");
      return;
    }
    const next = locations.map((l) =>
      l.id === editingId
        ? {
            ...l,
            label: editForm.label.trim() || "Branch",
            city: editForm.city.trim(),
            state: editForm.state.trim(),
            pincode: editForm.pincode.trim(),
            address: editForm.address.trim(),
          }
        : l
    );
    const ok = await persist(next);
    if (ok) {
      setEditingId(null);
      addToast("Location updated.", "success");
    }
  }

  const gridCols = "repeat(auto-fit, minmax(160px, 1fr))";

  function draftFields(
    draft: Draft,
    set: (patch: Partial<Draft>) => void,
    idPrefix: string,
    cityKey: string
  ) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}>
          <Input
            label="Label"
            placeholder="e.g. Head Office, Mumbai Branch"
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            id={`${idPrefix}-label`}
          />
          <Select
            label="State"
            placeholder="Select state"
            value={draft.state}
            // Changing state invalidates the city, so clear it.
            onChange={(e) => set({ state: e.target.value, city: "" })}
            options={STATE_OPTIONS}
            id={`${idPrefix}-state`}
          />
          <CityField
            key={cityKey}
            state={draft.state}
            city={draft.city}
            onChange={(city) => set({ city })}
            idPrefix={idPrefix}
          />
          <Input
            label="Pincode"
            placeholder="e.g. 411001"
            inputMode="numeric"
            value={draft.pincode}
            onChange={(e) => set({ pincode: e.target.value })}
            id={`${idPrefix}-pincode`}
          />
        </div>
        <Input
          label="Address (optional)"
          placeholder="Street / area / landmark"
          value={draft.address}
          onChange={(e) => set({ address: e.target.value })}
          id={`${idPrefix}-address`}
        />
      </div>
    );
  }

  return (
    <div>
      {locations.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          No branches yet. Add your first business location below — you can then
          assign each product to a branch when you list it.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {locations.map((loc) => {
            const isEditing = editingId === loc.id;
            return (
              <div
                key={loc.id}
                className="card card-flat"
                style={{ padding: 16, minWidth: 0 }}
              >
                {isEditing ? (
                  <div>
                    {draftFields(
                      editForm,
                      (patch) => setEditForm((d) => ({ ...d, ...patch })),
                      `edit-${loc.id}`,
                      `edit-city-${loc.id}`
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                      <Button variant="primary" onClick={saveEdit} disabled={busy}>
                        {busy ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, minWidth: 0 }}>
                      <span style={{ color: "var(--brand)", lineHeight: 0, flexShrink: 0 }}>
                        <PinIcon />
                      </span>
                      <span
                        className="badge"
                        style={{ background: "var(--brand-tint)", color: "var(--brand)", minWidth: 0 }}
                      >
                        {loc.label || "Branch"}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", wordBreak: "break-word" }}>
                      {loc.city}
                      {loc.state ? `, ${loc.state}` : ""}
                    </div>
                    {loc.pincode && (
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                        PIN {loc.pincode}
                      </div>
                    )}
                    {loc.address && (
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, wordBreak: "break-word" }}>
                        {loc.address}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(loc)}
                        disabled={busy}
                      >
                        <EditIcon /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeLocation(loc.id)}
                        disabled={busy}
                      >
                        <TrashIcon /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add location */}
      <div className="card card-flat" style={{ padding: 16, minWidth: 0 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
          Add a location
        </h3>
        {draftFields(
          addForm,
          (patch) => setAddForm((d) => ({ ...d, ...patch })),
          "add",
          `add-city-${addKey}`
        )}
        <div style={{ marginTop: 14 }}>
          <Button variant="primary" onClick={addLocation} disabled={busy}>
            {busy ? "Saving…" : "Add location"}
          </Button>
        </div>
      </div>
    </div>
  );
}
