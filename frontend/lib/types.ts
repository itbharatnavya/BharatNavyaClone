// BharatSource v2 — shared TypeScript types.
// These mirror the backend v2 JSON shapes (DESIGN.md §3 / BUILD-SPEC "Data shapes").
// Fields the backend may or may not denormalize are marked optional so foundation
// components can read them defensively.

// ============================================================
// Common
// ============================================================
export interface Location {
  city: string;
  state: string;
  pincode?: string;
  // Set on a listing that serves the whole country. When true, city/state may be
  // absent — read this flag first for display and filtering.
  panIndia?: boolean;
}

// A seller branch / business location. Sellers can have several; each listing may be
// assigned to one (the backend denormalizes its city/state/pincode onto the listing).
export interface SellerLocation {
  id: string;
  label: string;
  city: string;
  state: string;
  pincode?: string;
  address?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: string;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================
// User & Seller profile (unified identity)
// ============================================================
export type Role = "user" | "admin";
export type SellerStatus = "approved" | "pending" | "rejected" | "suspended";
export type PlanTier = "free" | "silver" | "gold";
export type PlanStatus = "active" | "inactive" | "expired" | "trial";
export type PriorityTier = "none" | "premium" | "star" | "leader";

export interface SellerPerformance {
  onTimeDelivery?: number;
  avgResponseTimeHours?: number;
  repeatBuyers?: number;
  orderCompletion?: number;
  performanceScore?: number;
}

export interface SellerProfile {
  companyName: string;
  slug: string;
  about?: string;
  logo?: string | null;
  coverImage?: string | null;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  employeeCount?: string | null;
  certifications: string[];
  website?: string | null;
  contactMobile?: string;
  contactEmail?: string;
  location?: Location;
  locations?: SellerLocation[];
  // Lightweight "where you serve" list — cities/states the seller operates in
  // (distinct from physical branches in `locations`).
  serviceAreas?: { state: string; city: string }[];
  legacyCategories?: string[];
  status: SellerStatus;
  isVerified: boolean;
  trustSealVerified: boolean;
  verifiedBadgeExpiry?: string | null;
  rating: number;
  reviewCount: number;
  responseRate: number;
  performance?: SellerPerformance;

  // ---- monetization ----
  planId?: string | null;
  planTier: PlanTier;
  planStartDate?: string | null;
  planEndDate?: string | null;
  planStatus?: PlanStatus;
  listingLimit?: number | null;
  leadQuotaPerCycle?: number | null;
  leadsConsumed: number;
  leadQuotaResetDate?: string | null;
  featuredCredits: number;
  perLeadPrice?: number | null;
  rankBoostScore: number;
  priorityTier: PriorityTier;
  isFeaturedSeller: boolean;
  featuredStartDate?: string | null;
  featuredEndDate?: string | null;
  boostCategoryIds: string[];
  boostKeywords: string[];
  boostGeoLocations: string[];
  analyticsEnabled: boolean;
  accountManagerId?: string | null;
  adminNotes?: string | null;
}

export interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  city?: string;
  state?: string;
  roles: Role[];
  sellerProfile?: SellerProfile | null;
  employerProfile?: EmployerProfile | null;
  candidateProfile?: CandidateProfile | null;
  // Recruitment role lock — once set, recruitmentRoleLockedAt is non-null and the
  // opposite profile-mutating endpoint (become-employer / PUT me/candidate) 403s.
  recruitmentRole?: "candidate" | "recruiter" | null;
  recruitmentRoleLockedAt?: string | null;
  // Account-level suspend (ADMIN-CONSOLE.md). Undefined/"active" = normal;
  // "suspended" blocks login + every authenticated request server-side.
  status?: "active" | "suspended";
  legacy?: boolean;
  createdAt: string;
}

// Public seller page: profile + their listings (+ optional reviews / blogs).
export interface SellerPublicProfile {
  id: string;
  name: string;
  avatarUrl?: string | null;
  city?: string;
  state?: string;
  seller: SellerProfile;
  listings: Listing[];
  reviews?: Review[];
  blogs?: Blog[];
}

// ============================================================
// Listing (product | service)
// ============================================================
export type ListingType = "product" | "service";
export type ListingStatus =
  | "active"
  | "inactive"
  | "pending"
  | "draft"
  | "sold"
  | "rejected";

// ============================================================
// Listing AI verification (backend/lib/listingVerification.js)
// ============================================================
export type ListingVerificationStatus =
  | "auto_approved"
  | "needs_review"
  | "admin_approved"
  | "rejected";

export interface ListingVerificationCheck {
  key: string;
  pass: boolean;
  detail: string;
}

export interface ListingVerificationAI {
  score: number;
  contentOk: boolean;
  imagePlausible: boolean;
  flags: string[];
  reason: string;
}

export interface ListingVerification {
  status: ListingVerificationStatus;
  score: number;
  aiRan: boolean;
  deterministicChecks: ListingVerificationCheck[];
  ai: ListingVerificationAI | null;
  summary: string;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}
export type PricingModel = "fixed" | "hourly" | "quote";
export type BookingType = "instant" | "enquiry" | "quote";

export interface MediaItem {
  type?: "image" | "video";
  url: string;
  alt?: string;
}

export interface PriceTier {
  minQty: number;
  maxQty?: number | null;
  price: number;
  unit?: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface ProductDetail {
  sku?: string | null;
  price?: number | null;
  currency: string;
  priceTiers: PriceTier[];
  unitOfMeasure?: string;
  moq?: number | null;
  stockQty?: number | null;
  availability?: string;
  leadTime?: string | null;
  specifications: Record<string, string>;
  certifications: string[];
  variants: ProductVariant[];
  sampleAvailable: boolean;
}

export interface RateCardItem {
  label: string;
  price: number;
  unit?: string;
}

export interface ServiceDetail {
  rateCard: RateCardItem[];
  pricingModel: PricingModel;
  serviceArea: string[];
  serviceMode?: string; // onsite | remote | hybrid
  availabilitySchedule?: string;
  credentials: string[];
  experienceYears?: number;
  teamSize?: number | null;
  portfolio: MediaItem[];
  sla?: string | null;
  warranty?: string | null;
  bookingType: BookingType;
}

// Lightweight seller info the backend may denormalize onto a listing (for cards).
export interface ListingSeller {
  id: string;
  name?: string;
  companyName?: string;
  slug?: string;
  city?: string;
  state?: string;
  logo?: string | null;
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  type: ListingType;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  legacyCategory?: string;
  categoryPath: string[];
  keywords: string[];
  media: MediaItem[];
  location: Location;
  // Normalized grouping key (slugify(brand + title)) that ties together the SAME
  // product offered by multiple sellers. Stamped by the backend on create/update.
  productKey?: string;
  locationId?: string; // the seller branch this listing is assigned to (if any)
  // PAN India — listing serves all of India (no single city). Mutually exclusive
  // with a branch/serviceCities primary location for filtering purposes.
  panIndia?: boolean;
  // Explicit multi-city coverage chosen at listing time; the first also seeds the
  // primary `location` for display.
  serviceCities?: { state: string; city: string }[];
  status: ListingStatus;

  // trust / discovery
  rating: number;
  reviewCount: number;
  isVerifiedSeller: boolean;

  // monetization
  isFeatured: boolean;
  featuredStartDate?: string | null;
  featuredEndDate?: string | null;
  rankBoostScore: number;
  isSponsored: boolean;
  boostToTopLastUsed?: string | null;
  manualPinRank?: number | null;

  product?: ProductDetail | null;
  service?: ServiceDetail | null;

  // AI verification gate — stamped on create, updated by admin approve/reject/reverify.
  verification?: ListingVerification | null;

  // convenience (may be denormalized by the API)
  seller?: ListingSeller;
  sellerName?: string;

  createdAt: string;
}

// ============================================================
// Category (nested tree)
// ============================================================
export type CategoryType = "product" | "service" | "both";

export interface FacetOption {
  value: string;
  label?: string;
  count?: number;
}

export interface Facet {
  key: string;
  label: string;
  type?: "checkbox" | "range" | "toggle" | "chips";
  options?: FacetOption[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  path: string[];
  type: CategoryType;
  icon?: string;
  description?: string;
  facets: Facet[];
  listingCount: number;
  order: number;
  children?: Category[];
}

// GET /categories/:slug → node + children + ancestors + facets
export interface CategoryNode {
  category: Category;
  children: Category[];
  ancestors: Category[];
  facets: Facet[];
}

// ============================================================
// Inquiry / RFQ / Lead
// ============================================================
export type InquiryKind = "product" | "service" | "rfq";
export type InquiryStatus =
  | "new"
  | "open"
  | "contacted"
  | "quoted"
  | "closed";

export interface Inquiry {
  id: string;
  buyerId?: string | null;
  buyerName: string;
  buyerMobile: string;
  buyerEmail?: string;
  company?: string;
  productName?: string;
  listingId?: string | null;
  sellerId?: string | null;
  categoryId?: string | null;
  kind?: InquiryKind;
  intent?: string | null;
  productSpec?: string;
  quantity?: string;
  unit?: string;
  deliveryLocation?: string;
  timeline?: string;
  targetBudget?: string | null;
  message: string;
  status: InquiryStatus;
  // Set true when a broad RFQ matched zero sellers at submit time (novel
  // category/product); admin's "Unmatched RFQs" queue can forward it to a
  // seller, which flips this back to false.
  unmatched?: boolean;
  stage?: string;
  createdAt: string;

  // The seller(s) this RFQ was delivered to, each with their own contact
  // status (populated by GET /api/inquiries/mine for the buyer, and by
  // admin's RFQ Log). A seller's OWN list (GET /api/inquiries) instead gets
  // these fields flattened directly onto the row — see RfqDeliveryRow.
  sellers?: SellerDelivery[];
}

// A "Connect" (Call/WhatsApp) action a seller can take on an RFQ delivered to
// them, replacing the old quote-back flow — see routes/inquiries.js's POST
// /leads/:leadId/contact. `contactedAt`/`contactedVia` are null until acted on.
export type ContactChannel = "call" | "whatsapp";

// One seller delivery of an RFQ, as seen by the buyer or an admin — a flat
// seller mini plus this specific lead's contact status.
export interface SellerDelivery {
  sellerId: string;
  leadId: string;
  deliveredDate: string;
  contactedAt: string | null;
  contactedVia: ContactChannel | null;
  companyName: string | null;
  slug: string | null;
  city: string | null;
  rating: number;
  isVerified: boolean;
}

export interface Lead {
  leadId: string;
  sellerId: string;
  buyerId?: string | null;
  listingId?: string | null;
  inquiryId?: string | null;
  leadType: string;
  deliveredDate: string;
  status: string;
  contactedAt?: string | null;
  contactedVia?: ContactChannel | null;
}

// ============================================================
// Review
// ============================================================
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  sellerId: string;
  listingId?: string | null;
  buyerId?: string | null;
  buyerName: string;
  rating: number;
  reviewText: string;
  status: ReviewStatus;
  createdAt: string;
}

// Directory homepage "Trending searches" / "Popular searches" — see
// backend/routes/searchTrends.js. `isFallback` marks a curated demo entry
// used to pad out real search-event aggregation so the section is never
// empty; `count` is 0 for those.
export interface SearchTrendItem {
  query: string;
  categorySlug: string | null;
  count: number;
  isFallback: boolean;
}

// Directory homepage "Recent Activity" — GET /api/reviews/recent, a review
// joined with the reviewed seller's business info + a representative photo.
export interface RecentActivityItem {
  reviewId: string;
  rating: number;
  reviewText: string;
  createdAt: string;
  buyerName: string;
  buyerAvatarUrl: string | null;
  sellerId: string;
  sellerSlug: string | null;
  sellerName: string;
  sellerCity: string;
  whatsappNumber: string | null;
  image: string | null;
}

// ============================================================
// Reach tools — Blog & Story
// ============================================================
export type BlogStatus = "draft" | "published";

// Author denormalized server-side (backend/routes/blogs.js's attachAuthors) — present
// once the author has a sellerProfile or employerProfile; absent (undefined) otherwise.
export interface BlogAuthor {
  sellerId: string;
  type: "seller" | "employer";
  slug: string | null;
  companyName: string | null;
  logo: string | null;
  city: string | null;
  isVerified: boolean;
}

export interface Blog {
  id: string;
  sellerId: string;
  authorName?: string;
  sellerSlug?: string | null;
  authorType?: "seller" | "employer";
  author?: BlogAuthor;
  title: string;
  slug: string;
  coverImage?: string | null;
  excerpt?: string;
  body: string; // markdown
  categoryId?: string | null;
  tags: string[];
  status: BlogStatus;
  publishedAt?: string | null;
  views: number;
  createdAt: string;
}

export interface StoryMedia {
  type: "image" | "video";
  url: string;
}

export interface Story {
  id: string;
  sellerId: string;
  authorType?: "seller" | "employer";
  media: StoryMedia;
  caption?: string;
  linkListingId?: string | null;
  createdAt: string;
  expiresAt: string; // 24h
  views: number;
  isHighlight?: boolean;
}

// GET /stories returns active stories grouped by seller.
export interface StoryGroup {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  stories: Story[];
  hasUnseen?: boolean;
}

// ============================================================
// Chat
// ============================================================
export interface ConversationParticipant {
  id: string;
  name?: string;
  avatarUrl?: string | null;
}

export interface Conversation {
  id: string;
  participants: string[]; // two user ids
  participantsInfo?: ConversationParticipant[];
  listingId?: string | null;
  listingTitle?: string;
  lastMsgSeq: number;
  lastMsgAt?: string | null;
  preview?: string;
  unread?: number;
}

export interface Message {
  seq: number;
  clientMsgId?: string;
  from: string;
  ts: string;
  body: string;
}

// ============================================================
// Monetization
// ============================================================
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: PlanTier;
  price: number;
  currency: string;
  billingCycle?: "monthly" | "quarterly" | "yearly";
  listingLimit?: number | null;
  leadQuota?: number | null;
  featuredCredits?: number;
  perLeadPrice?: number | null;
  features: string[];
  highlighted?: boolean;
  order?: number;
  active?: boolean;
}

export interface AdSlot {
  id: string;
  name: string;
  placement: string; // home_hero | category_top | ...
  page?: string;
  dimensions?: string;
  basePrice: number;
  currency: string;
  active: boolean;
  createdAt: string;
}

export type AdBookingStatus = "pending" | "active" | "expired" | "cancelled";

export interface AdBooking {
  id: string;
  slotId: string;
  sellerId: string;
  listingId?: string | null;
  creativeUrl?: string | null;
  targetUrl?: string | null;
  startDate: string;
  endDate: string;
  status: AdBookingStatus;
  paymentRecordId?: string | null;
  createdAt: string;
}

export type PaymentStatus =
  | "pending"
  | "paid"
  | "waived"
  | "refunded"
  | "failed";

export interface PaymentRecord {
  id: string;
  sellerId: string;
  userId?: string | null;
  purpose: string; // plan | featured | ad | lead
  refId?: string | null;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  method?: string;
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string;
  createdAt: string;
}

export interface AdminSettings {
  ranking?: Record<string, number>;
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface Analytics {
  totalUsers: number;
  totalSellers: number;
  totalListings: number;
  totalInquiries: number;
  totalLeads?: number;
  pendingSellers?: number;
  pendingReviews?: number;
  activeSubscriptions?: number;
  revenue?: number;
  inquiriesToday?: number;
  monthly?: { month: string; count: number }[];
  [key: string]: unknown;
}

// ============================================================
// Listings response (paginated + facets)
// ============================================================
export interface ListingFacets {
  categories?: FacetOption[];
  cities?: FacetOption[];
  states?: FacetOption[];
  priceTiers?: FacetOption[];
  types?: FacetOption[];
  [key: string]: FacetOption[] | undefined;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
  facets?: ListingFacets;
}

// ============================================================
// Auth results
// ============================================================
export interface AuthResult {
  token: string;
  user: User;
}

// ============================================================
// AI concierge search
// ============================================================
export type AiSearchMode = "list" | "navigate" | "clarify";

export interface AiSearchParsed {
  intent?: string;
  category?: string | null;
  location?: string | null;
  serviceType?: string | null;
  productType?: string | null;
  budget?: number | null;
  attributes?: Record<string, unknown>;
  confidence?: number;
}

export interface AiSearchResult {
  mode: AiSearchMode;
  listings?: Listing[];
  navigateTo?: { categorySlug: string; filters?: Record<string, string> };
  clarify?: string;
  parsed?: AiSearchParsed;
}

// ============================================================
// Consultations — the "Hire verified experts" product.
// A directory of EXPERTS (people/firms you hire), deliberately distinct from the
// product Directory. These mirror GET /api/experts (summary + meta) and
// GET /api/experts/:slug (detail). Kept here so both the API client and the UI
// components share one source of truth.
// ============================================================

// How a consultation can be delivered. The API returns lowercase keys; the UI
// maps them to friendly labels ("Video call" / "Phone call" / "In-person").
export type ConsultationMode = "video" | "phone" | "in-person";

// A service package an expert sells (the KEY differentiator vs a product listing).
// The list endpoint returns a 3-item preview; the detail endpoint returns them all
// with the same shape, so one type covers both.
export interface ConsultationPackage {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  unit: string; // e.g. "/month" or "" — appended after the price
  pricingModel: string; // "fixed" | "monthly" | "quote" | ...
  timeline: string; // e.g. "3–5 working days"
  deliverables: string[];
  mode: string; // free-text delivery note, e.g. "on-site/remote"
}

// The summary shape returned by GET /api/experts (one per card).
export interface ConsultationExpert {
  id: string;
  slug: string;
  name: string;
  profession: string; // human label, e.g. "Chartered Accountant"
  professionKey: string; // filter key, e.g. "accounting-tax"
  headline: string;
  city: string;
  state: string;
  logo: string | null; // local /demo/*.jpg or null → initials monogram
  coverImage: string | null;
  isVerified: boolean; // identity verified
  credentialVerified: boolean; // professional credential (ICAI, BCI, …) verified
  rating: number;
  reviewCount: number;
  responseRate: number;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  consultationModes: ConsultationMode[];
  responseTime: string; // e.g. "Within 2 hours"
  freeIntroCall: boolean;
  clientsServed: number;
  packageCount: number;
  priceFrom: number | null; // null → "Custom quote"
  packages: ConsultationPackage[]; // preview (up to 3)
}

// A single case study on an expert's profile.
export interface ConsultationCaseStudy {
  title: string;
  result: string;
}

// A review on an expert. No live reviews ship today, so every field is optional and
// read defensively — the UI falls back to "No reviews yet" when the array is empty.
export interface ConsultationReview {
  id?: string;
  author?: string;
  name?: string;
  rating?: number;
  reviewText?: string;
  text?: string;
  comment?: string;
  title?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// The full profile returned by GET /api/experts/:slug — summary PLUS long-form
// content, credentials and the complete package list.
export interface ConsultationExpertDetail extends ConsultationExpert {
  about: string;
  registrationBody?: string | null; // e.g. "ICAI"
  registrationNo?: string | null;
  caseStudies: ConsultationCaseStudy[];
  gstNumber?: string | null;
  yearEstablished?: number | string | null;
  reviews: ConsultationReview[];
}

// The filter facets the list endpoint returns alongside data (request<T> drops it,
// so getExperts uses a raw fetch to keep it — see lib/api.ts).
export interface ExpertsMeta {
  professions: { key: string; label: string; count: number }[];
  cities: string[];
}

// Body for POST /api/consultations/book (guest-friendly lead capture, no payment).
export interface BookingBody {
  expertSlug: string;
  packageId?: string;
  name: string;
  mobile: string;
  email?: string;
  preferredDate?: string;
  preferredTime?: string;
  mode?: string;
  message?: string;
}

// A consultation request as seen by the EXPERT on their dashboard — the persisted
// side of a BookingBody plus who/when. Returned by GET /api/consultations/bookings.
export interface ConsultationBooking {
  id: string;
  expertId: string;
  expertSlug: string;
  expertName: string;
  packageId: string | null;
  packageTitle: string | null;
  name: string;
  mobile: string;
  email: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  mode: string | null;
  message: string;
  status: string; // "new" | ...
  userId: string | null;
  createdAt: string;
}

// ============================================================
// Recruitment (RECRUITMENT.md) — separate from Directory's Listing/Seller
// types on purpose; see RECRUITMENT.md §1's "separate collections" decision.
// ============================================================
export type EmployerStatus = "pending" | "approved" | "suspended";

export interface EmployerLocation {
  city?: string;
  state?: string;
}

export interface EmployerProfile {
  companyName: string;
  slug: string;
  about?: string;
  logo?: string | null;
  coverImage?: string | null;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  contactMobile?: string;
  contactEmail?: string | null;
  location?: EmployerLocation;
  status: EmployerStatus;
  isVerified: boolean;
  planTier?: string | null;
  jobPostLimit?: number | null;
  applicationQuota?: number | null;
  employeeCount?: string | null;
  benefits?: string[];
  workingHours?: string | null;
}

export interface CandidateEducation {
  degree?: string;
  institution?: string;
  year?: number;
}

export interface CandidateWorkHistory {
  company?: string;
  role?: string;
  duration?: string;
  description?: string;
}

export interface CandidateProfile {
  headline?: string;
  summary?: string;
  resumeUrl?: string | null;
  skills: string[];
  experienceYears?: number | null;
  currentRole?: string | null;
  currentCompany?: string | null;
  expectedSalary?: number | null;
  preferredLocations: string[];
  preferredJobTypes: string[];
  contactPhone?: string | null;
  contactEmail?: string | null;
  isOpenToWork: boolean;
  education: CandidateEducation[];
  workHistory: CandidateWorkHistory[];
}

export type EmploymentType = "full-time" | "part-time" | "contract" | "internship" | "freelance";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";
export type JobStatus = "active" | "paused" | "closed" | "draft" | "pending";
// Same convention as ServiceDetail.serviceMode above (Directory listings).
export type WorkplaceType = "onsite" | "hybrid" | "remote";

export interface JobLocation {
  city?: string;
  state?: string;
  remote?: boolean;
  workplaceType?: WorkplaceType;
}

export interface SalaryRange {
  min?: number | null;
  max?: number | null;
  currency?: string;
  isDisclosed?: boolean;
}

// Public employer mini-object denormalized onto a job by the backend — never carries
// contact fields (those are only ever served by GET /api/employers/:slug, auth-gated).
export interface JobEmployerMini {
  id: string;
  companyName: string | null;
  slug: string | null;
  logo: string | null;
  city: string | null;
  state: string | null;
  isVerified: boolean;
}

// Recruiter-defined screening question, answered by the candidate at apply time.
export interface JobQuestion {
  id: string;
  text: string;
  required: boolean;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  jobFunction: string | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  location: JobLocation;
  salaryRange: SalaryRange;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  openings: number;
  status: JobStatus;
  viewCount: number;
  applicationCount: number;
  questions?: JobQuestion[];
  postedAt: string;
  expiresAt?: string | null;
  qualification?: string | null;
  employer?: JobEmployerMini | null;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export interface JobFunction {
  id: string;
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
}

// Static, admin-seeded picklists (build-plan Phase 1/8) — job-title and skill
// suggestions for the candidate profile combobox, each optionally tagged to a
// JobFunction slug.
export interface JobRole {
  id: string;
  title: string;
  slug: string;
  jobFunction: string | null;
  order: number;
  isActive: boolean;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  jobFunction: string | null;
  order: number;
  isActive: boolean;
}

export type ApplicationStatus = "applied" | "viewed" | "shortlisted" | "interview" | "rejected" | "hired";
// Full set an Application.status can hold, including the candidate-only "withdrawn"
// transition — kept separate from ApplicationStatus (which is what an employer may set
// via updateApplicationStatus) so that function's type doesn't allow it by mistake.
export type FullApplicationStatus = ApplicationStatus | "withdrawn";

export interface ApplicationStatusEvent {
  status: FullApplicationStatus;
  note: string | null;
  changedAt: string;
}

// Job mini-object denormalized onto an application. questions included so a candidate's
// own applications view can pair each of their answers with its question text (build
// plan Phase 3) — the same questions already shown to them at apply time.
export interface ApplicationJobMini {
  id: string;
  title: string;
  jobFunction: string | null;
  status: JobStatus;
  questions?: JobQuestion[];
}

// Candidate mini-object denormalized onto an application for the employer's review —
// includes contact fields unconditionally (the candidate initiated contact by
// applying); see RECRUITMENT.md §3.
export interface ApplicationCandidateMini {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  experienceYears: number | null;
  currentRole: string | null;
  currentCompany: string | null;
  skills: string[];
  resumeUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

// Candidate's answer to one of the job's screening questions.
export interface JobAnswer {
  questionId: string;
  text: string;
}

export interface Application {
  id: string;
  jobId: string;
  employerId: string;
  candidateId: string;
  resumeUrl?: string | null;
  coverNote?: string;
  status: FullApplicationStatus;
  statusHistory: ApplicationStatusEvent[];
  answers?: JobAnswer[];
  appliedAt: string;
  updatedAt: string;
  job?: ApplicationJobMini | null;
  candidate?: ApplicationCandidateMini | null;
}

export interface ApplicationsResponse {
  applications: Application[];
}
