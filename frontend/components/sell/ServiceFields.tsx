"use client";

import React from "react";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import { Section, MoreOptions, RateCardEditor, TagInput } from "./editors";
import type { ServiceFormState } from "./formTypes";
import type { Errors } from "./validation";

export default function ServiceFields({
  value,
  onChange,
  errors = {},
}: {
  value: ServiceFormState;
  onChange: (patch: Partial<ServiceFormState>) => void;
  errors?: Errors;
}) {
  return (
    <>
      <Section
        title="Price"
        desc="List what you charge for your common jobs. Pick 'Request a quote' only if the price truly depends on the work."
      >
        <div className="sl-mb">
          <Select
            label="How do you charge?"
            value={value.pricingModel}
            onChange={(e) =>
              onChange({
                pricingModel: e.target.value as ServiceFormState["pricingModel"],
              })
            }
            options={[
              { value: "fixed", label: "A fixed price per job" },
              { value: "hourly", label: "By the hour" },
              { value: "quote", label: "Buyers ask for a quote" },
            ]}
          />
        </div>
        <label className="field-label">Your services and prices</label>
        <p className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
          For example: “Monthly GST filing, ₹1,500 per month”.
        </p>
        <RateCardEditor
          value={value.rateCard}
          onChange={(rateCard) => onChange({ rateCard })}
        />
        {errors.rateCard && <p className="field-error">{errors.rateCard}</p>}
      </Section>

      <MoreOptions title="Add more details (optional)" hint="Areas you serve, qualifications, experience, hours">
        <div className="sl-stack">
          <TagInput
            label="Cities you serve"
            hint="Type a city and press Enter."
            value={value.serviceArea}
            onChange={(serviceArea) => onChange({ serviceArea })}
            placeholder="e.g. Pune, Mumbai, Nagpur"
          />
          <TagInput
            label="Qualifications and licences"
            hint="For example CA, ISO 9001 or licensed electrician."
            value={value.credentials}
            onChange={(credentials) => onChange({ credentials })}
            placeholder="Add one and press Enter"
          />
          <Input
            label="Years of experience"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="e.g. 8"
            value={value.experienceYears}
            onChange={(e) => onChange({ experienceYears: e.target.value })}
            error={errors.experienceYears}
          />
          <Textarea
            label="When you are available"
            placeholder="e.g. Mon to Sat, 9am to 7pm. Emergency support on call."
            value={value.availabilitySchedule}
            onChange={(e) => onChange({ availabilitySchedule: e.target.value })}
          />
        </div>
      </MoreOptions>
    </>
  );
}
