"use client";

// JobFilters — a calm, form-like filter panel (native <select>s throughout, per
// CLAUDE.md's native-select-for-filters rule), deliberately simpler than Directory's
// collapsible-accordion Filters.tsx: Recruitment's filter set is small and well-defined
// (function/type/level/location/remote/salary), so a flat grouped form reads faster
// than a stack of expandable sections.

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

const WORKPLACE_TYPES: { value: WorkplaceType; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

function activeCount(v: JobFilterState): number {
  return [v.jobFunction, v.employmentType, v.experienceLevel, v.city, v.workplaceType, v.minSalary, v.maxSalary].filter(
    (x) => x !== undefined && x !== ""
  ).length;
}

export default function JobFilters({ value, onChange, jobFunctions, className = "" }: JobFiltersProps) {
  const set = (patch: Partial<JobFilterState>) => onChange({ ...value, ...patch });
  const count = activeCount(value);

  return (
    <div className={`card card-flat jf-panel ${className}`}>
      <div className="jf-head">
        <h2 className="jf-title">Filters</h2>
        {count > 0 && (
          <button type="button" className="jf-clear" onClick={() => onChange({})}>
            Clear all
          </button>
        )}
      </div>

      <div className="jf-field">
        <label className="field-label" htmlFor="jf-function">Role type</label>
        <select
          id="jf-function"
          className="select"
          value={value.jobFunction || ""}
          onChange={(e) => set({ jobFunction: e.target.value || undefined })}
        >
          <option value="">All roles</option>
          {jobFunctions.map((jf) => (
            <option key={jf.id} value={jf.slug}>{jf.name}</option>
          ))}
        </select>
      </div>

      <div className="jf-field">
        <label className="field-label" htmlFor="jf-employment">Employment type</label>
        <select
          id="jf-employment"
          className="select"
          value={value.employmentType || ""}
          onChange={(e) => set({ employmentType: (e.target.value || undefined) as EmploymentType | undefined })}
        >
          <option value="">Any</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="jf-field">
        <label className="field-label" htmlFor="jf-level">Experience level</label>
        <select
          id="jf-level"
          className="select"
          value={value.experienceLevel || ""}
          onChange={(e) => set({ experienceLevel: (e.target.value || undefined) as ExperienceLevel | undefined })}
        >
          <option value="">Any</option>
          {EXPERIENCE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div className="jf-field">
        <label className="field-label" htmlFor="jf-city">City</label>
        <input
          id="jf-city"
          className="input"
          type="text"
          placeholder="e.g. Bengaluru"
          value={value.city || ""}
          onChange={(e) => set({ city: e.target.value || undefined })}
        />
      </div>

      <div className="jf-field">
        <label className="field-label" htmlFor="jf-workplace">Workplace</label>
        <select
          id="jf-workplace"
          className="select"
          value={value.workplaceType || ""}
          onChange={(e) => set({ workplaceType: (e.target.value || undefined) as WorkplaceType | undefined })}
        >
          <option value="">All workplaces</option>
          {WORKPLACE_TYPES.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
      </div>

      <div className="jf-field">
        <span className="field-label">Salary range (₹/yr)</span>
        <div className="jf-salary-row">
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Min"
            value={value.minSalary ?? ""}
            onChange={(e) => set({ minSalary: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span className="jf-salary-sep">–</span>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Max"
            value={value.maxSalary ?? ""}
            onChange={(e) => set({ maxSalary: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <style jsx>{`
        .jf-panel { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
        .jf-head { display: flex; align-items: center; justify-content: space-between; }
        .jf-title { font-size: 15px; font-weight: 700; color: var(--ink); }
        .jf-clear { min-height: 44px; background: none; border: none; padding: 0 4px; font-size: 12.5px; font-weight: 700; color: var(--bn-action); cursor: pointer; }
        .jf-field { display: flex; flex-direction: column; gap: 6px; }
        .jf-salary-row { display: flex; align-items: center; gap: 8px; }
        .jf-salary-sep { color: var(--faint); flex-shrink: 0; }
      `}</style>
    </div>
  );
}
