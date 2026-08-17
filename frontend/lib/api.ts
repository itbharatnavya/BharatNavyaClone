// BharatSource v2 — typed API client.
// Calls the backend v2 surface at "/api/*" (proxied to :4000 via next.config.mjs).
// - unwraps the { success, data } envelope, throwing Error(json.error) on failure
// - attaches Authorization: Bearer <token> from localStorage.bs_token when present
//   (SSR-guarded: only touches localStorage in the browser)

import type {
  ApiResponse,
  AuthResult,
  User,
  SellerProfile,
  SellerLocation,
  SellerPublicProfile,
  Category,
  CategoryNode,
  Listing,
  ListingsResponse,
  ListingType,
  AiSearchResult,
  Inquiry,
  Quote,
  Lead,
  Review,
  SearchTrendItem,
  RecentActivityItem,
  Conversation,
  Message,
  Blog,
  Story,
  StoryGroup,
  Analytics,
  SubscriptionPlan,
  AdSlot,
  AdBooking,
  PaymentRecord,
  AdminSettings,
  SellerStatus,
  PlanTier,
  ConsultationExpert,
  ConsultationExpertDetail,
  ExpertsMeta,
  BookingBody,
  ConsultationBooking,
} from "./types";

// Extend the shared AiSearchResult with the optional NEVER-BLANK `message` the AI
// concierge now returns (a friendly line to show even when there are zero matches).
// Declared here via module augmentation so every importer of AiSearchResult sees it.
declare module "./types" {
  interface AiSearchResult {
    message?: string;
  }
}

// Empty base → the browser calls a relative "/api/..." path on the same origin,
// which Next.js proxies to the backend. Overridable for non-proxy setups.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const TOKEN_KEY = "bs_token";

// ---- token helpers ----
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ---- core request ----
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!res.ok || !json.success) {
    const message =
      json && "error" in json && json.error
        ? json.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json.data;
}

function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false
    ) {
      usp.append(key, String(value));
    }
  });
  const q = usp.toString();
  return q ? `?${q}` : "";
}

// ============================================================
// Auth
// ============================================================
export function register(body: {
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  city?: string;
  state?: string;
}): Promise<{ token?: string; user: User }> {
  return request<{ token?: string; user: User }>(`/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function sendOtp(mobile: string): Promise<{ message: string; otp?: string }> {
  return request<{ message: string; otp?: string }>(`/api/auth/send-otp`, {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });
}

export function verifyOtp(mobile: string, otp: string): Promise<AuthResult> {
  return request<AuthResult>(`/api/auth/verify-otp`, {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });
}

export function login(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>(`/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// GET /auth/me returns data as { user } — unwrap to the User.
export async function getMe(): Promise<User> {
  const data = await request<{ user: User }>(`/api/auth/me`);
  return data.user;
}

// ============================================================
// Users / Sellers
// ============================================================
export function getSeller(slug: string): Promise<SellerPublicProfile> {
  return request<SellerPublicProfile>(`/api/sellers/${slug}`);
}

// Top verified/rated sellers for the homepage "Featured sellers" rail.
export function getFeaturedSellers(): Promise<any[]> {
  return request<any[]>(`/api/sellers/featured`);
}

export async function becomeSeller(
  body: Partial<SellerProfile> & { companyName?: string }
): Promise<User> {
  const data = await request<{ user: User }>(`/api/become-seller`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.user;
}

export async function updateSellerProfile(
  body: Partial<SellerProfile>
): Promise<User> {
  const data = await request<{ user: User }>(`/api/me/seller`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data.user;
}

// Convenience: persist just the seller's branch locations (PUT /me/seller handles it).
export function updateSellerLocations(
  locations: SellerLocation[]
): Promise<User> {
  return updateSellerProfile({ locations });
}

// ---- seller verification (Get verified) ----
// A seller submits GST/PAN; an admin approves it to grant the verified badge + trust
// seal. POST /api/me/verification returns { request }.
export interface VerificationRequestInput {
  gstNumber?: string;
  panNumber?: string;
  note?: string;
}
export interface VerificationRequest {
  id: string;
  sellerId: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  note?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export async function requestVerification(
  body: VerificationRequestInput
): Promise<VerificationRequest> {
  const data = await request<{ request: VerificationRequest }>(
    `/api/me/verification`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return data.request;
}

// ============================================================
// Categories
// ============================================================
export function getCategories(): Promise<Category[]> {
  return request<Category[]>(`/api/categories`);
}

export function getCategory(slug: string): Promise<CategoryNode> {
  return request<CategoryNode>(`/api/categories/${slug}`);
}

// ============================================================
// Brands  — aggregated from product listings' product.brand  — /api/brands
// ============================================================
export interface Brand {
  name: string;
  slug: string;
  count: number;
  categorySlugs: string[];
  sampleImage: string | null;
}
export interface BrandDetail {
  brand: { name: string; slug: string; count: number };
  listings: Listing[];
}

// Distinct brands, optionally restricted to a (top-level) category slug.
export function getBrands(category?: string): Promise<Brand[]> {
  return request<Brand[]>(`/api/brands${toQuery({ category })}`);
}

// One brand (resolved by slugified name) + its active listings. 404s if unknown.
export function getBrand(slug: string): Promise<BrandDetail> {
  return request<BrandDetail>(`/api/brands/${slug}`);
}

// ============================================================
// Listings
// ============================================================
export interface ListingQuery {
  q?: string;
  type?: ListingType;
  category?: string; // slug
  city?: string;
  state?: string;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  condition?: string; // e.g. "new" | "used" | "refurbished"
  near?: string; // city to compute distance from (near-me)
  radiusKm?: number; // radius for near-me filtering
  sort?:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "rating"
    | "newest"
    | "distance";
  page?: number;
  limit?: number;
}

export function getListings(query: ListingQuery = {}): Promise<ListingsResponse> {
  return request<ListingsResponse>(
    `/api/listings${toQuery(query as Record<string, unknown>)}`
  );
}

export function getListing(id: string): Promise<Listing> {
  return request<Listing>(`/api/listings/${id}`);
}

// ---- multi-vendor-per-product: other sellers offering the SAME product ----
// A single seller "offer" for a product, resolved by shared productKey.
export interface Offer {
  listingId: string;
  sellerId: string;
  seller: {
    id?: string;
    name?: string;
    companyName?: string | null;
    slug?: string | null;
    city?: string | null;
    state?: string | null;
    logo?: string | null;
    isVerified?: boolean;
    rating?: number;
    reviewCount?: number;
    responseRate?: number;
  } | null;
  price: number | null;
  unitOfMeasure: string;
  moq: number | null;
  location: { city?: string | null; state?: string | null } | null;
  availability: string | null;
}

export interface OffersResponse {
  offers: Offer[];
  offerCount: number;
  minPrice: number | null;
}

// Other approved sellers offering the same product (excludes this listing + its seller).
export function getListingOffers(id: string): Promise<OffersResponse> {
  return request<OffersResponse>(`/api/listings/${id}/offers`);
}

// The authenticated seller's OWN listings (every status; not approval-gated).
// Use this for the dashboard instead of the public browse endpoint.
export async function getMyListings(): Promise<Listing[]> {
  const res = await request<{ listings?: Listing[] } | Listing[]>(`/api/me/listings`);
  return Array.isArray(res) ? res : res?.listings || [];
}

export function createListing(body: Partial<Listing>): Promise<Listing> {
  return request<Listing>(`/api/listings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateListing(
  id: string,
  body: Partial<Listing>
): Promise<Listing> {
  return request<Listing>(`/api/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteListing(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/listings/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// AI concierge search
// ============================================================
export function aiSearch(query: string, opts?: { ai?: boolean }): Promise<AiSearchResult> {
  return request<AiSearchResult>(`/api/ai/search`, {
    method: "POST",
    body: JSON.stringify(opts?.ai === false ? { query, ai: false } : { query }),
  });
}

// AI RFQ composer: turn a free-text need into a structured requirement draft.
export function aiRfq(need: string): Promise<any> {
  return request<any>(`/api/ai/rfq`, {
    method: "POST",
    body: JSON.stringify({ need }),
  });
}

// Conversational navigation assistant (chatbot). Rate-limited server-side.
export function assistantChat(
  message: string,
  history?: Array<{ role: string; content: string }>
): Promise<{ reply: string; suggestions: Array<{ label: string; href: string }>; usedAI: boolean; remaining: number }> {
  return request(`/api/assistant/chat`, {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

// Category/search/home ad slots (monetization).
export function getAds(placement: string, category?: string): Promise<any[]> {
  const qs = new URLSearchParams({ placement, ...(category ? { category } : {}) }).toString();
  return request<any[]>(`/api/ads?${qs}`);
}

// ============================================================
// Inquiries / RFQ / Leads
// ============================================================
export function postInquiry(body: Partial<Inquiry>): Promise<Inquiry> {
  return request<Inquiry>(`/api/inquiries`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// authGuard: returns the current seller's delivered leads.
export function getInquiries(): Promise<Lead[]> {
  return request<Lead[]>(`/api/inquiries`);
}

// Body a seller sends when quoting back on an inquiry.
export interface QuoteInput {
  price: number;
  unit?: string;
  moq?: number | null;
  deliveryDays?: number | null;
  note?: string;
  validUntil?: string | null;
}

// Seller: submit (or revise) a quote against an inquiry delivered to them.
export function submitQuote(
  inquiryId: string,
  body: QuoteInput
): Promise<Quote> {
  return request<Quote>(`/api/inquiries/${inquiryId}/quote`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Buyer/admin: the quotes for a single inquiry (enriched with seller minis).
export async function getInquiryQuotes(inquiryId: string): Promise<Quote[]> {
  const res = await request<Quote[] | { quotes?: Quote[] }>(
    `/api/inquiries/${inquiryId}/quotes`
  );
  return Array.isArray(res) ? res : res?.quotes || [];
}

// Buyer: the authenticated buyer's own RFQs, each with its quotes[] + quoteCount.
export async function getMyRfqs(): Promise<Inquiry[]> {
  const res = await request<Inquiry[] | { inquiries?: Inquiry[] }>(
    `/api/inquiries/mine`
  );
  return Array.isArray(res) ? res : res?.inquiries || [];
}

// ============================================================
// Reviews
// ============================================================
export async function getReviews(sellerId: string): Promise<Review[]> {
  // Backend returns { reviews: [...] }; normalize to a bare array so consumers
  // (dashboard ReviewsTab, seller ReviewsPanel) can .map/.reduce safely.
  const res = await request<{ reviews?: Review[] } | Review[]>(
    `/api/reviews${toQuery({ sellerId })}`
  );
  return Array.isArray(res) ? res : res?.reviews || [];
}

export function postReview(body: {
  sellerId: string;
  listingId?: string;
  rating: number;
  reviewText: string;
  title?: string;
}): Promise<Review> {
  return request<Review>(`/api/reviews`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Directory homepage "Recent Activity" — real reviews joined with seller info.
export function getRecentActivity(params: { limit?: number; city?: string } = {}): Promise<RecentActivityItem[]> {
  return request<RecentActivityItem[]>(`/api/reviews/recent${toQuery(params as Record<string, unknown>)}`);
}

// ============================================================
// Trending / Popular searches (Directory homepage)
// ============================================================
export function getTrendingSearches(params: { city?: string; limit?: number } = {}): Promise<SearchTrendItem[]> {
  return request<SearchTrendItem[]>(`/api/search/trending${toQuery(params as Record<string, unknown>)}`);
}

export function getPopularSearches(params: { limit?: number } = {}): Promise<SearchTrendItem[]> {
  return request<SearchTrendItem[]>(`/api/search/popular${toQuery(params as Record<string, unknown>)}`);
}

// ============================================================
// Chat
// ============================================================
export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>(`/api/chat/conversations`);
}

export function createConversation(
  listingId: string,
  toUserId: string
): Promise<Conversation> {
  return request<Conversation>(`/api/chat/conversations`, {
    method: "POST",
    body: JSON.stringify({ listingId, toUserId }),
  });
}

export function getMessages(
  convId: string,
  afterSeq?: number
): Promise<Message[]> {
  return request<Message[]>(
    `/api/chat/conversations/${convId}/messages${toQuery({ afterSeq })}`
  );
}

// ============================================================
// Blogs
// ============================================================
export interface BlogQuery {
  sellerId?: string;
  category?: string;
  tag?: string;
}

export function getBlogs(query: BlogQuery = {}): Promise<Blog[]> {
  return request<Blog[]>(
    `/api/blogs${toQuery(query as Record<string, unknown>)}`
  );
}

export function getBlog(slug: string): Promise<Blog> {
  return request<Blog>(`/api/blogs/${slug}`);
}

export function createBlog(body: Partial<Blog>): Promise<Blog> {
  return request<Blog>(`/api/blogs`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateBlog(id: string, body: Partial<Blog>): Promise<Blog> {
  return request<Blog>(`/api/blogs/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteBlog(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/blogs/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Stories
// ============================================================
export function getStories(): Promise<StoryGroup[]> {
  return request<StoryGroup[]>(`/api/stories`);
}

export function postStory(body: Partial<Story>): Promise<Story> {
  return request<Story>(`/api/stories`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function viewStory(id: string): Promise<{ views: number }> {
  return request<{ views: number }>(`/api/stories/${id}/view`, {
    method: "POST",
  });
}

// ============================================================
// Admin
// ============================================================
export function adminAnalytics(): Promise<Analytics> {
  return request<Analytics>(`/api/admin/analytics`);
}

export function adminUsers(): Promise<User[]> {
  return request<User[]>(`/api/admin/users`);
}

export function adminSellers(status?: SellerStatus | "all"): Promise<User[]> {
  return request<User[]>(`/api/admin/sellers${toQuery({ status })}`);
}

export function adminApprove(id: string): Promise<User> {
  return request<User>(`/api/admin/sellers/${id}/approve`, { method: "PUT" });
}

export function adminReject(id: string): Promise<User> {
  return request<User>(`/api/admin/sellers/${id}/reject`, { method: "PUT" });
}

export function adminSuspend(id: string): Promise<User> {
  return request<User>(`/api/admin/sellers/${id}/suspend`, { method: "PUT" });
}

export function adminMonetization(
  id: string,
  body: Record<string, unknown>
): Promise<User> {
  return request<User>(`/api/admin/sellers/${id}/monetization`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---- plans ----
export function adminPlans(): Promise<SubscriptionPlan[]> {
  return request<SubscriptionPlan[]>(`/api/admin/plans`);
}
export function adminCreatePlan(
  body: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan> {
  return request<SubscriptionPlan>(`/api/admin/plans`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdatePlan(
  id: string,
  body: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan> {
  return request<SubscriptionPlan>(`/api/admin/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---- ad slots ----
export function adminAdSlots(): Promise<AdSlot[]> {
  return request<AdSlot[]>(`/api/admin/ad-slots`);
}
export function adminCreateAdSlot(body: Partial<AdSlot>): Promise<AdSlot> {
  return request<AdSlot>(`/api/admin/ad-slots`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateAdSlot(
  id: string,
  body: Partial<AdSlot>
): Promise<AdSlot> {
  return request<AdSlot>(`/api/admin/ad-slots/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---- ad bookings ----
export function adminAdBookings(): Promise<AdBooking[]> {
  return request<AdBooking[]>(`/api/admin/ad-bookings`);
}
export function adminCreateAdBooking(
  body: Partial<AdBooking>
): Promise<AdBooking> {
  return request<AdBooking>(`/api/admin/ad-bookings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---- payments ----
export function adminPayments(): Promise<PaymentRecord[]> {
  return request<PaymentRecord[]>(`/api/admin/payments`);
}
export function adminCreatePayment(
  body: Partial<PaymentRecord>
): Promise<PaymentRecord> {
  return request<PaymentRecord>(`/api/admin/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdatePayment(
  id: string,
  body: Partial<PaymentRecord>
): Promise<PaymentRecord> {
  return request<PaymentRecord>(`/api/admin/payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ---- settings ----
export function adminSettings(): Promise<AdminSettings> {
  return request<AdminSettings>(`/api/admin/settings`);
}
export function adminUpdateSettings(
  body: Partial<AdminSettings>
): Promise<AdminSettings> {
  return request<AdminSettings>(`/api/admin/settings`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ============================================================
// Site config (public, admin-editable)  — GET /api/config
// ============================================================
export interface Branding {
  siteName?: string;
  tagline?: string;
  logoText?: string;
  logoUrl?: string;
  accentBlue?: string;
  accentOrange?: string;
  [key: string]: unknown;
}
export interface HomepageConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  heroExamples?: string[];
  featuredCategorySlugs?: string[];
  showStories?: boolean;
  showTrending?: boolean;
  showFeaturedSellers?: boolean;
  showCategoryGrid?: boolean;
  [key: string]: unknown;
}
export interface ContactConfig {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  [key: string]: unknown;
}
export interface FooterConfig {
  about?: string;
  [key: string]: unknown;
}
export type FeatureFlags = Record<string, boolean>;

export interface SiteConfig {
  branding: Branding;
  homepage: HomepageConfig;
  featureFlags: FeatureFlags;
  contact: ContactConfig;
  footer: FooterConfig;
}

export function getConfig(): Promise<SiteConfig> {
  return request<SiteConfig>(`/api/config`);
}

// ============================================================
// Feature catalog (public read; admin CRUD)  — /api/features
// ============================================================
export interface Feature {
  id: string;
  name: string;
  group: string;
  description?: string;
  audience?: string; // "buyer" | "seller" | "admin" | "all"
  plans?: PlanTier[] | string[];
  status?: string; // "live" | "beta" | "planned" | ...
  phase?: number;
  [key: string]: unknown;
}
export interface FeatureQuery {
  group?: string;
  audience?: string;
  status?: string;
  plan?: string;
}

export function getFeatures(query: FeatureQuery = {}): Promise<Feature[]> {
  return request<Feature[]>(
    `/api/features${toQuery(query as Record<string, unknown>)}`
  );
}
export function adminCreateFeature(body: Partial<Feature>): Promise<Feature> {
  return request<Feature>(`/api/features`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateFeature(
  id: string,
  body: Partial<Feature>
): Promise<Feature> {
  return request<Feature>(`/api/features/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
export function adminDeleteFeature(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/features/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Notifications  — /api/notifications (authGuard)
// ============================================================
export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
export interface NotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function getNotifications(): Promise<NotificationsResult> {
  return request<NotificationsResult>(`/api/notifications`);
}
export function markNotificationRead(
  id: string
): Promise<{ notification: NotificationItem }> {
  return request<{ notification: NotificationItem }>(
    `/api/notifications/${id}/read`,
    { method: "PUT" }
  );
}
export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request<{ updated: number }>(`/api/notifications/read-all`, {
    method: "PUT",
  });
}

// ============================================================
// Follow graph  — /api/follow
// ============================================================
export interface FollowUserInfo {
  id: string;
  name?: string;
  avatarUrl?: string | null;
  city?: string | null;
  state?: string | null;
  sellerProfile?: {
    companyName?: string | null;
    slug?: string | null;
    logo?: string | null;
  };
}
export interface FollowingEntry {
  followingId: string;
  createdAt: string;
  user: FollowUserInfo | null;
}
export interface FollowerEntry {
  followerId: string;
  createdAt: string;
  user: FollowUserInfo | null;
}
export interface FollowingResult {
  following: FollowingEntry[];
  count: number;
}
export interface FollowersResult {
  followers: FollowerEntry[];
  count: number;
}

export function followUser(id: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>(`/api/follow/${id}`, {
    method: "POST",
  });
}
export function unfollowUser(id: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>(`/api/follow/${id}`, {
    method: "DELETE",
  });
}
export function getFollowing(): Promise<FollowingResult> {
  return request<FollowingResult>(`/api/follow/me`);
}
export function getFollowers(id: string): Promise<FollowersResult> {
  return request<FollowersResult>(`/api/follow/${id}/followers`);
}
export function getFollowStatus(id: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>(`/api/follow/${id}/status`);
}

// ============================================================
// Referral  — /api/referral
// ============================================================
export interface ReferralSummary {
  code: string;
  credits: number;
  invitedCount: number;
}
export interface RedeemResult {
  ok: boolean;
  referrer: {
    userId: string;
    code: string;
    credits: number;
    invitedCount: number;
  };
}

export function getReferralCode(): Promise<ReferralSummary> {
  return request<ReferralSummary>(`/api/referral/my-code`);
}
export function redeemReferral(code: string): Promise<RedeemResult> {
  return request<RedeemResult>(`/api/referral/redeem`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// ============================================================
// Stories — highlights  — /api/stories
// ============================================================
export function highlightStory(id: string): Promise<Story> {
  return request<Story>(`/api/stories/${id}/highlight`, { method: "PUT" });
}
export function getHighlights(sellerId: string): Promise<Story[]> {
  return request<Story[]>(`/api/stories/highlights${toQuery({ sellerId })}`);
}

// ============================================================
// AI auto-fill (draft a listing from a photo)  — POST /api/ai/autofill
// ============================================================
export interface AiAutofillInput {
  imageUrl?: string;
  imageBase64?: string;
  hint?: string;
}
export interface AiAutofillDraft {
  title?: string;
  description?: string;
  categorySlug?: string;
  keywords?: string[];
  specifications?: Record<string, string>;
  type?: ListingType;
  fallback: boolean;
  note?: string;
  [key: string]: unknown;
}

export function aiAutofill(body: AiAutofillInput): Promise<AiAutofillDraft> {
  return request<AiAutofillDraft>(`/api/ai/autofill`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ============================================================
// Reports  — user report + admin moderation queue
// ============================================================
export type ReportStatus = "open" | "resolved" | "dismissed";
export interface Report {
  id: string;
  listingId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

// POST /api/reports → data.report — unwrap to the Report.
export async function reportListing(body: {
  listingId: string;
  reason: string;
  details?: string;
}): Promise<Report> {
  const data = await request<{ report: Report }>(`/api/reports`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.report;
}
export function adminGetReports(
  status?: ReportStatus | "all"
): Promise<Report[]> {
  return request<Report[]>(`/api/admin/reports${toQuery({ status })}`);
}
export function adminResolveReport(id: string): Promise<Report> {
  return request<Report>(`/api/admin/reports/${id}/resolve`, { method: "PUT" });
}
export function adminDismissReport(id: string): Promise<Report> {
  return request<Report>(`/api/admin/reports/${id}/dismiss`, { method: "PUT" });
}

// ============================================================
// Profile (general user fields)  — PUT /api/me/profile
// ============================================================
export interface ProfileInput {
  name?: string;
  avatarUrl?: string | null;
  city?: string;
  state?: string;
  interests?: string[]; // category slugs
  contactVisibility?: "public" | "on_request" | "hidden";
}

// PUT /api/me/profile → data.user — unwrap to the User.
export async function updateProfile(body: ProfileInput): Promise<User> {
  const data = await request<{ user: User }>(`/api/me/profile`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data.user;
}

// ============================================================
// Listings — mark sold  — PUT /api/listings/:id/sold
// ============================================================
export function markListingSold(id: string): Promise<Listing> {
  return request<Listing>(`/api/listings/${id}/sold`, { method: "PUT" });
}

// ============================================================
// Bulk catalog upload  — POST /api/listings/bulk (authGuard)
// Non-technical sellers add many products at once from a CSV. The client parses the
// CSV into plain row objects (template columns: title, type, category_slug, price,
// unit, moq, brand, description, city, state, pan_india) and posts them here; the
// backend validates + creates each row, returning how many were created plus any
// per-row errors. `row` is the 1-based index into the array that was sent.
// ============================================================
export interface BulkUploadError {
  row: number;
  message: string;
}
export interface BulkUploadResult {
  created: number;
  errors: BulkUploadError[];
}

export function bulkCreateListings(
  rows: Record<string, string>[]
): Promise<BulkUploadResult> {
  return request<BulkUploadResult>(`/api/listings/bulk`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

// ============================================================
// Admin categories (no-code taxonomy)  — /api/admin/categories
// ============================================================
export function adminCreateCategory(
  body: Partial<Category>
): Promise<Category> {
  return request<Category>(`/api/admin/categories`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export function adminUpdateCategory(
  id: string,
  body: Partial<Category>
): Promise<Category> {
  return request<Category>(`/api/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
export function adminDeleteCategory(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}

// ============================================================
// Category suggestions ("Other / not listed")  — /api/category-suggestions
// Seller proposes a missing category name; admin approves / merges / rejects.
// ============================================================
export type CategorySuggestionStatus =
  | "pending"
  | "approved"
  | "merged"
  | "rejected";

export interface CategorySuggestion {
  id: string;
  name: string;
  note?: string;
  context?: string;
  suggestedBy: string;
  status: CategorySuggestionStatus;
  count: number;
  createdAt: string;
  updatedAt?: string;
  categoryId?: string; // set when approved
  mergedInto?: string; // set when merged
  decidedBy?: string;
  decidedAt?: string;
}

// Seller-facing: propose a category name. Any signed-in user may call this.
export function suggestCategory(body: {
  name: string;
  note?: string;
  context?: string;
}): Promise<CategorySuggestion> {
  return request<CategorySuggestion>(`/api/category-suggestions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Admin: triage queue (optional status filter), newest first.
export function getCategorySuggestions(
  status?: CategorySuggestionStatus | "all"
): Promise<CategorySuggestion[]> {
  return request<CategorySuggestion[]>(
    `/api/category-suggestions${toQuery({ status: status && status !== "all" ? status : undefined })}`
  );
}

// Admin: approve — mint a real category (optionally under a parent).
export function approveCategorySuggestion(
  id: string,
  parentId?: string
): Promise<{ category: Category; suggestion: CategorySuggestion }> {
  return request<{ category: Category; suggestion: CategorySuggestion }>(
    `/api/category-suggestions/${id}/approve`,
    {
      method: "POST",
      body: JSON.stringify(parentId ? { parentId } : {}),
    }
  );
}

// Admin: merge — map the suggestion onto an existing category.
export function mergeCategorySuggestion(
  id: string,
  categoryId: string
): Promise<CategorySuggestion> {
  return request<CategorySuggestion>(
    `/api/category-suggestions/${id}/merge`,
    {
      method: "POST",
      body: JSON.stringify({ categoryId }),
    }
  );
}

// Admin: reject — dismiss the suggestion.
export function rejectCategorySuggestion(
  id: string
): Promise<CategorySuggestion> {
  return request<CategorySuggestion>(
    `/api/category-suggestions/${id}/reject`,
    { method: "POST" }
  );
}

// ============================================================
// Image uploads  — POST /api/uploads (authGuard)
// Accepts a base64 data URL (from a phone camera/gallery), stores it under
// frontend/public/uploads/ and returns a "/uploads/<name>" URL Next serves statically.
// ============================================================
export function uploadImage(dataUrl: string): Promise<{ url: string }> {
  return request<{ url: string }>(`/api/uploads`, {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}

// ============================================================
// Self-serve advertising (seller)  — /api/my-ads
// A seller submits a campaign; it is stored as "pending" and stays invisible on the
// public ad slider until an admin activates it in the admin Ads tab.
// ============================================================
export type AdPlacementType = "category_top" | "search_top" | "home_hero";

export interface MyAdInput {
  placementType: AdPlacementType;
  categoryIds?: string[]; // empty / omitted = all categories
  listingId?: string | null;
  creativeImageUrl: string;
  headline: string;
  targetUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface MyAd {
  id: string;
  placementType?: string;
  sellerId: string;
  listingId?: string | null;
  categoryIds?: string[];
  creativeImageUrl?: string | null;
  headline?: string | null;
  targetUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  priority?: number;
  amount?: number | null;
  status: string; // "pending" | "active" | "scheduled" | "paused" | "booked"
  createdAt: string;
  [key: string]: unknown;
}

export function createMyAd(body: MyAdInput): Promise<MyAd> {
  return request<MyAd>(`/api/my-ads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getMyAds(): Promise<MyAd[]> {
  // Backend returns a bare array; normalize defensively so consumers can .map safely.
  const res = await request<MyAd[] | { adBookings?: MyAd[] }>(`/api/my-ads`);
  return Array.isArray(res) ? res : res?.adBookings || [];
}

// ============================================================
// Entitlements — composed tier × feature matrix  — /api/entitlements
// Single source of truth for runtime gating + the public "What we offer" page.
// ============================================================
export interface EntitlementTierLimits {
  listingLimit: number | null;
  leadQuotaPerCycle: number | null;
  featuredCreditsPerCycle: number | null;
  verifiedBadgeIncluded: boolean;
  analyticsEnabled: boolean;
  perLeadPrice: number | null;
  priceInfo?: { monthly?: number; currency?: string; label?: string } | null;
}
export interface EntitlementTier {
  key: string; // "free" | "silver" | "gold"
  name: string;
  tierRank: number;
  limits: EntitlementTierLimits;
}
export interface EntitlementFeature {
  id: string;
  name: string;
  group: string;
  description?: string;
  status: string; // "live" | "beta" | "planned"
  plans: string[]; // tiers that include this feature
}
export interface Entitlements {
  tiers: EntitlementTier[];
  features: EntitlementFeature[];
}

export function getEntitlements(): Promise<Entitlements> {
  return request<Entitlements>(`/api/entitlements`);
}

// ============================================================
// Collections ("Concepts") — admin-curated merchandising collections
// PUBLIC read: /api/collections (directory) + /api/collections/:slug (landing)
// ============================================================
export interface Collection {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  coverImage?: string | null;
  listingIds?: string[];
  categorySlugs?: string[];
  brandSlugs?: string[];
  order?: number;
  status?: "published" | "draft";
  createdAt?: string;
  // computed by the backend for the directory / landing hero
  itemCount: number;
  previewImages: string[];
}

// A single collection's landing payload: the collection + its fully resolved listings.
export interface CollectionDetail extends Collection {
  listings: Listing[];
}

// Published collections for the /collections directory.
export function getCollections(): Promise<Collection[]> {
  return request<Collection[]>(`/api/collections`);
}

// One published collection (by slug) + its resolved listings. 404s if unknown/draft.
export function getCollection(slug: string): Promise<CollectionDetail> {
  return request<CollectionDetail>(`/api/collections/${slug}`);
}

// ============================================================
// Shortlist (buyer's saved products)  — /api/shortlist (authGuard)
// Server-persisted for logged-in users; the frontend falls back to a localStorage
// shortlist for guests (see lib/shortlist.tsx). GET resolves the saved ACTIVE
// listings with the same flat seller mini the browse endpoint returns.
// ============================================================
export interface ShortlistResult {
  ids: string[];
  listings: Listing[];
}

// The signed-in user's saved listing ids (newest-saved first) + resolved listings.
export function getShortlist(): Promise<ShortlistResult> {
  return request<ShortlistResult>(`/api/shortlist`);
}

// Add a listing to the shortlist (idempotent); returns the updated id list.
export function addToShortlist(listingId: string): Promise<{ ids: string[] }> {
  return request<{ ids: string[] }>(`/api/shortlist`, {
    method: "POST",
    body: JSON.stringify({ listingId }),
  });
}

// Remove a listing from the shortlist (idempotent); returns the updated id list.
export function removeFromShortlist(listingId: string): Promise<{ ids: string[] }> {
  return request<{ ids: string[] }>(`/api/shortlist/${listingId}`, {
    method: "DELETE",
  });
}

// ============================================================
// Seller analytics  — GET /api/me/analytics (authGuard)
// A performance snapshot computed on read from the seller's listings, the lead
// ledger, inquiries and approved reviews. Powers the dashboard Analytics tab.
// ============================================================
export interface AnalyticsListingRow {
  id: string;
  title: string;
  views: number;
  leads: number;
}
export interface SellerAnalytics {
  totalListings: number;
  activeListings: number;
  featuredListings: number;
  totalViews: number;
  totalLeads: number;
  openInquiries: number;
  reviewCount: number;
  avgRating: number;
  responseRate: number;
  listings: AnalyticsListingRow[];
}

export function getMyAnalytics(): Promise<SellerAnalytics> {
  return request<SellerAnalytics>(`/api/me/analytics`);
}

// ============================================================
// Self-serve boosts (seller)  — /api/boosts (authGuard)
// A seller requests to promote one of their listings (feature / top-of-category /
// rank) for N days. The request is created PENDING; an admin approves it, which
// applies the boost to the listing. Approved requests read back as "active".
// ============================================================
export type BoostType = "feature" | "category_top" | "rank";

export interface BoostRequestInput {
  listingId: string;
  boostType: BoostType;
  days: number;
}

export interface BoostRequest {
  id: string;
  sellerId: string;
  listingId: string;
  boostType: BoostType;
  days: number;
  amount: number | null;
  status: string; // "pending" | "active" | "rejected"
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  // enriched by the backend
  listingTitle?: string | null;
  boostLabel?: string;
  [key: string]: unknown;
}

export function createBoostRequest(body: BoostRequestInput): Promise<BoostRequest> {
  return request<BoostRequest>(`/api/boosts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getMyBoosts(): Promise<BoostRequest[]> {
  const res = await request<BoostRequest[] | { boosts?: BoostRequest[] }>(
    `/api/boosts`
  );
  return Array.isArray(res) ? res : res?.boosts || [];
}

// ============================================================
// Consultations — "Hire verified experts"  — /api/experts, /api/consultations
// A directory of EXPERTS (people/firms you hire), distinct from the product
// Directory above. Guest-friendly: booking needs no auth, but we still send a
// Bearer token when one is present so a logged-in user's lead is attributed.
// ============================================================

// Query params accepted by the expert directory. All optional; empties are dropped.
export interface ExpertsQuery {
  profession?: string; // professionKey
  city?: string;
  mode?: string; // "video" | "phone" | "in-person"
  language?: string;
  q?: string; // keyword
  sort?: string; // "rating" | "experience" | "priceLow" | "priceHigh" | "newest"
}

// List experts + the filter facets (professions/cities) the UI's dropdowns need.
// request<T> unwraps to json.data and DROPS meta, so we do a RAW fetch here to keep
// the meta block. Mirrors request()'s auth + no-store behaviour.
export async function getExperts(
  query: ExpertsQuery = {}
): Promise<{ experts: ConsultationExpert[]; meta: ExpertsMeta }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `${BASE_URL}/api/experts${toQuery(query as Record<string, unknown>)}`,
    { cache: "no-store", headers }
  );

  let json:
    | { success: boolean; data: ConsultationExpert[]; meta?: ExpertsMeta; error?: string }
    | undefined;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!res.ok || !json || !json.success) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  return {
    experts: json.data || [],
    meta: json.meta || { professions: [], cities: [] },
  };
}

// One expert's full profile (packages, credentials, case studies, reviews). 404s
// surface as a thrown Error the profile page turns into a "not found" state.
export function getExpert(slug: string): Promise<ConsultationExpertDetail> {
  return request<ConsultationExpertDetail>(`/api/experts/${slug}`);
}

// Submit a consultation/booking request (lead only — NO payment). Returns 201 with
// the created booking. Sends Bearer if present; works for guests otherwise.
export function bookConsultation(body: BookingBody): Promise<any> {
  return request<any>(`/api/consultations/book`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Incoming consultation requests for the logged-in EXPERT (authGuard on the server;
// returns only bookings where expertId === the caller). Newest first.
export function getMyConsultationBookings(): Promise<ConsultationBooking[]> {
  return request<ConsultationBooking[]>(`/api/consultations/bookings`);
}
