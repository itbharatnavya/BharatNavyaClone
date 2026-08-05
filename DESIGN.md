# BharatSource 2.0 — Architecture & Design

> A horizontal Indian marketplace: **OLX-style unified identity** (anyone buys *and* sells)
> × **IndiaMART/Moglix** product sourcing × **JustDial** services directory, across *all*
> industries (hire a CA → book a consultation → source steel → buy flour). AI vendor-search
> concierge, secure buyer↔seller chat, seller reach tools (blogs + stories), and an
> admin-controlled money layer — with **no e-commerce checkout** and **file-based storage**.

This document is the single source of truth for the rebuild. It synthesizes six R&D tracks
(codebase map, taxonomy, monetization, AI+chat, and UX teardowns of IndiaMART/Moglix and
JustDial/OLX).

---

## 1. Product principles (from the R&D)

1. **One identity, no roles.** A user is a *person*, not a "buyer" or "seller". The same
   account posts listings, sends inquiries, and chats. The **listing/thread** decides which
   side you're on. (OLX's proven model; avoid separate buyer/seller accounts.)
2. **Products and services are one catalog, two shapes.** A single `Listing` entity with
   `type: product | service` and a divergent detail block.
3. **Geography is first-class.** `{category} × {city}` is a persisted axis threaded through
   browse, search, results, and URLs (indexable `[category]/[city]` landing pages).
4. **Show price; make "request quote" the exception.** Avoid IndiaMART's default "Ask Price".
5. **Two contact economies.** Goods → 1:1 **chat + make offer**. Services/bulk → an **RFQ that
   fans out** to matching providers as leads.
6. **Honest monetization.** Paid placement is always **labeled "Sponsored/Featured"** — never
   disguised as an earned badge.
7. **Light, clean, professional UI.** White canvas, one trust accent + one action accent, flat
   cards with subtle borders, summary-first dashboards. (Current app is dark-only → full re-theme.)
8. **Defer friction.** Let users browse and see value before auth walls; gate contact only in
   high-abuse verticals (cars/jobs/real-estate-style) via phone verification.

---

## 2. Stack & repository

Keep the existing stack; **rebuild the foundation in place** (no fresh project).

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind — served on `:3000`.
- **Backend:** Node/Express — served on `:4000`; `/api/*` proxied from Next via `next.config.mjs`.
- **Realtime:** Socket.IO in the Express process (standalone, *not* a Next serverless route).
- **Storage:** **file-based** — `backend/DB/` holding JSON (documents) + JSONL (append logs).
  No external database. A storage-abstraction layer isolates this so it can swap to a real DB later.
- **AI:** Claude via the Anthropic API, server-side (model/pricing pinned at Phase 5 from the
  `claude-api` reference — not guessed here). Requires `ANTHROPIC_API_KEY`.
- **No payment gateway.** Monetization = admin-set records/flags (offline payment).

### New backend layout
```
backend/
  DB/                      # ← all persisted data (JSON docs + JSONL logs)
    users.json
    listings.json
    categories.json
    inquiries.json         # RFQ / leads
    conversations/index.json
    messages/<conversationId>.jsonl
    read-state/<conversationId>.json
    reviews.json
    subscription-plans.json
    ad-slots.json
    ad-bookings.json
    leads-ledger.jsonl
    payment-records.json
    blogs.json
    stories.json           # ephemeral (24h) — swept on read
    settings.json          # ranking weights, feature flags
  lib/
    store.js               # storage abstraction: read/write JSON, append JSONL,
                           #   atomic temp+rename writes, per-collection async mutex, id gen
    auth.js                # JWT sign/verify, password hashing, OTP
    search.js              # BM25/BM25F in-memory index over listings (Phase 5)
    entitlements.js        # "is this paid benefit active?" (PaymentRecord + validFrom/To)
    validate.js            # zod schemas per entity
  middleware/
    authGuard.js           # verify JWT, attach req.user; requireRole('admin')
    errorHandler.js
  routes/                  # thin controllers over lib/*
  realtime/
    chat.js                # Socket.IO server: JWT handshake, rooms, participant checks
  index.js
```

### Storage rules (concurrency-safe file DB)
- **Documents** (users, listings, categories…) → one JSON array file per collection.
- **Append-heavy** (chat messages, leads ledger) → **JSONL, append-only** (`fs.appendFile`);
  never rewrite history — a crash at worst leaves one torn trailing line (skippable).
- **Atomic whole-file writes:** write temp file → `fs.rename()` (atomic on POSIX) so readers
  never see a half-written file.
- **Per-collection async mutex** (in-process promise-chain lock keyed by collection/conversation)
  serializes read-modify-write, preventing lost updates. Different files never contend.
- **IDs:** `usr_`, `lst_`, `cat_`, `cnv_`, `pay_` … + a monotonic counter (not raw `Date.now()`).

---

## 3. Data model

### 3.1 User (unified identity)
```
User {
  id, name, mobile, email, passwordHash?,          # OTP-first; password optional
  avatarUrl?, city, state,
  roles: ["user"] | ["user","admin"],              # admin is a flag, not a separate account
  sellerProfile?: {                                 # present once the user posts a sell listing
    companyName, slug, about, logo?, coverImage?,
    gstNumber?, yearEstablished?, employeeCount?,
    certifications[], website?, contactMobile, contactEmail,
    isVerified, trustSealVerified, verifiedBadgeExpiry?,
    rating, reviewCount, responseRate, performance{…},
    # --- monetization (Phase 3) ---
    planId?, planTier, planStartDate?, planEndDate?, planStatus,
    listingLimit?, leadQuotaPerCycle?, leadsConsumed, leadQuotaResetDate?,
    featuredCredits, perLeadPrice?,
    rankBoostScore, priorityTier, isFeaturedSeller,
    featuredStartDate?, featuredEndDate?,
    boostCategoryIds[], boostKeywords[], boostGeoLocations[],
    analyticsEnabled, accountManagerId?, adminNotes?
  },
  createdAt
}
```
- **No buyer/seller split.** `sellerProfile` is lazily created the first time a user publishes a
  sell listing. Everyone can inquire/chat/favorite.
- **Admin** = a seeded user with `roles: ["user","admin"]` (replaces the hardcoded credential).

### 3.2 Listing (product **or** service)
```
Listing {
  id, sellerId, type: "product" | "service",
  title, slug, description, categoryId, categoryPath[],   # denormalized ancestor slugs
  media[], location{city,state,pincode}, status, createdAt,
  # trust/discovery
  rating, reviewCount, isVerifiedSeller,
  # monetization (Phase 3)
  isFeatured, featuredStartDate?, featuredEndDate?, rankBoostScore, isSponsored,
  boostToTopLastUsed?, manualPinRank?,

  product?: { sku?, price?, currency, priceTiers[], unitOfMeasure, moq, stockQty?,
              availability, leadTime?, specifications{}, certifications[], variants[],
              sampleAvailable },
  service?: { rateCard[], pricingModel: "fixed"|"hourly"|"quote", serviceArea[], serviceMode,
              availabilitySchedule, credentials[], experienceYears, teamSize?, portfolio[],
              sla?, warranty?, bookingType: "instant"|"enquiry"|"quote" }
}
```

### 3.3 Category (nested tree)
```
Category { id, name, slug, parentId|null, path[], type: "product"|"service"|"both",
           icon?, description?, facets[], listingCount, order }
```
- Single source of truth (kills the current 7-file hardcoded duplication).
- `facets[]` drives the filter rail: **product** facets (brand, price tiers, MOQ, location,
  availability, certifications, seller-type) vs **service** facets (service-area, rate, experience,
  credentials, availability, ratings). Seeded from the taxonomy R&D (24 top-level, deep spikes).

### 3.4 Contact / leads
- **Inquiry / RFQ** (`inquiries.json`): buyer requirement → for services/bulk it **fans out** to
  matching sellers; each delivered copy is a **Lead** row.
- **Lead ledger** (`leads-ledger.jsonl`): `{leadId, sellerId, buyerId, listingId?, leadType,
  deliveredDate, consumedFromQuota, chargeable, leadPrice, billingStatus, status}`.

### 3.5 Chat (Phase 4)
- `conversations/index.json`: `convId → {participants[2], listingId, lastMsgSeq, lastMsgAt, preview}`.
- `messages/<convId>.jsonl`: append-only `{seq, clientMsgId, from, ts, body}` (monotonic `seq`).
- `read-state/<convId>.json`: `userId → lastReadSeq` (unread = `lastMsgSeq − lastReadSeq`).

### 3.6 Monetization (Phase 3)
- `SubscriptionPlan` (Free/Silver/Gold definitions), `AdSlot`, `AdBooking`, `PaymentRecord`,
  `settings.json` (ranking weights). **`PaymentRecord` is the backbone:** every paid benefit
  activates only when a linked record has `paymentStatus = paid|waived` **and** `now ∈ [validFrom,
  validTo]`. This is what lets the whole money layer run with zero payment integration.

### 3.7 Reach tools (Phase 7)
- **Blog** `{id, sellerId, title, slug, coverImage?, body(markdown), categoryId?, tags[],
  status: draft|published, publishedAt, views}` — permanent, SEO pages at `/blog/[slug]`,
  surfaced on seller + category pages.
- **Story** `{id, sellerId, media{type,url}, caption?, linkListingId?, createdAt, expiresAt(24h),
  views}` — ephemeral; **swept on read** (expired stories filtered out / pruned). Rendered as a
  circular-avatar **stories rail** on home + category pages; tap → full-screen viewer.
  Monetization hook: "Boost Story" = admin-flagged wider placement.

---

## 4. Auth & identity
- **JWT** (signed, `httpOnly` cookie or `Authorization` header) replaces the mock localStorage
  flags. `authGuard` verifies and attaches `req.user`; `requireRole('admin')` protects admin routes.
- **OTP-first login** (mobile → OTP). Keep a real (still dev-mocked delivery) OTP, but issue a
  **real session JWT**. Optional password.
- **Backend is currently 100% unauthenticated** — every mutating route gets a guard in the rebuild.
- **Contact gating:** in high-abuse categories, require phone-verified before chat starts.

---

## 5. AI vendor-search concierge (Phase 5) — "Intent-First"
Hero input → the assistant returns a **ranked vendor list** or **navigates** to the right page.

```
free text → 1. normalize + synonym expand (CA→chartered-accountant, SS→stainless-steel)  [deterministic]
          → 2. ONE structured tool call → strict JSON {intent,category,location,serviceType,
                                                        productType,budget,attributes,confidence,…}
          → 3. decision gate:
                 NAVIGATE  when query maps cleanly to a category page (+≥1 filter)
                 LIST      when specific/multi-constraint/cross-category, or low confidence
                 CLARIFY   when a required slot (category/location) is missing → ONE question
          → 4. execute + render + log
```
- **Tools (function-calling):** `searchVendors(filters)`, `navigateTo(categorySlug, filters)`,
  `askClarification(missingSlot)`. Deterministic guard-rails wrap the model: **validate every
  emitted `categorySlug`/`city` against our reference lists** before trusting; default to LIST on
  low confidence (never dead-end the user).
- **Retrieval (no vector DB):** in-memory **BM25/BM25F** (MiniSearch/Fuse.js) over a
  build-time inverted index of listings; apply **hard structured filters first**, then rank the
  survivors. Optional Phase-5.1 semantic rerank on top-K via precomputed embeddings fused with RRF.

## 6. Secure chat (Phase 4)
- **Socket.IO** (WebSockets, auto-fallback to polling) in the Express process.
- **Secure =** JWT-verified **handshake middleware** (reject unauth sockets before connect) +
  **participant check before `socket.join(convId)` and re-checked on every send** (only the two
  participants can read) + input sanitization / **escape-on-render** (never `dangerouslySetInnerHTML`)
  + `wss://` in prod + restrictive file perms on `DB/` (outside web root).
- **Delivery model:** durable JSONL is source of truth; live push is an optimization. `clientMsgId`
  idempotency; `afterSeq` sync API for reconnect/history; per-conversation **async mutex** +
  `proper-lockfile` guard the seq→append→index update.

---

## 7. UI / design system (Phase 6) — light, clean, professional
Full re-theme from the current dark-only theme.
**Primary visual reference: https://www.sarvam.ai** (user-chosen) — clean, generous whitespace,
restrained palette, confident typography, minimal chrome. A dedicated teardown of it kicks off
Phase 6 to extract exact spacing/type/color cues before theming.
- **Palette:** white/near-white canvas (`#FFFFFF` / `#F7F8FA`), ink text (`#0F172A`/`#475569`),
  one **trust accent (blue ~#2563EB)** + one **action accent (warm orange ~#F97316)**, hairline
  borders (`#E5E7EB`), soft shadows only where they aid hierarchy. Success/warn/error greens/ambers/reds.
- **Type:** clean sans (Inter) for UI, a display face for headings; tabular/mono for prices & IDs.
- **Components:** dual-input **hero search (What + Where)**; **two card densities** — image-forward
  2-up/3-up grid for products, scannable rich rows for service providers; **left-rail faceted filters**
  with **price-tier chips** (Under ₹500/₹1k/₹2k/₹5k) + Sort By; **trust pill-stack** (Verified · GST ·
  N yrs · response-rate); **spec tables** + **quantity price-ladder** on product detail; **sticky
  seller-contact card**; **stories rail**; **summary-first dashboards** (not another search box).
- **Honest labels:** "Sponsored"/"Featured" badges inline in results.
- **Avoid:** homepage color-noise/clutter, hidden pricing, auth walls before value, disguised paid rank.

---

## 8. Page inventory (target)
Public: `/` (hero AI search + categories + stories + featured) · `/[category]` and
`/[category]/[city]` (faceted results) · deep nested category pages · `/listing/[id]`
(product or service detail) · `/seller/[slug]` (profile mini-site: About/Listings/Reviews/Blogs) ·
`/search` · `/rfq` (post requirement) · `/pricing` (free vs paid plan comparison, rendered from
the admin-defined subscription tiers) · `/blog` + `/blog/[slug]` · `/compare`.
Auth: `/login` (OTP) · `/register`.
App (one identity): `/sell` (create listing) · `/dashboard` with **My Listings, Inbox (unified chat),
Leads, RFQs, Reviews, Blogs, Stories, Subscription, Profile**.
Admin: `/admin` → Overview · Users/Sellers · Listings · Categories · **Featured & Ranking** ·
**Ad Slots & Bookings** · **Subscription Plans** · **Leads** · **Payments (mark-as-paid)** ·
Verification/Badges · Reviews moderation · Blogs/Stories moderation · Settings.

---

## 9. Build phases (each independently demoable)
- **Phase 0 — Foundation:** `DB/` + `store.js` (atomic writes, mutex, JSONL), JWT auth + guards,
  zod validation, config, seed migration of existing data. *Backend hardening; app still runs.*
- **Phase 1 — Unified identity + listings:** one `User`, lazy `sellerProfile`, `Listing`
  (product/service), `/sell` create flow, listing/seller pages. Retire buyer/supplier split.
- **Phase 2 — Deep categories:** nested `categories.json` (seed from taxonomy R&D), single source
  of truth, `[category]/[city]` pages, faceted filters + sort, breadcrumbs.
- **Phase 3 — Monetization + admin:** all 4 models as admin-configurable data + `PaymentRecord`
  backbone + ranking blend (organic × paid with relevance-floor) + full admin panel.
- **Phase 4 — Secure chat:** Socket.IO, unified inbox, per-listing threads, unread counts.
- **Phase 5 — AI concierge:** intent-first hero search, BM25 retrieval, tool-use routing
  (list vs navigate). *Pin Claude model/pricing from `claude-api` reference here.*
- **Phase 6 — UI polish:** the full light design system across every page.
- **Phase 7 — Reach tools:** seller **blogs** (permanent/SEO) + **stories** (ephemeral 24h rail).

## 10. Dependencies to add
- Backend: `jsonwebtoken`, `bcryptjs`, `zod`, `socket.io`, `proper-lockfile`, `minisearch` (or
  `fuse.js`), `@anthropic-ai/sdk`. Env: `JWT_SECRET`, `ANTHROPIC_API_KEY`.
- Frontend: `socket.io-client`; markdown renderer for blogs.

## 11. Known tension (acknowledged)
"Production launch" + **file storage** + **no payments**: file JSON/JSONL is safe here with the
mutex + append-only design, but heavy concurrent chat at real scale eventually wants a real DB.
The storage abstraction (`store.js`) is deliberately swappable so that migration is a one-file change.

## 12. Client feature-list reconciliation (IT-company doc)
The client's IT vendor supplied a feature list (marketplace+directory+stories+AI, pure mediator,
no payments) — aligned with this design. Reconciliation:

**Folded into the build now (Phase-1 essentials that were missing/partial):**
- **Report Listing + moderation** — `reports.json` + `/api/reports` (POST flag) + admin moderation queue.
- **Mutual (two-way) ratings** — reviews get a `direction` (buyer_to_seller | seller_to_buyer) + `targetUserId`.
- **User profile** — add `interests[]` (category interests) + `contactVisibility` (public|on_request|hidden).
- **Mark-as-Sold + condition** — listing `status` gains `sold`; product gets `condition` (new|used|na).
- **Call / WhatsApp buttons** — one-tap CTAs on listing + seller pages (wa.me deep links, no API).
- **City "near me" + trending** — city select/auto-hint + trending-by-city listing rails (no maps).
- **Cheap wins** — social-share buttons; auto gamified badges (Top Rated ≥4.5★, Fast Responder ≤2h).

**Phase 8 — complete ALL remaining items (sense-checked substitutions where literal isn't feasible):**
- **Follow + notifications** — follow entity + an **in-app notification center** (bell/feed: messages,
  story views, follows). True web-push (service worker + VAPID) noted as an infra add-on, not built.
- **Story Highlights** — pin a story permanently to a seller profile (non-expiring flag + highlights row).
- **Share** — **WhatsApp share + copy-link** (wa.me). Instagram has no web share API → not possible; omit.
- **Multi-language** — **EN/हिन्दी toggle** via a UI-string dictionary (nav/hero/labels/CTAs), not full content i18n.
- **Voice input for AI** — browser **Web Speech API** mic on the AI search (no backend).
- **AI listing auto-fill** — `/api/ai/autofill` uses **Claude vision when ANTHROPIC_API_KEY set**;
  graceful category/keyword fallback without a key.
- **Map view + near-me** — static **city→lat/lng** table + **haversine distance sort** + **Leaflet +
  OpenStreetMap** map toggle (free, no API key). Business hours + map location shown on profiles.
- **Referral program** — referral code per user + credit ledger (offline redemption, like other monetization).
- **Gamified badges** — auto-derived: Top Rated (rating ≥4.5), Fast Responder (avgResponseTimeHours ≤2).

All of the above are built after the core phases; each is additive to the existing data model.
