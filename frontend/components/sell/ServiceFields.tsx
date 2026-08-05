"use client";

import React from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { Section, RateCardEditor, TagInput } from "./editors";
import type { ServiceFormState } from "./formTypes";

export default function ServiceFields({
  value,
  onChange,
}: {
  value: ServiceFormState;
  onChange: (patch: Partial<ServiceFormState>) => void;
}) {
  return (
    <>
      <Section
        title="Pricing"
        desc="Publish a rate-card where you can. Choose 'Request quote' only when pricing truly depends on scope."
      >
        <div style={{ maxWidth: 260, marginBottom: 16 }}>
          <Select
            label="Pricing model"
            value={value.pricingModel}
            onChange={(e) =>
              onChange({
                pricingModel: e.target.value as ServiceFormState["pricingModel"],
              })
            }
            options={[
              { value: "fixed", label: "Fixed price" },
              { value: "hourly", label: "Hourly rate" },
              { value: "quote", label: "Request a quote" },
            ]}
          />
        </div>
        <label className="field-label">Rate card</label>
        <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
          List your common services and their prices.
        </p>
        <RateCardEditor
          value={value.rateCard}
          onChange={(rateCard) => onChange({ rateCard })}
        />
      </Section>

      <Section title="Service details">
        <div style={{ display: "grid", gap: 16 }}>
          <TagInput
            label="Service areas (cities)"
            hint="Type a city and press Enter. Add all cities you serve."
            value={value.serviceArea}
            onChange={(serviceArea) => onChange({ serviceArea })}
            placeholder="e.g. Pune, Mumbai, Nagpur"
          />
          <TagInput
            label="Credentials & certifications"
            hint="e.g. CA, ISO 9001, licensed electrician."
            value={value.credentials}
            onChange={(credentials) => onChange({ credentials })}
            placeholder="Add a credential and press Enter"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <Input
              label="Years of experience"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="e.g. 8"
              value={value.experienceYears}
              onChange={(e) => onChange({ experienceYears: e.target.value })}
            />
          </div>
          <Textarea
            label="Availability"
            placeholder="e.g. Mon–Sat, 9am–7pm. Emergency support on call."
            value={value.availabilitySchedule}
            onChange={(e) => onChange({ availabilitySchedule: e.target.value })}
          />
        </div>
      </Section>
    </>
  );
}
