import type { Job } from "./types";

export type SearchDestination = "directory" | "recruitment";
export type SearchConfidence = "high" | "low";

export interface UniversalSearchIntent {
  query: string;
  location?: string;
  destination: SearchDestination;
  confidence: SearchConfidence;
}

export interface DirectoryCompany {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  location: string;
  descriptor: string;
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  responseRate: number | null;
  serviceFamily: string;
  capabilities: string[];
  media: string | null;
}

export interface RecruitmentJob {
  id: string;
  title: string;
  companyName: string;
  companySlug: string | null;
  companyLogo: string | null;
  location: string;
  workplace: "Remote" | "On-site";
  salary: string;
  postedAt: string;
  verifiedEmployer: boolean;
}

export interface PlatformActivity {
  id: string;
  kind: "company" | "recruitment" | "editorial";
  eyebrow: string;
  title: string;
  body: string;
  image: string | null;
  href: string;
  age: string;
}

export interface NativePromotion {
  id: string;
  label: "Sponsored";
  title: string;
  body: string;
  href: string;
  sponsorName: string;
}

type DirectoryPresentation = Pick<DirectoryCompany, "serviceFamily" | "capabilities" | "media">;

const directoryPresentations: Record<string, DirectoryPresentation> = {
  "sharma-associates-chartered-accountants": {
    serviceFamily: "Finance, Legal and Compliance",
    capabilities: ["GST and tax filing", "Bookkeeping", "Statutory audit"],
    media: "/demo/business-3.jpg",
  },
  "lexedge-legal-compliance": {
    serviceFamily: "Finance, Legal and Compliance",
    capabilities: ["Business registration", "Contracts", "Compliance support"],
    media: "/demo/business-2.jpg",
  },
  "mehta-co-company-secretaries": {
    serviceFamily: "Finance, Legal and Compliance",
    capabilities: ["Company secretarial", "ROC filings", "Governance"],
    media: "/demo/business-5.jpg",
  },
  "technova-it-solutions": {
    serviceFamily: "Technology and Software",
    capabilities: ["Website development", "Business software", "Technology support"],
    media: "/demo/business-1.jpg",
  },
  "studio-aangan-architects": {
    serviceFamily: "Professional Business Services",
    capabilities: ["Workspace design", "Architecture", "Project planning"],
    media: "/demo/business-4.jpg",
  },
  "vriddhi-business-advisors": {
    serviceFamily: "Professional Business Services",
    capabilities: ["Business strategy", "Marketing partner", "Growth advisory"],
    media: "/demo/business-2.jpg",
  },
  "pixelforge-digital": {
    serviceFamily: "Marketing and Creative",
    capabilities: ["Brand systems", "Digital marketing", "Creative production"],
    media: "/demo/business-5.jpg",
  },
  "swiftmove-packers-logistics": {
    serviceFamily: "Logistics and Operations",
    capabilities: ["Business relocation", "Logistics provider", "Operations support"],
    media: "/demo/business-4.jpg",
  },
  "packright-industries": {
    serviceFamily: "Manufacturing and Suppliers",
    capabilities: ["Food-safe packaging", "Pilot production", "Business supply"],
    media: "/demo/packaging-1.jpg",
  },
};

export const alignedDirectorySlugs = new Set(Object.keys(directoryPresentations));

export function isAlignedDirectoryCompany(raw: any): boolean {
  const slug = raw?.slug || raw?.sellerSlug;
  return Boolean(slug && alignedDirectorySlugs.has(slug));
}

const recruitmentSignals = [
  /\bjob(?:s)?\b/i,
  /\brole(?:s)?\b/i,
  /\bhiring\b/i,
  /\bcareer(?:s)?\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bintern(?:ship)?\b/i,
  /\bsalary\b/i,
  /\bremote\b/i,
  /\bhybrid\b/i,
  /\bfull[- ]?time\b/i,
  /\bpart[- ]?time\b/i,
  /\bapply\b/i,
  /\brecruit(?:er|ment|ing)?\b/i,
];

const directorySignals = [
  /\bcompan(?:y|ies)\b/i,
  /\bservice(?:s)?\b/i,
  /\bconsultant(?:s)?\b/i,
  /\bpartner(?:s)?\b/i,
  /\bagenc(?:y|ies)\b/i,
  /\bprovider(?:s)?\b/i,
  /\bsupplier(?:s)?\b/i,
  /\bvendor(?:s)?\b/i,
  /\bcompliance\b/i,
  /\baccount(?:ant|ing)?\b/i,
  /\blogistics\b/i,
  /\bmanufacturer(?:s)?\b/i,
];

export function classifyUniversalSearch(query: string): UniversalSearchIntent {
  const normalized = query.trim().replace(/\s+/g, " ");
  const recruitmentScore = recruitmentSignals.filter((signal) => signal.test(normalized)).length;
  const directoryScore = directorySignals.filter((signal) => signal.test(normalized)).length;

  if (recruitmentScore > directoryScore && recruitmentScore > 0) {
    return { query: normalized, destination: "recruitment", confidence: "high" };
  }
  if (directoryScore > recruitmentScore && directoryScore > 0) {
    return { query: normalized, destination: "directory", confidence: "high" };
  }
  return { query: normalized, destination: "directory", confidence: "low" };
}

export function universalSearchHref(intent: UniversalSearchIntent): string {
  const params = new URLSearchParams();
  if (intent.query) params.set("q", intent.query);
  if (intent.location) params.set("city", intent.location);
  params.set("source", "home");
  const base = intent.destination === "recruitment" ? "/recruitment/jobs" : "/search";
  return `${base}?${params.toString()}`;
}

export function mapDirectoryCompany(raw: any): DirectoryCompany | null {
  if (!raw) return null;
  const slug = raw.slug || raw.sellerSlug;
  if (!slug) return null;
  const name = raw.companyName || raw.name || "Company";
  const city = raw.city || raw.location?.city;
  const state = raw.state || raw.location?.state;
  const location = [city, state].filter(Boolean).join(", ") || "India";
  const descriptor =
    raw.about ||
    raw.description ||
    (Array.isArray(raw.categories) ? raw.categories.slice(0, 2).join(" · ") : "Business services and capabilities");
  const presentation = directoryPresentations[slug] || {
    serviceFamily: "Professional Business Services",
    capabilities: ["Business services", "Specialist support"],
    media: null,
  };
  return {
    id: raw.id || raw.userId || slug,
    name,
    slug,
    logo: raw.logo ?? null,
    location,
    descriptor,
    verified: Boolean(raw.isVerified || raw.trustSealVerified),
    rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : null,
    reviewCount: Number(raw.reviewCount || 0),
    responseRate: Number.isFinite(Number(raw.responseRate)) ? Number(raw.responseRate) : null,
    ...presentation,
  };
}

export function mapRecruitmentJob(job: Job): RecruitmentJob {
  const city = job.location?.city;
  const state = job.location?.state;
  const location = job.location?.remote ? "Anywhere in India" : [city, state].filter(Boolean).join(", ") || "India";
  const min = job.salaryRange?.min;
  const max = job.salaryRange?.max;
  const disclosed = job.salaryRange?.isDisclosed && (min || max);
  const salary = disclosed
    ? [min, max].filter((value): value is number => typeof value === "number").map((value) => `₹${Number(value).toLocaleString("en-IN")}`).join("–")
    : "Salary shared during the process";
  return {
    id: job.id,
    title: job.title,
    companyName: job.employer?.companyName || "Hiring company",
    companySlug: job.employer?.slug || null,
    companyLogo: job.employer?.logo || null,
    location,
    workplace: job.location?.remote ? "Remote" : "On-site",
    salary,
    postedAt: job.postedAt,
    verifiedEmployer: Boolean(job.employer?.isVerified),
  };
}

export function relativeAge(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const hours = Math.max(1, Math.round((Date.now() - timestamp) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
