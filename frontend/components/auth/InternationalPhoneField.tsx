"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const listboxId = `${id}-country-listbox`;
  const selectedIndex = Math.max(0, PHONE_COUNTRIES.findIndex((option) => option.iso === country));
  const [countryOpen, setCountryOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!countryOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setCountryOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [countryOpen]);

  const openCountryPicker = () => {
    setCountryOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
  };

  const selectCountry = (iso: string) => {
    onCountryChange(iso);
    setCountryOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + direction + PHONE_COUNTRIES.length) % PHONE_COUNTRIES.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : PHONE_COUNTRIES.length - 1]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCountry(PHONE_COUNTRIES[index].iso);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setCountryOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setCountryOpen(false);
    }
  };

  return (
    <fieldset className={`international-phone${compact ? " is-compact" : ""}`}>
      <legend className="field-label">Mobile number</legend>
      <div className="international-phone-row">
        <div className="international-phone-country-field" ref={pickerRef}>
          <button
            ref={triggerRef}
            className="international-phone-country-trigger"
            type="button"
            aria-label={`Country or region: ${selected.name}, ${selected.dialCode}`}
            aria-haspopup="listbox"
            aria-expanded={countryOpen}
            aria-controls={listboxId}
            onClick={() => countryOpen ? setCountryOpen(false) : openCountryPicker()}
            onKeyDown={(event) => {
              if (!countryOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                openCountryPicker();
              } else if (countryOpen && event.key === "Escape") {
                event.preventDefault();
                setCountryOpen(false);
              }
            }}
          >
            <span>{selected.dialCode}</span>
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
          </button>
          {countryOpen && (
            <ul id={listboxId} className="international-phone-country-list" role="listbox" aria-label="Country or region">
              {PHONE_COUNTRIES.map((option, index) => (
                <li
                  key={option.iso}
                  ref={(node) => { optionRefs.current[index] = node; }}
                  className="international-phone-country-option"
                  role="option"
                  aria-selected={option.iso === country}
                  tabIndex={-1}
                  onClick={() => selectCountry(option.iso)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span>{option.dialCode}</span>
                  <strong>{option.name}</strong>
                  {option.iso === country && <span className="international-phone-country-check" aria-hidden="true">✓</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="international-phone-number">
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
