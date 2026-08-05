# FRONTEND-PAGES-SPEC — contract for the page-builder wave

Companion to DESIGN.md + BUILD-SPEC.md. The **foundation** (design tokens, `lib/api.ts`,
`lib/auth.tsx`, shared components) is built. This spec locks what the page-builders assume so
pages fit together. Backend is LIVE on :4000 (proxied to /api). App is Next 14 App Router, TS.

## Global principles
- **LIGHT, clean, professional — sarvam.ai feel.** White canvas, generous whitespace, hairline
  borders, few soft shadows, blue = trust, orange = action. Use the existing `.card/.btn/.badge`
  classes and Tailwind semantic tokens (`bg-canvas,text-ink,text-muted,border-border,bg-brand,bg-action`).
- **Config-driven (admin no-code):** call `useConfig()` (from `lib/config.tsx`) → `{branding, homepage,
  featureFlags, contact, footer}`. Branding (siteName/tagline), homepage hero copy + featured
  categories, and **feature on/off flags** come from admin config — never hardcode them. **Gate every
  optional feature's UI behind its flag** (e.g. only render Stories rail if `featureFlags.stories`).
- **i18n:** use `useT()` (from `lib/i18n.tsx`) → `t("key")` for UI strings; support EN + हिन्दी.
- **Auth:** `useAuth()` → `{user, loading, isAdmin, login, loginOtp, register, logout}`. The "+ Sell"
  CTA is ALWAYS visible (one identity). Defer auth walls — allow browsing before login.
- **Page-specific components** go under a namespaced folder to avoid collisions:
  `components/home/*`, `components/listing/*`, `components/seller/*`, `components/dashboard/*`,
  `components/admin/*`, `components/sell/*`. Do NOT edit shared components, `lib/api.ts`,
  `lib/auth.tsx`, `lib/config.tsx`, `lib/i18n.tsx`, `app/layout.tsx`, `components/Navbar.tsx`
  (the shared-additions agent owns those).

## API client (lib/api.ts) — methods available to pages
Existing: register, sendOtp, verifyOtp, login, getMe, getSeller(slug), becomeSeller, updateSellerProfile,
getCategories, getCategory(slug), getListings(query), getListing(id), createListing, updateListing,
deleteListing, aiSearch(query), postInquiry, getInquiries, getReviews, postReview, getConversations,
createConversation(listingId,toUserId), getMessages(convId,afterSeq), getBlogs, getBlog, createBlog,
updateBlog, deleteBlog, getStories, postStory, viewStory, admin* (analytics, sellers, approve/reject/
suspend, monetization, plans, adSlots, adBookings, payments, settings), token helpers.
**Added by shared-additions agent (assume present):** getConfig, getFeatures(query), adminCreateFeature,
adminUpdateFeature, adminDeleteFeature; getNotifications, markNotificationRead, markAllNotificationsRead;
followUser(id), unfollowUser(id), getFollowing, getFollowers(id), getFollowStatus(id);
getReferralCode, redeemReferral(code); highlightStory(id), getHighlights(sellerId); aiAutofill(body);
reportListing({listingId,reason,details}), adminGetReports(status), adminResolveReport(id), adminDismissReport(id);
updateProfile(body), markListingSold(id); adminCreateCategory, adminUpdateCategory, adminDeleteCategory.
getListings query supports: q, type, category(slug), city, state, verified, minPrice, maxPrice, condition,
near(city), radiusKm, sort(relevance|price_asc|price_desc|rating|newest|distance), page, limit.
NOTE response nesting: getMe→data.user; reportListing→data.report; seller→data.{seller,listings,badges}.

## Shared component signatures (already built)
ListingCard({listing, href?, onContact?}) · SellerCard({seller: SellerCardSeller, href?}) ·
AISearchBar({onResults?, placeholder?, examples?, size?:"hero"|"compact"}) ·
Filters({value:ListingFilterState, onChange, categories?, cities?}) ·
StoryRail({groups?}) · StoryViewer({groups, startIndex?, onClose}) ·
Button({variant:"primary"|"brand"|"secondary"|"ghost"|"danger", size, block, href, leftIcon, rightIcon}) ·
Badge({variant}) · Input/Select/Textarea({label,hint,error}) · Modal({open,onClose,title,footer,size}) ·
Toast via useToast() · Avatar · Rating({value,count}) · TrustBadges({verified,trustSeal,gst,years,responseRate}) ·
Breadcrumbs · Pagination({page,totalPages,onChange|hrefBuilder}) · Skeleton.

## Pages to build (each app/.../page.tsx)
**Discovery (FP-1)**
- `app/page.tsx` (Home): config-driven hero (homepage.heroTitle/Subtitle) with **AISearchBar** (examples from config); **StoryRail** (if flag); category grid from `homepage.featuredCategorySlugs` (fetch getCategories); **Trending near you** rail (getListings sort=newest or near=<city>); Featured sellers; "How it works"; Sell CTA. All sections gated by their homepage.* + featureFlags.
- `app/[category]/page.tsx` and `app/[category]/[city]/page.tsx`: category landing — breadcrumbs, sub-category chips (getCategory children), **Filters** left rail, results grid of **ListingCard**, sort dropdown incl **near-me/distance**, **Map view toggle** (Leaflet+OSM, gated by featureFlags.mapView), pagination.
- `app/search/page.tsx`: reads ?q; runs getListings/aiSearch; same results layout.

**Listing + seller (FP-2)**
- `app/listing/[id]/page.tsx`: gallery, title, price (₹ / price tiers / "Ask Price"), MOQ/unit or service rate-card, spec table, condition, seller card (sticky) with **Chat** (createConversation→/dashboard inbox or inline), **Call/WhatsApp** buttons (wa.me), **Report** (modal→reportListing), **Share** (WhatsApp+copy-link), similar listings.
- `app/seller/[slug]/page.tsx`: header (logo, name, city, **badges** from data.badges, TrustBadges, **Follow** button via followUser/status), tabs: Listings / Reviews (two-way, post review) / Blogs / **Highlights** (getHighlights); Call/WhatsApp/Chat; business hours + map location (if geo).

**Create + dashboard (FP-3)**
- `app/sell/page.tsx`: choose type product|service → category picker (nested) → dynamic form; **AI auto-fill from photo** button (aiAutofill; show fallback note if returned fallback:true); photos, price/tiers or rate-card, location. Requires auth (redirect to /login if not). Auto-creates sellerProfile server-side.
- `app/dashboard/page.tsx`: unified, tabbed (one identity). Tabs: **Overview** (stats + notifications), **My Listings** (edit, **Mark Sold**), **Inbox** (chat via lib/socket.ts getSocket(): conversation list + thread, send/receive, unread), **Leads/RFQs** (getInquiries), **Reviews**, **Blogs** (create/edit via markdown), **Stories** (post + **Highlight** pin), **Subscription** (current plan + link to /pricing), **Referral** (getReferralCode, share code), **Profile** (updateProfile: name, city, interests[], contactVisibility; become-seller/update-seller-profile). Gate tabs by featureFlags.

**Admin (FP-4) — MAX configurable, this is where sales/ops runs the platform**
- `app/admin/page.tsx`: login gate (isAdmin). Tabbed:
  - **Overview** (adminAnalytics: totals, sellers by tier, inquiry chart).
  - **Sellers** (list by status; approve/reject/suspend; **Monetization** editor per seller: rankBoost, priorityTier, isFeaturedSeller+dates, planTier, featuredCredits).
  - **Reports** (adminGetReports; resolve/dismiss).
  - **Plans** (adminPlans CRUD — drives /pricing).
  - **Ad Slots & Bookings** (adminAdSlots/adminAdBookings).
  - **Payments** (adminPayments; mark paid/waived — the offline-money backbone).
  - **Categories** (tree view; adminCreateCategory/Update/Delete — no-code taxonomy).
  - **Features** (getFeatures + adminCreateFeature/Update/Delete — the living sales catalog; group by `group`, show plan/status/audience).
  - **Site Config** (adminSettings GET/PUT: edit branding, homepage hero + featured categories, **feature flags toggles**, contact, footer, ranking weights). This is the no-code control center.

**Auth + content + pricing (FP-5)**
- `app/login/page.tsx` (OTP + password tabs) + `app/register/page.tsx`.
- `app/pricing/page.tsx`: Free/Silver/Gold comparison from adminPlans + getFeatures (map features→plans). Public.
- `app/features/page.tsx`: public capabilities page from getFeatures, grouped — mirrors the admin catalog for prospects.
- `app/blog/page.tsx` + `app/blog/[slug]/page.tsx`: blog index + article (react-markdown).

## Verify
Each agent should ensure its pages typecheck against the foundation (imports resolve). Final `next build`
/run is done by the integrator. Don't start a server. Use `"use client"` where hooks/state are used.
