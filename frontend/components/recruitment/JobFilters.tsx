"use client";

// JobFilters: the Recruitment filter panel, built from the same .flt pieces as the
// Directory Filters (applied-filter chips, segmented control, chips, one Clear all) so
// both products filter the same way. The role-type list is long, so it stays a
// dropdown (themed by DropdownEnhancer); the short sets are chips.

import React from "react";
import type { JobFunction, EmploymentType, ExperienceLevel, WorkplaceType } from "@/lib/types";

export interface JobFilterState {
  jobFunction?: string;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  city?: string;
  workplaceType?: WorkplaceType;
  minSalary?: number;
  maxSalary?: number;
}

export interface JobFiltersProps {
  value: JobFilterState;
  onChange: (next: JobFilterState) => void;
  jobFunctions: JobFunction[];
  className?: string;
}

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

const WORKPLACE_TYPES: { value: WorkplaceType | ""; label: string }[] = [
  { value: "", label: "Any" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const CLOSE = "M6 6l12 12M18 6L6 18";

export default function JobFilters({ value, onChange, jobFunctions, className = "" }: JobFiltersProps) {
  const set = (patch: Partial<JobFilterState>) => onChange({ ...value, ...patch });
  const label = (list: { value: string; label: string }[], key?: string) => list.find((item) => item.value === key)?.label || key || "";

  const applied: { key: string; label: string; clear: () => void }[] = [];
  if (value.jobFunction) applied.push({ key: "fn", label: jobFunctions.find((item) => item.slug === value.jobFunction)?.name || value.jobFunction, clear: () => set({ jobFunction: undefined }) });
  if (value.employmentType) applied.push({ key: "type", label: label(EMPLOYMENT_TYPES, value.employmentType), clear: () => set({ employmentType: undefined }) });
  if (value.experienceLevel) applied.push({ key: "level", label: label(EXPERIENCE_LEVELS, value.experienceLevel), clear: () => set({ experienceLevel: undefined }) });
  if (value.workplaceType) applied.push({ key: "work", label: label(WORKPLACE_TYPES, value.workplaceType), clear: () => set({ workplaceType: undefined }) });
  if (value.city) applied.push({ key: "city", label: value.city, clear: () => set({ city: undefined }) });
  if (value.minSalary || value.maxSalary) applied.push({ key: "salary", label: `₹${value.minSalary ?? 0}${value.maxSalary ? `–${value.maxSalary}` : "+"}`, clear: () => set({ minSalary: undefined, maxSalary: undefined }) });

  return (
    <aside className={`flt jf-panel ${className}`.trim()} aria-label="Filter roles">
      <header className="flt-head">
        <h2><svg aria-hidden viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filters{applied.length > 0 && <b>{applied.length}</b>}</h2>
        {applied.length > 0 && <button type="button" className="flt-clear" onClick={() => onChange({})}>Clear all</button>}
      </header>

      {applied.length > 0 && (
        <ul className="flt-applied" aria-label="Applied filters">
          {applied.map((item) => <li key={item.key}><button type="button" onClick={item.clear} aria-label={`Remove filter ${item.label}`}>{item.label}<svg aria-hidden viewBox="0 0 24 24"><path d={CLOSE} /></svg></button></li>)}
        </ul>
      )}

      <div className="flt-block">
        <label className="flt-label" htmlFor="jf-function">Role type</label>
        <select id="jf-function" value={value.jobFunction || ""} onChange={(event) => set({ jobFunction: event.target.value || undefined })}>
          <option value="">All roles</option>
          {jobFunctions.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select>
      </div>

      <div className="flt-block">
        <p className="flt-label">Workplace</p>
        <div className="flt-segment" role="radiogroup" aria-label="Workplace">
          {WORKPLACE_TYPES.map((item) => {
            const active = (value.workplaceType || "") === item.value;
            return <button key={item.value || "any"} type="button" role="radio" aria-checked={active} className={active ? "is-active" : undefined} onClick={() => set({ workplaceType: (item.value || undefined) as WorkplaceType | undefined })}>{item.label}</button>;
          })}
        </div>
      </div>

      <div className="flt-block">
        <p className="flt-label">Employment type</p>
        <div className="flt-chips">
          {EMPLOYMENT_TYPES.map((item) => <button key={item.value} type="button" className={`flt-chip${value.employmentType === item.value ? " is-active" : ""}`} aria-pressed={value.employmentType === item.value} onClick={() => set({ employmentType: value.employmentType === item.value ? undefined : item.value })}>{item.label}</button>)}
        </div>
      </div>

      <div className="flt-block">
        <p className="flt-label">Experience level</p>
        <div className="flt-chips">
          {EXPERIENCE_LEVELS.map((item) => <button key={item.value} type="button" className={`flt-chip${value.experienceLevel === item.value ? " is-active" : ""}`} aria-pressed={value.experienceLevel === item.value} onClick={() => set({ experienceLevel: value.experienceLevel === item.value ? undefined : item.value })}>{item.label}</button>)}
        </div>
      </div>

      <div className="flt-block">
        <label className="flt-label" htmlFor="jf-city">City</label>
        <label className="flt-search">
          <svg aria-hidden viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          <input id="jf-city" type="text" placeholder="e.g. Bengaluru" value={value.city || ""} onChange={(event) => set({ city: event.target.value || undefined })} />
        </label>
      </div>

      <div className="flt-block">
        <p className="flt-label">Salary range (₹ per year)</p>
        <div className="flt-price">
          <label><span className="sr-only">Minimum salary</span><i aria-hidden>₹</i><input type="number" min={0} inputMode="numeric" placeholder="Min" value={value.minSalary ?? ""} onChange={(event) => set({ minSalary: event.target.value ? Number(event.target.value) : undefined })} /></label>
          <label><span className="sr-only">Maximum salary</span><i aria-hidden>₹</i><input type="number" min={0} inputMode="numeric" placeholder="Max" value={value.maxSalary ?? ""} onChange={(event) => set({ maxSalary: event.target.value ? Number(event.target.value) : undefined })} /></label>
        </div>
      </div>
    </aside>
  );
}
