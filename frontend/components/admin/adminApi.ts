// components/admin/adminApi.ts
//
// Admin Control Center data-access adapter.
//
// The shared lib/api.ts covers most admin endpoints. This module:
//   1) Re-exports the well-matched lib/api admin methods so tabs have one import.
//   2) Adds the endpoints that lib/api does not yet expose (features CRUD,
//      reports moderation, category CRUD) — implemented against the LIVE backend
//      exactly as routes/features.js, routes/admin.js and routes/adminCategories.js
//      define them.
//   3) Provides accurate local response types where the real backend JSON differs
//      from lib/types.ts (analytics, settings, payments, ad-bookings).
//
// It never edits shared files; it only reads getToken() from lib/api for auth.

import * as api from "@/lib/api";
import { getToken } from "@/lib/api";
import type { Entitlements, Collection } from "@/lib/api";
import type {
  AdminSettings,
  Category,
  PaymentRecord,
  AdBooking,
  SubscriptionPlan,
  AdSlot,
  MediaItem,
  ListingVerification,
  User,
  SellerStatus,
  PlanTier,
  JobFunction,
  JobRole,
  Skill,
  Inquiry,
  SellerDelivery,
  WorkplaceType,
} from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });

  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new Error("Invalid response from server");
  }
  if (!res.ok || !json.success) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json.data;
}

// ============================================================
// Re-exports of the matched lib/api admin methods (one import for tabs)
// ============================================================
export const adminSellers = api.adminSellers;
export const adminApprove = api.adminApprove;
export const adminReject = api.adminReject;
export const adminSuspend = api.adminSuspend;
export const adminMonetization = api.adminMonetization;
export const getCategories = api.getCategories;
export const getListings = api.getListings;
export const forwardInquiry = api.forwardInquiry;
export const dismissInquiry = api.dismissInquiry;
export type ForwardResult = api.ForwardResult;

// ============================================================
// RFQ log — GET /api/admin/inquiries (routes/adminInquiries.js)
// Every RFQ ever submitted, who sent it, and which seller(s) it was actually
// delivered to. Server-paginated + filterable, same envelope shape as
// adminGetUsers below: { items, total, page, totalPages, summary }.
// ============================================================
export interface RfqLogRow extends Inquiry {
  sellers: SellerDelivery[];
}

export type RfqLogStatusFilter = "all" | "matched" | "unmatched";
export type RfqLogAdminStatusFilter = "all" | "pending" | "forwarded" | "dismissed";

export interface RfqLogQuery {
  q?: string;
  sellerId?: string;
  status?: RfqLogStatusFilter;
  adminStatus?: RfqLogAdminStatusFilter;
  categoryId?: string;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
  page?: number;
  limit?: number;
}

export interface RfqLogSummary {
  total: number;
  matched: number;
  unmatched: number;
}

export interface RfqLogPage {
  items: RfqLogRow[];
  total: number;
  page: number;
  totalPages: number;
  summary: RfqLogSummary;
}

export function getRfqLog(query: RfqLogQuery = {}): Promise<RfqLogPage> {
  const usp = new URLSearchParams();
  if (query.q) usp.set("q", query.q);
  if (query.sellerId) usp.set("sellerId", query.sellerId);
  if (query.status && query.status !== "all") usp.set("status", query.status);
  if (query.adminStatus && query.adminStatus !== "all") usp.set("adminStatus", query.adminStatus);
  if (query.categoryId) usp.set("categoryId", query.categoryId);
  if (query.from) usp.set("from", query.from);
  if (query.to) usp.set("to", query.to);
  usp.set("page", String(query.page || 1));
  usp.set("limit", String(query.limit || 20));
  return req<RfqLogPage>(`/api/admin/inquiries?${usp.toString()}`);
}

// ============================================================
// Unified user directory — GET /api/admin/users (routes/admin.js)
//
// One paginated view over every account. An account wears any mix of "hats"
// (buyer/seller/employer/candidate/admin) at once. `scope` narrows the base set
// to one product's people and decides which approval-status field `status`
// filters on. GET /api/admin/users/:id is the per-person cross-product detail.
// ============================================================
export type AdminUserScope = "global" | "directory" | "recruitment";
export type AdminUserTypeFilter =
  | "all"
  | "buyer"
  | "seller"
  | "employer"
  | "candidate"
  | "admin";
export type AdminUserHat = "buyer" | "seller" | "employer" | "candidate" | "admin";
export type AdminAccountStatus = "active" | "suspended";

// Trimmed employer/candidate slices the list actually renders (full blocks live
// on the detail response). sellerProfile stays whole — the seller columns read many fields.
export interface AdminUserRow
  extends Omit<User, "employerProfile" | "candidateProfile"> {
  accountType: "user" | "seller";
  accountStatus: AdminAccountStatus;
  hats: AdminUserHat[];
  employerProfile:
    | { companyName: string; slug: string | null; status: SellerStatus; isVerified: boolean }
    | null;
  candidateProfile:
    | { headline: string; skills: string[]; resumeUrl: string | null }
    | null;
}

export type AdminUserFeaturedFilter = "all" | "yes" | "no";

export interface AdminUserQuery {
  scope?: AdminUserScope;
  type?: AdminUserTypeFilter;
  status?: SellerStatus | "all";
  planTier?: PlanTier | "all";
  featured?: AdminUserFeaturedFilter;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminUserSummary {
  total: number;
  buyers: number;
  sellers: number;
  employers: number;
  candidates: number;
  admins: number;
  suspended: number;
}

export interface AdminUserPage {
  items: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
  summary: AdminUserSummary;
}

export function adminGetUsers(query: AdminUserQuery = {}): Promise<AdminUserPage> {
  const usp = new URLSearchParams();
  if (query.scope && query.scope !== "global") usp.set("scope", query.scope);
  if (query.type && query.type !== "all") usp.set("type", query.type);
  if (query.status && query.status !== "all") usp.set("status", query.status);
  if (query.planTier && query.planTier !== "all") usp.set("planTier", query.planTier);
  if (query.featured && query.featured !== "all") usp.set("featured", query.featured);
  if (query.q) usp.set("q", query.q);
  usp.set("page", String(query.page || 1));
  usp.set("limit", String(query.limit || 20));
  return req<AdminUserPage>(`/api/admin/users?${usp.toString()}`);
}

// GET /api/admin/users/:id — one account, every hat + cross-product activity counts.
export interface AdminUserDetail extends User {
  accountStatus: AdminAccountStatus;
  hats: AdminUserHat[];
}
export interface AdminUserStats {
  listings: number;
  inquiriesSent: number;
  jobsPosted: number;
  applicationsSent: number;
  applicationsReceived: number;
  reviewsWritten: number;
  reviewsReceived: number;
}
export function adminGetUser(id: string): Promise<{ user: AdminUserDetail; stats: AdminUserStats }> {
  return req<{ user: AdminUserDetail; stats: AdminUserStats }>(`/api/admin/users/${id}`);
}

// POST /api/admin/users/:id/suspend | /reactivate — account-level (blocks login +
// every authenticated request). Admin accounts and your own account are protected.
export function adminSuspendAccount(id: string): Promise<{ id: string; status: AdminAccountStatus }> {
  return req(`/api/admin/users/${id}/suspend`, { method: "POST" });
}
export function adminReactivateAccount(id: string): Promise<{ id: string; status: AdminAccountStatus }> {
  return req(`/api/admin/users/${id}/reactivate`, { method: "POST" });
}

// ============================================================
// Subscription plans — real subscription-plans.json shape (drives /pricing)
// ============================================================
export interface PlanPriceInfo {
  monthly?: number;
  currency?: string;
  label?: string;
}
export interface PlanRow {
  id: string;
  name: string;
  tier: string; // free | silver | gold | ...
  billingCycle?: string;
  listingLimit?: number | null;
  leadQuotaPerCycle?: number | null;
  featuredCreditsPerCycle?: number | null;
  rankBoostBaseline?: number | null;
  verifiedBadgeIncluded?: boolean;
  analyticsEnabled?: boolean;
  perLeadPrice?: number | null;
  priceInfo?: PlanPriceInfo;
  tierRank?: number;
}
export type PlanInput = Partial<Omit<PlanRow, "id">>;

export function getPlans(): Promise<PlanRow[]> {
  return api.adminPlans() as unknown as Promise<PlanRow[]>;
}
export function createPlan(body: PlanInput): Promise<PlanRow> {
  return api.adminCreatePlan(
    body as unknown as Partial<SubscriptionPlan>
  ) as unknown as Promise<PlanRow>;
}
export function updatePlan(id: string, body: PlanInput): Promise<PlanRow> {
  return api.adminUpdatePlan(
    id,
    body as unknown as Partial<SubscriptionPlan>
  ) as unknown as Promise<PlanRow>;
}

// ============================================================
// Ad slots — real ad-slots.json shape
// ============================================================
export interface AdSlotRow {
  id: string;
  name: string;
  placementType?: string;
  defaultSize?: string;
  isActive?: boolean;
}
export type AdSlotInput = Partial<Omit<AdSlotRow, "id">>;

export function getAdSlots(): Promise<AdSlotRow[]> {
  return api.adminAdSlots() as unknown as Promise<AdSlotRow[]>;
}
export function createAdSlot(body: AdSlotInput): Promise<AdSlotRow> {
  return api.adminCreateAdSlot(
    body as unknown as Partial<AdSlot>
  ) as unknown as Promise<AdSlotRow>;
}
export function updateAdSlot(id: string, body: AdSlotInput): Promise<AdSlotRow> {
  return api.adminUpdateAdSlot(
    id,
    body as unknown as Partial<AdSlot>
  ) as unknown as Promise<AdSlotRow>;
}

// ============================================================
// Analytics — real GET /api/admin/analytics shape
// ============================================================
export interface MonthCount {
  month: string;
  year: number;
  count: number;
}

export interface AdminAnalyticsData {
  totals: {
    users: number;
    sellers: number;
    listings: number;
    inquiries: number;
    pendingSellers: number;
    activePaidSellers: number;
  };
  sellersByTier: Record<string, number>;
  activePaidSellersByTier: Record<string, number>;
  monthlyInquiries: MonthCount[];
  recruitment?: {
    totals: {
      employers: number;
      pendingEmployers: number;
      candidates: number;
      jobs: number;
      activeJobs: number;
      openings: number;
      applications: number;
      hires: number;
    };
    applicationsByStatus: Record<string, number>;
    monthlyApplications: MonthCount[];
  };
}

export function getAnalytics(): Promise<AdminAnalyticsData> {
  return api.adminAnalytics() as unknown as Promise<AdminAnalyticsData>;
}

// ============================================================
// Site settings — real settings.json shape (see DB/settings.json)
// ============================================================
export interface SiteBranding {
  siteName?: string;
  tagline?: string;
  logoText?: string;
  accentBlue?: string;
  accentOrange?: string;
}
export interface SiteHomepage {
  heroTitle?: string;
  heroSubtitle?: string;
  heroExamples?: string[];
  featuredCategorySlugs?: string[];
  showStories?: boolean;
  showTrending?: boolean;
  showFeaturedSellers?: boolean;
  showCategoryGrid?: boolean;
}
export interface SiteContact {
  email?: string;
  phone?: string;
  address?: string;
}
export interface SiteFooter {
  about?: string;
}
export interface SiteSettings {
  wOrganic?: number;
  wPaid?: number;
  maxSponsoredPerPage?: number;
  relevanceFloorThreshold?: number;
  sponsoredRowEnabled?: boolean;
  tierBaseline?: Record<string, number>;
  branding?: SiteBranding;
  homepage?: SiteHomepage;
  featureFlags?: Record<string, boolean>;
  contact?: SiteContact;
  footer?: SiteFooter;
  [key: string]: unknown;
}

export function getSettings(): Promise<SiteSettings> {
  return api.adminSettings() as unknown as Promise<SiteSettings>;
}
export function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  return api.adminUpdateSettings(
    patch as unknown as Partial<AdminSettings>
  ) as unknown as Promise<SiteSettings>;
}

// ============================================================
// Payments — real payment-records.json shape (differs from lib/types)
// ============================================================
export interface PaymentRow {
  id: string;
  sellerId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  amount: number;
  paymentMethod?: string | null;
  paymentStatus: string;
  validFrom?: string | null;
  validTo?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  markedPaidDate?: string | null;
  createdAt: string;
}
export type PaymentInput = Partial<Omit<PaymentRow, "id" | "createdAt">>;

export function getPayments(): Promise<PaymentRow[]> {
  return api.adminPayments() as unknown as Promise<PaymentRow[]>;
}
export function createPayment(body: PaymentInput): Promise<PaymentRow> {
  return api.adminCreatePayment(
    body as unknown as Partial<PaymentRecord>
  ) as unknown as Promise<PaymentRow>;
}
export function updatePayment(id: string, body: PaymentInput): Promise<PaymentRow> {
  return api.adminUpdatePayment(
    id,
    body as unknown as Partial<PaymentRecord>
  ) as unknown as Promise<PaymentRow>;
}

// ============================================================
// Ad bookings — real ad-bookings.json shape (differs from lib/types)
// ============================================================
export interface AdBookingRow {
  id: string;
  // WHERE the ad runs (public /api/ads serving fields)
  placementType?: string | null; // category_top | search_top | home_hero | recruitment_*
  adSlotId?: string | null;
  slotId?: string | null;
  // WHICH audience it targets (empty categoryIds = all categories)
  sellerId?: string | null;
  listingId?: string | null;
  categoryIds?: string[]; // targeted category slugs; [] = all
  categoryId?: string | null; // legacy singular (kept for back-compat)
  // The creative that renders in the slider
  creativeImageUrl?: string | null;
  headline?: string | null;
  targetUrl?: string | null;
  creative?: string | null; // legacy
  // HOW / WHEN it serves
  startDate?: string | null;
  endDate?: string | null;
  priority: number;
  amount?: number | null;
  paymentRecordId?: string | null;
  status: string; // pending | active | scheduled | paused | …
  createdAt: string;
}
export type AdBookingInput = Partial<Omit<AdBookingRow, "id" | "createdAt">>;

export type AdBookingProductFilter = "directory" | "recruitment";

export interface AdBookingQuery {
  product: AdBookingProductFilter;
  status?: string | "all";
  page?: number;
  limit?: number;
}

export interface AdBookingPage {
  items: AdBookingRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function getAdBookings(query: AdBookingQuery): Promise<AdBookingPage> {
  const usp = new URLSearchParams();
  usp.set("product", query.product);
  if (query.status && query.status !== "all") usp.set("status", query.status);
  usp.set("page", String(query.page || 1));
  usp.set("limit", String(query.limit || 20));
  return req<AdBookingPage>(`/api/admin/ad-bookings?${usp.toString()}`);
}
export function createAdBooking(body: AdBookingInput): Promise<AdBookingRow> {
  return api.adminCreateAdBooking(
    body as unknown as Partial<AdBooking>
  ) as unknown as Promise<AdBookingRow>;
}
export function updateAdBooking(
  id: string,
  body: AdBookingInput
): Promise<AdBookingRow> {
  return req<AdBookingRow>(`/api/admin/ad-bookings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ============================================================
// Features — GET (public) + admin CRUD (routes/features.js)
// ============================================================
export type FeatureStatus = "live" | "beta" | "planned";
export interface Feature {
  id: string;
  name: string;
  group: string;
  description?: string;
  audience: string; // all | seller | buyer | admin
  plans: string[]; // free | silver | gold
  status: FeatureStatus | string;
  phase: number;
}
export type FeatureInput = {
  name: string;
  group: string;
  description?: string;
  audience?: string;
  plans?: string[];
  status?: string;
  phase?: number;
};

export function getFeatures(query: Record<string, string> = {}): Promise<Feature[]> {
  const usp = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v) usp.append(k, v);
  });
  const qs = usp.toString();
  return req<Feature[]>(`/api/features${qs ? `?${qs}` : ""}`);
}
export function adminCreateFeature(body: FeatureInput): Promise<Feature> {
  return req<Feature>(`/api/features`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateFeature(
  id: string,
  body: Partial<FeatureInput>
): Promise<Feature> {
  return req<Feature>(`/api/features/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
export function adminDeleteFeature(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/features/${id}`, { method: "DELETE" });
}

// ============================================================
// Recruitment: Employer approval (routes/adminEmployers.js, /api/admin/employers)
// ============================================================
export interface EmployerRow {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  createdAt?: string;
  companyName: string;
  slug: string;
  industry?: string | null;
  companySize?: string | null;
  location?: { city?: string; state?: string } | null;
  status: "pending" | "approved" | "suspended";
  isVerified: boolean;
  planTier?: string | null;
}

export function adminGetEmployers(
  status?: "pending" | "approved" | "suspended" | "all"
): Promise<EmployerRow[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  return req<EmployerRow[]>(`/api/admin/employers${qs}`);
}
export function adminApproveEmployer(userId: string): Promise<{ id: string; status: string }> {
  return req(`/api/admin/employers/${userId}/approve`, { method: "POST" });
}
export function adminSuspendEmployer(userId: string): Promise<{ id: string; status: string }> {
  return req(`/api/admin/employers/${userId}/suspend`, { method: "POST" });
}

// ============================================================
// Recruitment: Jobs admin visibility (routes/adminJobs.js, /api/admin/jobs)
// Mutations (pause/activate/close) reuse the existing lib/api.ts `updateJob`
// (PUT /api/jobs/:id — isOwnerOrAdmin already lets an admin patch status).
// ============================================================
export interface AdminJobRow {
  id: string;
  title: string;
  status: "active" | "paused" | "closed" | "draft";
  employmentType?: string | null;
  experienceLevel?: string | null;
  location?: { city?: string; state?: string; remote?: boolean; workplaceType?: WorkplaceType } | null;
  postedAt?: string;
  applicationCount?: number;
  employerId: string;
  employerCompany: string;
  employerStatus: "pending" | "approved" | "suspended" | null;
}
export interface AdminJobQuery {
  status?: "active" | "paused" | "closed" | "draft" | "all";
  employerId?: string;
  q?: string;
  page?: number;
  limit?: number;
}
export interface AdminJobPage {
  jobs: AdminJobRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function adminGetJobs(query: AdminJobQuery = {}): Promise<AdminJobPage> {
  const usp = new URLSearchParams();
  if (query.status && query.status !== "all") usp.set("status", query.status);
  if (query.employerId) usp.set("employerId", query.employerId);
  if (query.q) usp.set("q", query.q);
  usp.set("page", String(query.page || 1));
  usp.set("limit", String(query.limit || 20));
  return req<AdminJobPage>(`/api/admin/jobs?${usp.toString()}`);
}

// ============================================================
// Recruitment taxonomy admin CRUD — Skills / Job Roles / Job Functions
// (routes/adminSkills.js, adminJobRoles.js, adminJobFunctions.js). Each GET
// returns every row including inactive ones (the public reads filter those out).
// ============================================================
export function adminGetJobFunctions(): Promise<JobFunction[]> {
  return req<JobFunction[]>(`/api/admin/job-functions`);
}
export function adminCreateJobFunction(body: { name: string; order?: number }): Promise<JobFunction> {
  return req<JobFunction>(`/api/admin/job-functions`, { method: "POST", body: JSON.stringify(body) });
}
export function adminUpdateJobFunction(
  id: string,
  body: Partial<{ name: string; order: number; isActive: boolean }>
): Promise<JobFunction> {
  return req<JobFunction>(`/api/admin/job-functions/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
export function adminDeleteJobFunction(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/admin/job-functions/${id}`, { method: "DELETE" });
}

export function adminGetJobRoles(): Promise<JobRole[]> {
  return req<JobRole[]>(`/api/admin/job-roles`);
}
export function adminCreateJobRole(body: {
  title: string;
  jobFunction?: string | null;
  order?: number;
}): Promise<JobRole> {
  return req<JobRole>(`/api/admin/job-roles`, { method: "POST", body: JSON.stringify(body) });
}
export function adminUpdateJobRole(
  id: string,
  body: Partial<{ title: string; jobFunction: string | null; order: number; isActive: boolean }>
): Promise<JobRole> {
  return req<JobRole>(`/api/admin/job-roles/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
export function adminDeleteJobRole(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/admin/job-roles/${id}`, { method: "DELETE" });
}

export function adminGetSkills(): Promise<Skill[]> {
  return req<Skill[]>(`/api/admin/skills`);
}
export function adminCreateSkill(body: {
  name: string;
  jobFunction?: string | null;
  order?: number;
}): Promise<Skill> {
  return req<Skill>(`/api/admin/skills`, { method: "POST", body: JSON.stringify(body) });
}
export function adminUpdateSkill(
  id: string,
  body: Partial<{ name: string; jobFunction: string | null; order: number; isActive: boolean }>
): Promise<Skill> {
  return req<Skill>(`/api/admin/skills/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
export function adminDeleteSkill(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/admin/skills/${id}`, { method: "DELETE" });
}

// ============================================================
// Reports moderation — GET/resolve/dismiss (routes/admin.js)
// ============================================================
export interface AdminReport {
  id: string;
  listingId: string;
  reporterId?: string;
  reason: string;
  details?: string;
  status: "open" | "resolved" | "dismissed" | string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export function adminGetReports(
  status?: "open" | "resolved" | "dismissed" | "all"
): Promise<AdminReport[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  return req<AdminReport[]>(`/api/admin/reports${qs}`);
}
export function adminResolveReport(id: string): Promise<AdminReport> {
  return req<AdminReport>(`/api/admin/reports/${id}/resolve`, { method: "PUT" });
}
export function adminDismissReport(id: string): Promise<AdminReport> {
  return req<AdminReport>(`/api/admin/reports/${id}/dismiss`, { method: "PUT" });
}

// ============================================================
// Category CRUD (routes/adminCategories.js, /api/admin/categories)
// ============================================================
export type CategoryCreateInput = {
  name: string;
  parentId?: string | null;
  type?: "product" | "service" | "both";
  slug?: string;
  description?: string;
  icon?: string;
  order?: number;
};
export type CategoryUpdateInput = {
  name?: string;
  description?: string;
  icon?: string;
  order?: number;
  type?: "product" | "service" | "both";
};

export function adminCreateCategory(body: CategoryCreateInput): Promise<Category> {
  return req<Category>(`/api/admin/categories`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateCategory(
  id: string,
  body: CategoryUpdateInput
): Promise<Category> {
  return req<Category>(`/api/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
export function adminDeleteCategory(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Entitlements — admin bulk save (PUT /api/admin/entitlements)
// Re-composes and returns the full matrix (routes/entitlements.js).
// ============================================================
export interface EntitlementLimitsInput {
  listingLimit?: number | null;
  leadQuotaPerCycle?: number | null;
  featuredCreditsPerCycle?: number | null;
  verifiedBadgeIncluded?: boolean;
  analyticsEnabled?: boolean;
  perLeadPrice?: number | null;
}
export interface EntitlementsSaveBody {
  features?: { id: string; plans: string[] }[];
  planLimits?: Record<string, EntitlementLimitsInput>;
}

export function saveEntitlements(body: EntitlementsSaveBody): Promise<Entitlements> {
  return req<Entitlements>(`/api/admin/entitlements`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ============================================================
// Collections ("Concepts") — admin CRUD (routes/collections.js)
// Mounted at /api/admin/collections (self-guarded); admin ops live under /admin.
// ============================================================
export interface CollectionInput {
  title: string;
  subtitle?: string;
  coverImage?: string | null;
  listingIds?: string[];
  categorySlugs?: string[];
  brandSlugs?: string[];
  order?: number;
  status?: "published" | "draft";
}

export function adminGetCollections(): Promise<Collection[]> {
  return req<Collection[]>(`/api/admin/collections/admin`);
}
export function adminCreateCollection(body: CollectionInput): Promise<Collection> {
  return req<Collection>(`/api/admin/collections/admin`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateCollection(
  id: string,
  body: Partial<CollectionInput>
): Promise<Collection> {
  return req<Collection>(`/api/admin/collections/admin/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
export function adminDeleteCollection(id: string): Promise<{ deleted: boolean }> {
  return req<{ deleted: boolean }>(`/api/admin/collections/admin/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Self-serve boosts moderation (routes/boosts.js)
// Mounted at /api/admin/boosts (self-guarded); admin ops live under /admin. A seller's
// boost request is created PENDING; approving APPLIES the boost to the listing.
// ============================================================
export type BoostType = "feature" | "category_top" | "rank";

export interface BoostRequestRow {
  id: string;
  sellerId: string;
  listingId: string;
  boostType: BoostType;
  days: number;
  amount?: number | null;
  status: string; // "pending" | "active" | "rejected"
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  // enriched by the backend
  listingTitle?: string | null;
  boostLabel?: string;
  sellerCompany?: string;
}

export function adminGetBoosts(
  status?: "pending" | "active" | "rejected" | "all"
): Promise<BoostRequestRow[]> {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  return req<BoostRequestRow[]>(`/api/admin/boosts/admin${qs}`);
}
export function adminApproveBoost(id: string): Promise<BoostRequestRow> {
  // admin ops live under /admin (mount is /api/admin/boosts, self-guarded)
  return req<BoostRequestRow>(`/api/admin/boosts/admin/${id}/approve`, {
    method: "POST",
  });
}
export function adminRejectBoost(id: string): Promise<BoostRequestRow> {
  return req<BoostRequestRow>(`/api/admin/boosts/admin/${id}/reject`, {
    method: "POST",
  });
}

// ============================================================
// Content moderation — blogs / stories / reviews (routes/moderation.js)
// Mounted at /api/admin/moderation (self-guarded). Hiding sets status "hidden",
// which the public reads already exclude; approve restores published/approved.
// ============================================================
export type ModerationType = "blog" | "story";
export type ModerationAction = "approve" | "hide" | "delete";

export interface ModerationItem {
  id: string;
  type: ModerationType;
  title: string;
  snippet: string;
  author: string;
  authorType: "seller" | "employer" | null;
  target: string | null; // for reviews: the company being reviewed
  status: string; // published | draft | hidden | approved | pending
  date: string | null;
  href: string | null;
}

export function adminGetContent(
  type: ModerationType,
  authorType?: "seller" | "employer"
): Promise<ModerationItem[]> {
  const qs = authorType ? `&authorType=${authorType}` : "";
  return req<ModerationItem[]>(`/api/admin/moderation/content?type=${type}${qs}`);
}

export function adminModerate(
  type: ModerationType,
  id: string,
  action: ModerationAction
): Promise<{ id?: string; deleted?: boolean; status?: string }> {
  return req(`/api/admin/moderation/${type}/${id}/${action}`, { method: "POST" });
}

// ============================================================
// Seller verification queue (routes/moderation.js)
// A seller's GST/PAN request; approving grants the verified badge + trust seal.
// ============================================================
export interface AdminVerification {
  id: string;
  sellerId: string;
  companyName?: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  note?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export function adminGetVerifications(): Promise<AdminVerification[]> {
  return req<AdminVerification[]>(`/api/admin/moderation/verifications`);
}
export function adminApproveVerification(id: string): Promise<AdminVerification> {
  return req<AdminVerification>(
    `/api/admin/moderation/verifications/${id}/approve`,
    { method: "POST" }
  );
}
export function adminRejectVerification(id: string): Promise<AdminVerification> {
  return req<AdminVerification>(
    `/api/admin/moderation/verifications/${id}/reject`,
    { method: "POST" }
  );
}

// ============================================================
// Listing AI-verification queue (routes/adminListings.js)
// Mounted at /api/admin/listings (self-guarded). Every listing is scored on submit
// (backend/lib/listingVerification.js) — >=70% + AI OK auto-publishes; everything
// else lands here as "pending" for a human decision.
// ============================================================
export type AdminListingStatusFilter =
  | "active"
  | "pending"
  | "rejected"
  | "inactive"
  | "sold"
  | "all";
export type AdminListingVerificationFilter =
  | "auto_approved"
  | "needs_review"
  | "admin_approved"
  | "rejected"
  | "unverified" // pre-dates this feature — no verification block at all
  | "all";

export interface AdminListingRow {
  id: string;
  type: "product" | "service";
  title: string;
  slug: string;
  status: string;
  sellerId: string;
  sellerCompany: string;
  sellerStatus?: string | null;
  categoryId: string | null;
  category: string | null;
  price: number | null;
  media: MediaItem[];
  verification: ListingVerification | null;
  createdAt: string;
}

export interface AdminListingQuery {
  status?: AdminListingStatusFilter;
  verification?: AdminListingVerificationFilter;
  category?: string; // categoryId
  q?: string; // search: title or seller company
  dateFrom?: string; // ISO date, inclusive
  dateTo?: string; // ISO date, inclusive
  page?: number;
  limit?: number;
}

export interface AdminListingPage {
  items: AdminListingRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function adminGetListingDetail(id: string): Promise<import("@/lib/types").Listing & { sellerCompany: string }> {
  return req(`/api/admin/listings/${id}`);
}
export function adminGetListings(query: AdminListingQuery = {}): Promise<AdminListingPage> {
  const usp = new URLSearchParams();
  if (query.status && query.status !== "all") usp.set("status", query.status);
  if (query.verification && query.verification !== "all") usp.set("verification", query.verification);
  if (query.category) usp.set("category", query.category);
  if (query.q) usp.set("q", query.q);
  if (query.dateFrom) usp.set("dateFrom", query.dateFrom);
  if (query.dateTo) usp.set("dateTo", query.dateTo);
  usp.set("page", String(query.page || 1));
  usp.set("limit", String(query.limit || 20));
  return req<AdminListingPage>(`/api/admin/listings?${usp.toString()}`);
}
export function adminApproveListing(id: string): Promise<AdminListingRow> {
  return req<AdminListingRow>(`/api/admin/listings/${id}/approve`, { method: "POST" });
}
export function adminRejectListing(id: string, reason?: string): Promise<AdminListingRow> {
  return req<AdminListingRow>(`/api/admin/listings/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || undefined }),
  });
}
export function adminReverifyListing(id: string): Promise<AdminListingRow> {
  return req<AdminListingRow>(`/api/admin/listings/${id}/reverify`, { method: "POST" });
}

// ---- bulk actions (checkbox-select flow) ----
export interface BulkApproveResult {
  approved: number;
  errors: { id: string; message: string }[];
}
export interface BulkRejectResult {
  rejected: number;
  errors: { id: string; message: string }[];
}
export interface BulkReverifyResult {
  checked: number;
  results: { id: string; status: string; verificationStatus?: string }[];
  errors: { id: string; message: string }[];
}

export function adminBulkApproveListings(ids: string[]): Promise<BulkApproveResult> {
  return req<BulkApproveResult>(`/api/admin/listings/bulk/approve`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
export function adminBulkRejectListings(ids: string[], reason?: string): Promise<BulkRejectResult> {
  return req<BulkRejectResult>(`/api/admin/listings/bulk/reject`, {
    method: "POST",
    body: JSON.stringify({ ids, reason: reason || undefined }),
  });
}
export function adminBulkReverifyListings(ids: string[]): Promise<BulkReverifyResult> {
  return req<BulkReverifyResult>(`/api/admin/listings/bulk/reverify`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
