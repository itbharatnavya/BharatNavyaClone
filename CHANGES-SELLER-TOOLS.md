# CHANGES-SELLER-TOOLS.md — Directory seller tools: audit, fixes, tests

Reference for what was found, what was changed, and how to re-check it. Written 2026-10-06
on branch `feature/design-integration`. Scope: listing edit, advertising, Promote (boosts),
Bulk upload, Blogs.

Status: **implemented and verified on local; not yet pushed to the testing server.**
See "Rolling out to the testing server" at the end — the DB migration must run there first.

---

## 1. What was wrong (confirmed before fixing)

| # | Area | Problem |
|---|------|---------|
| 1 | Listing edit | Dashboard edit modal only had title / description / price / status. No photos, category, location, brand, MOQ, unit, search words, service fields. `/sell` could only create. The API (`PUT /api/listings/:id`) already accepted all of it. |
| 1b | Listing edit | An edit never re-ran verification — photos or title could be swapped on an already-approved listing with no check. |
| 2a | Ads | New-UI pages asked for placements nobody could book (`listing_detail`, `seller_profile`, `brand_top`, `employer_profile`, `job_detail`, `recruitment_search`). `my-ads` returned 400 for them; the admin dropdown did not list them. |
| 2b | Ads | Recruitment job search asked for `recruitment_search`; admin and recruiters create `recruitment_search_top` — so "job search top" ads never appeared there. |
| 2c | Ads | The homepage in the new UI renders **no** `home_hero` ads at all (`PromoBanner` / `NativePromotionSlot` have no importers), so a seller could buy "Home hero" and it never showed. |
| 2d | Ads | An ad with no link (`targetUrl`) was accepted by the API but silently never rendered (slots require image + headline + link). |
| 2e | Ads | Category-targeted ads showed on listing / seller / brand pages regardless of category. Admin bookings accepted any `placementType` string. |
| 2f | Ads | The testing server has zero Directory ads (`category_top`, `search_top`, `home_hero` all empty) — pages show the house "Promote on Bharat Navya" fallback. (Data, not code — see rollout.) |
| 3a | Boosts | `rank` and `category_top` boosts never expired (`days` ignored, score stacked forever). Approve could be run twice and applied twice. Duplicate pending requests allowed. Non-live listings could be boosted. `rejectedAt` was never stored. |
| 3b | Bulk upload | Rows went straight to `active` with `verification: null` — bypassed the verification the single-create flow enforces. Every row got a generic stock photo with no way to change it (see 1). |
| 3c | Blogs | `POST /api/blogs` ignored `status`: the dashboard's default "Draft" was **published immediately** and publicly visible. |
| 3d | Blogs | `excerpt` was never stored (create or update), so the `/blog` list excerpt never showed. |
| 3e | Blogs | An owner could PUT `hidden` then `published` — undoing a moderator hide — and store any string as `status`. |
| 3f | Blogs | The dashboard listed blogs from the public endpoint (published only), so a real draft would have been invisible to its author. Cover image was a free-text URL field (hot-link risk, against the "local images only" rule). |

## 2. What changed

### Database — migration `0018_blog_excerpt_boost_expiry.sql`
- `blogs.excerpt TEXT`, `blogs.created_at TIMESTAMPTZ` (back-filled from `published_at`)
- `listings.rank_boost_end_date TIMESTAMPTZ` (NULL = no expiry, keeps admin/legacy boosts as they were)
- `boost_requests.rejected_at`, `boost_requests.expires_at`
- Mirrored in `lib/db/schema.sql`, `modules/_shared/mappings/flat.mappings.js`, `lib/db/listings.js`.
- Note: two files are numbered `0017` (`fcm_tokens`, `otp_codes`). That is fine — the runner tracks full filenames.

### Listing edit (frontend + backend)
- `/sell?edit=<id>` loads one of the caller's listings into the existing create form: photos (add/remove),
  category, name, description, price/MOQ/unit/condition/tiers, service fields, location (PAN India / branch /
  specific cities / current city), search words. Type is fixed. Videos on the listing are preserved.
  (`frontend/app/sell/page.tsx`)
- Dashboard **Edit** now links there; the old modal remains as **Status & price** for quick changes.
  (`frontend/components/dashboard/ListingsTab.tsx`)
- Backend `PUT /api/listings/:id`: a non-admin **material** change (photos, title, description, category, brand)
  re-runs verification. Passed → keeps/gets `active`; failed → `pending` + `verification.reverifiedAfterEdit`.
  Price / status / location-only edits never re-queue. A seller taking a listing down while editing keeps that status.
  Admin edits are trusted. Raw city edits get geo coordinates stamped.
- The editor reads via `/api/me/listings` (not `GET /listings/:id`) so editing doesn't inflate view counts.

### Advertising
- **One placement list**: `backend/lib/adPlacements.js` ↔ `frontend/lib/adPlacements.ts` (a backend test fails if
  they drift). Five keys: `category_top`, `search_top`, `home_hero`, `recruitment_home`, `recruitment_search_top`.
- Where each shows: `category_top` = category pages, brand pages, listing + seller pages; `search_top` = search
  results; `home_hero` = homepage; `recruitment_home` = Recruitment home, job detail, employer profile;
  `recruitment_search_top` = job search.
- Seller tab, recruiter tab, admin tab and the self-serve API all read that list. Admin bookings reject unknown
  placements and can't be set live without a link.
- Link is now required: a listing ad defaults to `/listing/<id>`; a custom-image ad must supply one.
- Category targeting only offered for `category_top`; `/api/ads?category=` accepts a comma-separated category
  path; listing pages send their whole path.
- **Homepage now renders `home_hero` ads** (`frontend/app/page.tsx`, below the hero; renders nothing when none live).
- Page slots changed to the five real keys (brand, employer, job, listing, seller, recruitment jobs).

### Promote (boosts) — `modules/directory/routes/boosts.routes.js`
- `days` must be a whole number 1–365. Only a live (`active`) listing can be boosted. One pending request per
  listing + boost type (409).
- Approve / reject only work on `pending` (409 otherwise) — no double apply.
- Every boost type honours `days`: `rank` / `category_top` set `rankBoostEndDate` (stacking extends it; a score
  with no end date stays permanent); `feature` extends a running window instead of resetting it.
- `lib/ranking.js` ignores a lapsed rank boost. API reports an approved boost past `expiresAt` as `expired`.
- Seller UI: "Ended" badge, "Runs until <date>", and only live listings are selectable.

### Bulk upload — `POST /api/listings/bulk`
- Rows are created as `pending` with `verification.status = needs_review` (+ deterministic checks, `source: "bulk"`),
  approved by an admin through the normal queue ("approve many" exists). No per-row AI call (200 rows = 200 CLI calls).
- Result screen tells the seller the rows are awaiting review and to add real photos via Edit.

### Blogs — `modules/directory/routes/blogs.routes.js`
- `status` honoured on create (`draft` | `published`; omitted = published for API callers). Excerpt stored.
- New `GET /api/blogs/mine` (author's posts in every state). Dashboard uses it.
- Drafts / hidden posts are 404 to the public; the author (and admin) can preview their own draft by slug.
- Owners may only set `draft` / `published`; `hidden` is admin-only and an owner can't lift a moderator hide.
  Publishing stamps `publishedAt`. Cover image is now an upload (clearing it works).

### API shape note
Listing responses now include `rankBoostEndDate` (null by default). Five golden fixtures were updated for that
one additive line (`brand-detail`, `listing-detail`, `listings-browse`, `listings-page2`, `seller-detail`).

## 3. Tests

- `backend/test/seller-tools.test.js` — 11 tests (blogs, boosts incl. ranking expiry, placement parity,
  my-ads/admin validation, edit re-verification, bulk). Runs against the disposable test DB; cleans up after itself.
  `cd backend && NODE_ENV=test node scripts/migrate-schema.js` (once, if the test DB predates 0018), then
  `node --test --test-concurrency=1 --require ./test/_env.js test/seller-tools.test.js`
- Full suite: 135 pass / 25 fail. **The 25 failures exist on the untouched branch too** (checked with a stash):
  23 stale goldens (`jobs-*`, `job-detail`, `employer-detail`, `admin-users-*` — upstream design merge changed
  those shapes) plus their "golden fixtures" wrapper, and 1 `buildLocation` unit test. Not caused by, and not fixed here.
- Browser end-to-end (headless Chrome, local): 27/27 — edit form pre-fill, photo upload + save + re-review message,
  draft blog stays draft and private, ad form placements and conditional category, promote list, real campaigns
  rendering on `/directory`, `/search`, `/`, `/recruitment`, `/recruitment/jobs`, and no horizontal overflow at 390px
  on `/sell?edit`, dashboard listings / blogs / advertise / promote / bulk.
- `cd frontend && npx tsc --noEmit` — clean.

## 4. Known limits / decisions to revisit
- Stacked boosts share one end date (the latest one); a second boost extends the first. Fine for now.
- Bulk rows keep a placeholder category photo until the seller edits them; bulk has no image column.
- `GET /api/listings/:id` is public for listings in any status (pending / rejected too). Pre-existing, untouched.
- Self-serve ads still have no payment step (admin sets price) — unchanged by design.
- Upload storage is chosen by `UPLOAD_STORAGE` (`backend/lib/uploadStorage.js`). Local disk does not
  persist on Vercel. Current setup: **local** on developer machines (`frontend/public/uploads/`),
  **`vercel-blob`** on the testing server (Blob store linked to the backend project, so
  `BLOB_READ_WRITE_TOKEN` is present). `s3` remains the planned option for live — decide before go-live.

## 5. Rolling out to the testing server (when approved)
1. `PG_URL=<neon-url> npm run migrate-schema:status` then `npm run migrate-schema` (applies 0018; also shows whether
   0016 / 0017 were ever applied there).
2. Deploy backend + frontend.
3. Seed Directory ads on the testing DB (it has none) or create a few via `/admin` → Ads.
4. Confirm the testing server's `UPLOAD_STORAGE` is `vercel-blob` and upload one photo end to end.
5. Re-run the probe checks against the testing URL (read-only first).
