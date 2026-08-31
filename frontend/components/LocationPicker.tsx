"use client";

// Shared State -> City picker: a native <select> of real Indian states/UTs, plus a
// dependent city <select> with a free-text "Other city…" fallback so a city outside
// the dataset is never blocked. Originally built for /sell's location fields; also
// used by registration (/register, ContactAuthModal) so City/State can't be filled
// with junk text — matches the app's "prefer native <select>" design rule.

import React, { useState } from "react";
import Select from "@/components/Select";
import Input from "@/components/Input";
import { statesList, citiesForState } from "@/lib/indiaGeo";

export const STATE_OPTIONS = statesList().map((s) => ({ value: s, label: s }));

const OTHER_CITY = "__other__";

export interface CityFieldProps {
  state: string;
  city: string;
  onChange: (city: string) => void;
  idPrefix: string;
  label?: string;
}

// Remount (via a `key` that includes `state`) to reset the "other city" fallback
// when the caller resets city on state change.
export function CityField({ state, city, onChange, idPrefix, label = "City" }: CityFieldProps) {
  const cities = citiesForState(state);
  const known = city !== "" && cities.includes(city);
  const [other, setOther] = useState<boolean>(city !== "" && !known);
  const selectValue = other ? OTHER_CITY : known ? city : "";

  return (
    <div>
      <Select
        label={label}
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
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}
