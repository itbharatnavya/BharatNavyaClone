# BUILD-SPEC — contract all builders follow

Companion to DESIGN.md. This pins exact conventions/shapes/endpoints so independently-built
modules integrate cleanly. **Do not deviate.**

## Backend conventions
- Node/Express, **CommonJS** (`require`/`module.exports`). Route files: `express.Router()`,
  `module.exports = router`.
- **Response envelope (always):** success → `res.json({ success: true, data })`. Errors →
  `res.status(code).json({ success: false, error: "msg" })` or `next(err)`.
- Async handlers wrapped in try/catch → `next(err)`.
- All persistence goes through `lib/store.js` (never `fs` directly for data).

### `lib/store.js` API (already built + tested)
```
all(name) -> array
getById(name, id) -> doc|null
findOne(name, pred) -> doc|null
findMany(name, pred) -> array
insert(name, doc, idPrefix?) -> doc          // generates id from idPrefix if doc.id absent
update(name, id, patch) -> doc|null          // shallow-merge, id preserved
remove(name, id) -> bool
readJson(name, fallback=[]) / writeJson(name, data)
appendJsonl(name, obj) / readJsonl(name) -> array   // torn last line skipped
nextId(prefix) -> "prefix_000001"
withLock(key, async fn) / dbPath(...parts)
```
Collections (files in `backend/DB/`): `users.json`, `listings.json`, `categories.json`,
`inquiries.json`, `reviews.json`, `blogs.json`, `stories.json`, `subscription-plans.json`,
`ad-slots.json`, `ad-bookings.json`, `payment-records.json`, `settings.json`,
`leads-ledger.jsonl`, `conversations/index.json`, `messages/<id>.jsonl`, `read-state/<id>.json`.

### Auth (already built)
```
const { authGuard, optionalAuth, requireRole } = require("../middleware/authGuard");
const auth = require("../lib/auth");         // signToken(user), verifyToken, hashPassword, verifyPassword, generateOtp(mobile), verifyOtp(mobile,otp)
const { validate, schemas, z } = require("../lib/validate");
```
After `authGuard`, `req.user` is the full user doc. `requireRole("admin")` gates admin routes.
`optionalAuth` sets `req.user` or null without blocking.

### Data shapes — see DESIGN.md §3. Key ones:
- **User** `{id, name, mobile, email, passwordHash|null, avatarUrl, city, state, roles:[], sellerProfile|null, legacy?, createdAt}`.
  `sellerProfile` (when present) has: companyName, slug, about, logo, coverImage, gstNumber,
  yearEstablished, employeeCount, certifications[], website, contactMobile, contactEmail, location,
  legacyCategories[], status(approved|pending|rejected|suspended), isVerified, trustSealVerified,
  rating, reviewCount, responseRate, performance, planTier(free|silver|gold), planStatus, listingLimit,
  leadQuotaPerCycle, leadsConsumed, featuredCredits, rankBoostScore, priorityTier(none|premium|star|leader),
  isFeaturedSeller, featuredStartDate, featuredEndDate, boostCategoryIds[], boostKeywords[],
  boostGeoLocations[], analyticsEnabled, adminNotes.
- **Listing** `{id, sellerId, type:"product"|"service", title, slug, description, categoryId, legacyCategory,
  categoryPath[], keywords[], media[], location{city,state,pincode}, status, rating, reviewCount,
  isVerifiedSeller, isFeatured, featuredStartDate, featuredEndDate, rankBoostScore, isSponsored,
  boostToTopLastUsed, manualPinRank, product{sku,price,currency,priceTiers[],unitOfMeasure,moq,stockQty,
  availability,leadTime,specifications{},certifications[],variants[],sampleAvailable}|null,
  service{rateCard[],pricingModel,serviceArea[],serviceMode,availabilitySchedule,credentials[],
  experienceYears,teamSize,portfolio[],sla,warranty,bookingType}|null, createdAt}`.
- **Category** `{id, name, slug, parentId|null, path:[slugs], type:"product"|"service"|"both", icon, description, facets:[], listingCount, order}`.

## API surface (backend `/api/*`, proxied from Next). Frontend builds to THIS.
- **auth**: `POST /auth/register`, `POST /auth/send-otp`, `POST /auth/verify-otp` (→ `{token,user}`),
  `POST /auth/login` (email+password → `{token,user}`), `GET /auth/me` (authGuard → user).
- **users/sellers**: `GET /sellers/:slug` (public profile + their listings), `POST /users/become-seller`
  (authGuard, create sellerProfile), `PUT /users/me/seller` (authGuard, update profile).
- **categories**: `GET /categories` (full tree), `GET /categories/:slug` (node + children + ancestors + facets).
- **listings**: `GET /listings` (query: q, type, category(slug), city, state, verified, minPrice, maxPrice,
  sort(relevance|price_asc|price_desc|rating|newest), page, limit → `{listings,total,page,totalPages,facets}`;
  ranking = organic relevance blended with paid boost, sponsored labeled), `GET /listings/:id`,
  `POST /listings` (authGuard, auto-creates sellerProfile if missing), `PUT /listings/:id`, `DELETE /listings/:id`.
- **search (AI concierge)**: `POST /ai/search` `{query}` → `{mode:"list"|"navigate"|"clarify", listings?,
  navigateTo?{categorySlug,filters}, clarify?, parsed}`. Uses Anthropic if `ANTHROPIC_API_KEY` set,
  else deterministic keyword/BM25 fallback. MUST work without a key.
- **inquiries/RFQ**: `POST /inquiries` (create inquiry; if broad/service, fan out to matching sellers as
  leads in leads-ledger.jsonl), `GET /inquiries` (authGuard: my seller leads).
- **reviews**: `GET /reviews?sellerId=`, `POST /reviews` (authGuard).
- **chat**: Socket.IO on same HTTP server; REST: `GET /chat/conversations` (authGuard, my convos),
  `POST /chat/conversations` `{listingId, toUserId}` (get/create), `GET /chat/conversations/:id/messages?afterSeq=`.
- **admin** (all `requireRole("admin")`): `GET /admin/analytics`, `GET /admin/users`, `GET /admin/sellers?status=`,
  `PUT /admin/sellers/:id/approve|reject|suspend`, `PUT /admin/sellers/:id/monetization` (rankBoost, priorityTier,
  isFeaturedSeller, dates, planTier, featuredCredits), `GET/POST/PUT /admin/plans`, `GET/POST/PUT /admin/ad-slots`,
  `GET/POST /admin/ad-bookings`, `GET/POST/PUT /admin/payments` (mark-paid), `GET/PUT /admin/settings`.
- **blogs**: `GET /blogs` (published, filter by sellerId/category), `GET /blogs/:slug`, `POST /blogs` (authGuard),
  `PUT /blogs/:id`, `DELETE /blogs/:id`.
- **stories**: `GET /stories` (active, not expired; grouped by seller), `POST /stories` (authGuard, 24h expiry),
  `POST /stories/:id/view`.
- **monetization plans seed**: `subscription-plans.json` = Free / Silver / Gold per DESIGN §B.3.
- **entitlements** (`lib/entitlements.js`): `isBenefitActive(record)` = paymentStatus in {paid,waived} AND now in [validFrom,validTo]. Ranking/featured/ads read this.

## Frontend conventions (Phase 6 light theme)
- Next.js App Router, TS. All API via `lib/api.ts` (typed fetch, `/api` base, `{success,data}` unwrap,
  attaches `Authorization: Bearer <token>` from `localStorage.bs_token`).
- **Design tokens (light):** canvas `#FFFFFF`/`#F7F8FA`; ink `#0F172A`/text2 `#475569`; border `#E5E7EB`;
  trust accent (blue) `#2563EB`; action accent (orange) `#F97316`; success `#16A34A` warn `#D97706` error `#DC2626`;
  radius 10px; soft shadow `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)`; font Inter.
  Reference feel: sarvam.ai (whitespace, restraint). NO dark theme.
- Shared components: Navbar, Footer, Button, Card, Badge, Input, Select, Toast, Modal, ListingCard
  (product = image+price+MOQ+badges; service = row w/ rating+credentials), SellerCard, StoryRail, Filters.
- Auth: store `{token}` in `localStorage.bs_token`; `getMe()` on load. One identity; the "Sell" CTA is always visible.
