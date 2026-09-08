import type { Job } from "@/lib/types";
import type { EvidenceAsset } from "@/lib/livingEvidence";
export type { EvidenceAsset } from "@/lib/livingEvidence";

export interface RolePreviewModel {
  job: Job;
  employerCover?: EvidenceAsset;
  employerMedia: EvidenceAsset[];
}

const PROTOTYPE_MEDIA = [
  { src: "/demo/business-1.jpg", alt: "A team discussing work around a shared table", kind: "team" as const },
  { src: "/demo/business-2.jpg", alt: "Colleagues planning work with notes on a wall", kind: "workplace" as const },
  { src: "/demo/business-3.jpg", alt: "A bright shared workspace with a laptop", kind: "workplace" as const },
  { src: "/demo/business-4.jpg", alt: "Two colleagues celebrating progress at work", kind: "team" as const },
  { src: "/demo/business-5.jpg", alt: "A small team collaborating in an office", kind: "team" as const },
] satisfies Omit<EvidenceAsset, "source">[];

function stableIndex(value: string, offset = 0) {
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (total + offset) % PROTOTYPE_MEDIA.length;
}

export function prototypeEmployerMedia(slugOrName: string, count = 3): EvidenceAsset[] {
  const key = slugOrName || "bharat-navya-employer";
  return Array.from({ length: Math.min(count, PROTOTYPE_MEDIA.length) }, (_, index) => {
    const media = PROTOTYPE_MEDIA[stableIndex(key, index * 2)];
    return { ...media, source: "prototype" as const, attribution: "Prototype workplace media" };
  });
}

export function rolePreviewModel(job: Job, apiCover?: string | null): RolePreviewModel {
  const identity = job.employer?.slug || job.employer?.companyName || job.employerId || job.id;
  const prototypes = prototypeEmployerMedia(identity);
  const employerCover = apiCover
    ? { src: apiCover, alt: `Workplace at ${job.employer?.companyName || "the hiring company"}`, kind: "workplace" as const, source: "api" as const }
    : prototypes[0];
  return { job, employerCover, employerMedia: apiCover ? [employerCover, ...prototypes.slice(0, 2)] : prototypes };
}

export function formatSalary(job: Job, includePeriod = false): string {
  const range = job.salaryRange;
  if (!range || range.isDisclosed === false) return "Salary not disclosed";
  const format = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  const suffix = includePeriod ? " / year" : "";
  if (range.min != null && range.max != null) return `₹${format(range.min)}–₹${format(range.max)}${suffix}`;
  if (range.min != null) return `₹${format(range.min)}+${suffix}`;
  if (range.max != null) return `Up to ₹${format(range.max)}${suffix}`;
  return "Salary not disclosed";
}

export function jobLocation(job: Job): string {
  const city = job.location?.city;
  if (job.location?.remote) return city ? `${city} · Remote` : "Remote";
  return [city, job.location?.state].filter(Boolean).join(", ") || "Location not specified";
}

export function jobFreshness(date: string): string {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Publish date unavailable";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return "Published today";
  if (days === 1) return "Published yesterday";
  return `Published ${days} days ago`;
}

export function closingContext(expiresAt?: string | null): string {
  if (!expiresAt) return "Closing date not provided";
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return "Closing date not provided";
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Applications closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `Closes in ${days} days`;
}
