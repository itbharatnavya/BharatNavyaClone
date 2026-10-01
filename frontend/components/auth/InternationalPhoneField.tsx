"use client";

import React from "react";
import { INTERNATIONAL_PHONE_ENABLED, PHONE_COUNTRIES, phoneCountry, phoneNationalDigits } from "@/lib/phone";

interface InternationalPhoneFieldProps {
  id: string;
  country: string;
  number: string;
  onCountryChange: (country: string) => void;
  onNumberChange: (number: string) => void;
  error?: string;
  compact?: boolean;
}

export default function InternationalPhoneField({
  id,
  country,
  number,
  onCountryChange,
  onNumberChange,
  error,
  compact = false,
}: InternationalPhoneFieldProps) {
  const selected = phoneCountry(country);
  const hintId = `${id}-hint`;

  return (
    <fieldset className={`international-phone${compact ? " is-compact" : ""}`}>
      <legend className="field-label">Mobile number</legend>
      <div className="international-phone-row">
        <label>
          <span className="sr-only">Country or region</span>
          <select
            className="select international-phone-country"
            aria-label="Country or region"
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
          >
            {PHONE_COUNTRIES.map((option) => (
              <option key={option.iso} value={option.iso}>
                {option.name} ({option.dialCode})
              </option>
            ))}
          </select>
        </label>
        <label className="international-phone-number">
          <span className="international-phone-prefix" aria-hidden="true">{selected.dialCode}</span>
          <input
            id={id}
            name="mobile"
            className={`input${error ? " input-error" : ""}`}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={selected.example}
            value={number}
            aria-invalid={!!error}
            aria-describedby={hintId}
            onChange={(event) => onNumberChange(phoneNationalDigits(country, event.target.value))}
          />
        </label>
      </div>
      <p id={hintId} className={error ? "field-error" : "field-hint"}>
        {error || (country === "IN" || INTERNATIONAL_PHONE_ENABLED
          ? "Choose the country linked to this mobile number."
          : "Frontend ready. International OTP activates after the backend provider update.")}
      </p>
    </fieldset>
  );
}
