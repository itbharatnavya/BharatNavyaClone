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
  monthlyInquiries: { month: string; year: number; count: number }[];
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
  placementType?: string | null; // category_top | search_top | home_hero
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
  status: string; // active | scheduled | paused | …
  createdAt: string;
}
export type AdBookingInput = Partial<Omit<AdBookingRow, "id" | "createdAt">>;

export function getAdBookings(): Promise<AdBookingRow[]> {
  return api.adminAdBookings() as unknown as Promise<AdBookingRow[]>;
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
export type ModerationType = "blog" | "story" | "review";
export type ModerationAction = "approve" | "hide" | "delete";

export interface ModerationItem {
  id: string;
  type: ModerationType;
  title: string;
  snippet: string;
  author: string;
  target: string | null; // for reviews: the company being reviewed
  status: string; // published | draft | hidden | approved | pending
  date: string | null;
  href: string | null;
}

export function adminGetContent(type: ModerationType): Promise<ModerationItem[]> {
  return req<ModerationItem[]>(`/api/admin/moderation/content?type=${type}`);
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
