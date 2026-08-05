# DIRECTORY.md — the Directory product

The **Directory** is BharatSource's flagship product: an Indian B2B/B2C marketplace where buyers
discover products and suppliers and send **enquiries / RFQs**. It is a **lead / directory model** —
the platform is a mediator that **never processes payments, holds inventory, or runs a cart/checkout**.

**Audience of this doc:** a developer (or AI agent) with zero prior context who will **productionize
and finish** the Directory — it is already feature-built as a POC, so the job is hardening + completing,
not building from scratch. Read **CLAUDE.md** first (architecture + rules) and **SECURITY.md** (go-live).

> The sibling product **Consultations** (experts, fixed-price packages, bookings) reuses the same
> engine but for `type:"service"` listings. This doc is the **Directory** (products). Where the two
> touch, it's called out.

---

## 1. Stack recap

- Frontend: **Next.js 14 App Router + TypeScript** on `:3000`. Browser calls `/api/*`; `next.config.mjs`
  proxies to the API on `:4000` (single origin, no CORS).
- Backend: **Express (CommonJS)** on `:4000`, file-DB via `backend/lib/store.js`. Envelope `{success,data}`.
- Storage: JSON/JSONL in `backend/DB/` — **no external database**.
- AI: local **`claude` CLI** (`backend/lib/claudeCli.js`); deterministic search first, Claude refines weak queries.

---

## 2. Data model (`backend/DB/`)

| Collection | Shape / notes |
|---|---|
| `users.json` | One record per person. Buyers are plain; **sellers** have a `sellerProfile` (companyName, slug, about, logo, coverImage, location{city,state}, gstNumber, isVerified, rating, reviewCount, responseRate, performance{}, plan/lead-quota/boost fields). A **Consultations expert** is a seller with a `sellerProfile.expert` block. |
| `listings.json` | Products **and** services via `type:"product" \| "service"`. Products carry a `product` block; services a `service` block (rateCard, timeline, deliverables). Ranking/boost fields: `isFeatured`, `rankBoostScore`, `isSponsored`, `manualPinRank`. Multi-vendor: same product across sellers grouped by a **`productKey`**. Geo: `panIndia`, `serviceCities`. `status` (active/…), `rating`, `reviewCount`, `media[]`, `categoryId`/`categoryPath`, `keywords[]`. |
| `categories.json` | Nested category tree (large). Admin-editable via `routes/adminCategories.js`. |
| `collections.json` | Curated "Concepts" (editorial groupings of listings), admin-managed. |
| `inquiries.json` | Buyer enquiries / RFQs. A specific-listing inquiry attaches to one seller; a broad inquiry **fans out** to up to 6 matching approved sellers. |
| `leads-ledger.jsonl` | Append-only ledger — one row per (seller, inquiry) lead delivery. `leadType` "rfq" \| "consultation". Basis for per-lead billing. |
| `quotes.json` | Seller replies to an inquiry (the multi-quote flow). |
| `reviews.json` | Buyer reviews of sellers. |
| `shortlist.json` / `follows.json` | Buyer's saved listings / followed sellers. |
| `boost-requests.json` | Seller self-serve boost requests (pending → admin approves). |
| `ad-slots.json` / `ad-bookings.json` | Ad placements + seller ad campaigns (pending → admin activates). |
| `notifications.json` | In-app notification rows (the bell). **No external delivery** — see §5. |
| `verification-requests.json` | Seller verification submissions (→ admin/moderation queue). |
| `subscription-plans.json` | Admin-defined seller plans (tiers, quotas, prices). |
| `features.json` | The living feature catalog + tier×feature entitlements matrix. |
| `settings.json` | Editable site config (branding, feature flags, copy). |
| `consultation-bookings.json` | Consultations booking requests (sibling product). |
| `_counters.json` | Auto-increment ID counters (`store.nextId`). |
| `conversations/`, `messages/`, `read-state/` | Realtime chat state (Socket.IO). |

---

## 3. Flows (page → endpoint)

### Buyer
| Step | Frontend | Backend |
|---|---|---|
| Land / concierge search | `/` (suite home), `/directory` | `POST /api/ai/search` (deterministic → Claude refine) |
| Browse category | `/[category]`, `/categories` | `GET /api/categories`, `GET /api/categories/:slug`, `GET /api/listings?category=` |
| Keyword search + filters | `/search` | `GET /api/listings?…` (city, price, sort) via `lib/search.js` (`minisearch`) + `lib/ranking.js` |
| Listing detail (+view tracking) | `/listing/[id]` | `GET /api/listings/:id` (increments views) |
| Multi-vendor "also offered by N" | `/listing/[id]` | `GET /api/listings/:id/offers` (same `productKey`) |
| Brands | `/brands`, `/brand/[slug]` | `GET /api/brands`, `GET /api/brands/:slug` |
| Concepts / collections | `/collections`, `/collection/[slug]` | `GET /api/collections` |
| Compare (≤3) | `/compare` | client-side over `GET /api/listings/:id` |
| Shortlist / follow | `/shortlist` | `GET/POST /api/shortlist`, `POST /api/follow` |
| Send enquiry | listing / `/offer` | `POST /api/inquiries` (single-seller) |
| Broad RFQ (fan-out → leads) | `/rfq` | `POST /api/ai/rfq` then `POST /api/inquiries` (fans out ≤6, writes `leads-ledger.jsonl`) |
| See quotes | `/dashboard` (My RFQs) | `GET /api/inquiries/:id/quotes` |
| Review a seller | seller page | `POST /api/reviews` |

### Seller
| Step | Frontend | Backend |
|---|---|---|
| Register / login | `/register`, `/login` | `POST /api/auth/register`, `/login`, `/send-otp`, `/verify-otp` |
| Become a seller | `/sell` | `POST /api/become-seller` (`routes/users.js`) |
| Create / edit listing | `/sell`, `/dashboard` | `POST/PUT/DELETE /api/listings`, images via `POST /api/uploads` |
| Bulk upload | dashboard → Bulk upload | `POST /api/listings/bulk` |
| Multi-location / PAN-India | dashboard → Profile | `PUT` seller locations (`routes/users.js`) |
| My listings (incl. pending) | dashboard → Listings | `GET /api/me/listings` (⚠ NOT the public browse — see §6) |
| Leads & RFQs + quote back | dashboard → Leads | `GET /api/inquiries`, `POST` quote |
| Promote (self-serve boost) | dashboard → Promote | `POST /api/boosts` → admin approves at `/api/admin/boosts/admin/:id/approve` |
| Advertise | dashboard → Advertise | `POST /api/my-ads` → admin activates |
| Subscription / plan | dashboard → Subscription | `GET /api/entitlements`, plans from `subscription-plans.json` |
| Get verified | dashboard → Profile | `POST` verification (`routes/users.js`) → `verification-requests.json` |
| Content (blogs/stories) | dashboard tabs | `POST /api/blogs`, `POST /api/stories` |

### Admin (`/admin`)
Approve/suspend sellers, categories CRUD, monetization + plans, ad slots, boost approval, moderation
queue, verification queue, collections, feature catalog + entitlements matrix, site config, analytics.
Endpoints under `routes/admin.js` (`/api/admin/*`, guarded) plus the **nested admin sub-APIs**
(`/api/admin/categories|collections|boosts|moderation|entitlements`) mounted **before** the blanket
guard — see §6.

---

## 4. Feature inventory

### ✅ Done (works end-to-end)
- Category tree + category pages; keyword search with filters/sort (`minisearch` + ranking).
- **AI concierge search & RFQ** via `claude` CLI, deterministic-first, never-blank.
- Listing detail with **view tracking**; **multi-vendor** offers (same product, many sellers).
- Brands directory; Collections/Concepts; Compare; Shortlist; Follow.
- Enquiry + **broad RFQ fan-out → leads ledger**; seller **multi-quote**; reviews.
- Seller onboarding, listing CRUD, **bulk upload**, multi-location/PAN-India.
- Tabbed **seller dashboard** (overview/analytics/listings/leads & RFQs/promote/advertise/subscription/referral/reviews/blogs/stories/profile).
- **Admin panel** (all of §3 admin).
- **Image uploads persist to disk** (`routes/uploads.js` → `frontend/public/uploads/`, mime+size validated).
- **File-DB durability**: `lib/store.js` does **atomic writes** (temp file + `rename`) behind a per-collection lock.
- **Input validation** via `zod` schemas + a `validate(schemas.*)` middleware (used on auth and other write routes).
- OTP is **returned only in dev** (`config.isDev`) — already gated.
- JWT auth with role-gated admin; passwords hashed with `bcryptjs`.

### 🟡 Partial (exists but POC-grade — finish before/soon after go-live)
- **Notification delivery.** `lib/notify.js` only writes in-app rows (the bell). **No email / SMS / WhatsApp is actually sent** — a seller isn't told about a lead unless they open the site. High-impact gap for a leads business.
- **Uploads coupling.** Uploads write into `frontend/public/uploads/` from the backend — fine on one box, but a **split-host deploy needs shared storage** (or move to object storage / a served static dir owned by the API).
- **Realtime chat** (Socket.IO, `routes/chat.js` + `conversations/`,`messages/`) — wired, but verify reconnection, auth on the socket, and delivery/read-state at scale.
- **Validation coverage** — present via zod on many routes; **audit that every write route validates** (don't assume 100%).
- **Search at scale** — `minisearch` rebuilds/reads from the JSON file; fine for POC volume, needs an index strategy + pagination review as listings grow.
- **Lead billing accuracy** — `leads-ledger.jsonl` records deliveries and quotas exist; reconcile per-lead pricing/quota decrement end-to-end before charging anyone.
- **Analytics** — dashboard analytics are computed from file data; confirm they reflect real events (views/leads) not placeholders.

### ❌ Missing (needed for a real launch)
- **Rate limiting** on auth + write endpoints (login/OTP/register/inquiry/review). None today.
- **Automated tests** — no unit/integration tests exist. Add at least smoke tests for auth, listings, inquiries.
- **Security headers** (`helmet`), HTTPS/TLS termination, and the rest of **SECURITY.md**.
- **DB backups / snapshots** for `backend/DB/` (it *is* the database).
- **Real email/SMS/WhatsApp integration** (ties to the notification-delivery gap).
- **Observability** — error monitoring + structured logs (currently `console` + `/tmp/bs-backend.log`).
- **Multi-process safety** — the store lock is **in-process**; running >1 backend instance can race on writes. Assume single-process, or add cross-process locking (`proper-lockfile` is already a dependency) if you scale out.

---

## 5. Productionization roadmap

### P0 — must, before go-live
1. **Security pass** — do everything in **SECURITY.md** (prod `JWT_SECRET`, wipe demo accounts, HTTPS, rate limiting, headers). *(files: `backend/.env`, `middleware/`, `index.js`)*
2. **Notification delivery** — send leads/quotes/bookings via email + SMS/WhatsApp; keep the in-app row too. *(`lib/notify.js`, new provider adapter)*
3. **DB durability & backups** — confirm atomic writes cover every writer, add a scheduled backup/snapshot of `backend/DB/`, decide single-process vs cross-process lock. *(`lib/store.js`, ops)*
4. **Uploads for production** — validate size/type caps and ensure the upload dir is served in your deploy (or move to object storage). *(`routes/uploads.js`)*
5. **Validation + rate-limit audit** — every write route validated; throttle auth/write. *(`routes/*`, `lib/validate.js`)*

### P1 — finish partial flows
6. Realtime chat hardening (socket auth, reconnection, read-state).
7. Lead-billing/quota reconciliation end-to-end.
8. Search/pagination performance as listing volume grows.
9. Real analytics from tracked events.

### P2 — new features (after it's solid)
10. Buyer accounts niceties (saved searches, alerts on new matching listings).
11. Seller CRM depth (lead statuses, follow-ups).
12. SEO (server-rendered listing/category metadata, sitemaps).
13. Then bring **Credit Card** / **Mutual** out of "coming soon".

---

## 6. Gotchas the next dev must know
- **Restart the backend after backend edits** — plain `node index.js`, no hot reload.
- **Nested admin routers are mounted BEFORE the blanket `/api/admin` guard** (`index.js`): `/api/admin/categories|collections|boosts|moderation|entitlements`, with the op under an inner `/admin/*`. Follow this to add admin sub-APIs.
- **`GET /api/me/listings` ≠ the public browse** — the public endpoint filters to approved sellers; the dashboard must use `/api/me/listings` or a suspended/pending seller sees "0 listings".
- **`express.json({ limit: "8mb" })`** in `index.js` — needed for base64 phone-photo uploads; don't lower it.
- **Services vs products** — `type:"service"` belongs to **Consultations**; `type:"product"` to the Directory. Keep them from leaking into each other's browse.
- **`request<T>()` in `frontend/lib/api.ts` drops top-level `meta`** — use a raw fetch when an endpoint returns `{data, meta}`.
- **Design rules are enforced** — no emojis (inline SVG), native `<select>` filters, local images only, zero 390px overflow, `en-IN` ₹ formatting. (CLAUDE.md §2/§6.)
- **AI degrades gracefully** — if the `claude` CLI is absent, deterministic search still answers; never show a blank result.
