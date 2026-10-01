# GROWTH.md — the Growth product

**Growth** is BharatSource's third suite product: an SME growth-diagnosis engine. Where the
**Directory** and **Recruitment** are *transaction* products — the user already knows what they want
(500 boxes, 2 sales executives) and the platform matches supply — Growth is a **diagnosis and
routing** product. The SME arrives with a vague problem ("we're stuck at ₹2 Cr and don't know why"),
the platform **scores the business**, names its **top 3 bottlenecks**, turns each bottleneck into a
concrete **requirement**, and routes that requirement to whoever can fulfil it — a Directory seller,
a vetted Growth provider, Recruitment, or a manual ops queue. It is a **lead / mediator model** like
the rest of the suite: the platform never processes payments, lends money, arranges finance, or holds
inventory.

Strategically, Growth sits **on top of** the other two products, not beside them. Every diagnosis it
produces is demand for something else in the suite — "you need a sales team" → Recruitment, "you need
better packaging vendors" → Directory. It is the suite's front door and its funnel.

**Design reference:** the intended feel is a business-health-check plus a light services marketplace —
loosely the diagnostic tone of an MSME advisory portal crossed with a vetted-provider directory — as
UX *inspiration* for the category, not a source of visual design. Built entirely in BharatSource's own
light design system (CLAUDE.md §2/§6: no emojis, native `<select>` filters, brand blue / action
orange tokens, zero 390px overflow, local images only).

**Audience of this doc:** a developer (or AI agent) with zero prior context, building Growth from
scratch. Read **CLAUDE.md** first — the suite-wide architecture and every non-negotiable rule apply
here unchanged (Postgres-only persistence via module ports + `modules/_shared` repos, no `lib/store.js`,
routes as `modules/<domain>/routes/*.routes.js`, AI through the local `claude` CLI, login-gated
contact). **DIRECTORY.md** and **RECRUITMENT.md** are the sibling docs and the pattern this build
follows — but note both were written against the pre-Phase-8 file-DB backend (`backend/lib/store.js`,
`backend/routes/*.js`); those paths are gone. Trust CLAUDE.md §3/§5 and `BACKEND-AUDIT.md` for how the
backend actually works today, and mirror the siblings' *structure and tone*, not their file
references.

> **Status: not yet built.** As of this doc's creation there is no `/growth` route, no `modules/growth`,
> and no data model. This document is the spec the build works from, not a record of what exists. See
> §6 for the build sequence.
>
> **Build vs. launch are decoupled.** The whole product is built end-to-end behind a single admin
> feature flag (§5). Production keeps showing "Coming soon" throughout the build, regardless of how
> much is finished, until `featureFlags.growthLive` is deliberately flipped on.

---

## 1. Stack recap

Same stack as the rest of the suite — no new infrastructure:

- **Frontend:** Next.js 14 App Router + TypeScript on `:3000`, same single-origin `/api/*` rewrite
  (`frontend/next.config.mjs`). New pages under `frontend/app/growth/`.
- **Backend:** Express (CommonJS) modular monolith on `:4000`. A **new `modules/growth/`** owns its
  `routes/*.routes.js` + `index.js` (public port) + `repository/*` + `mount.js` + `schema/tables.js`
  manifest, wired into `backend/app.js` by adding `mountGrowth(app, phase)` calls in the fixed order
  (see §5 for the phases). Persistence is Postgres via `modules/_shared`'s
  `repoForCollection("<coll>.json")` for flat collections and the module's own named repos for
  anything composite — never `fs`/raw SQL from a route.
- **Auth:** the existing `backend/middleware/authGuard.js` — `authGuard`, `optionalAuth`, and
  `requireRole("admin")`, unchanged. One account works across Directory, Recruitment and Growth,
  exactly as it does across the suite today.
- **AI:** the local `claude` CLI via `backend/lib/claudeCli.js` (`askClaude`, `askClaudeJSON`,
  2-permit semaphore). Deterministic-first, Claude-refines-on-need, never-blank — same contract as
  `modules/ai`. Do **not** switch to a paid API key.

### Divergence from Directory and Recruitment: a fully separate module

Consultations reuses `listings.json` (`type:"service"`) because it is a close sibling of the Directory
— same seller + listing + enquiry semantics. Recruitment refused that reuse and built its own
`jobs` / `applications` collections because an application pipeline is nothing like an enquiry.
Growth is further still from both:

- A **health check** is a scored questionnaire with weighted answers producing a reproducible number
  — there is no scored-questionnaire primitive anywhere in the codebase (`QuestionsEditor` in
  `frontend/components/sell/editors.tsx` authors free-text screening questions only, no weights).
- A **Growth provider** is a professional-services firm (a CA, a marketing agency, an AI-automation
  shop) with budget bands, an engagement model, and industries served — none of which fit
  `sellerProfile` or a `listings.json` row (no `productKey` grouping, no boost ranking, no
  product/service block mean anything here).
- **Funding readiness** and the **government-scheme catalog** are new domains with no existing
  equivalent — `credit-card` / `mutual` are static "coming soon" stubs with no backend.

So Growth gets its **own module and its own collections**, built by mirroring the *shape and patterns*
of `sellerProfile` / `jobs.json` / `inquiries.json` — not by reusing the files. **The cost of this
isolation is real and must not be glossed:** the provider profile page, GST/PAN verification flow,
reviews, and rating machinery are **rebuilt for Growth, not inherited** from the Directory. That is
the deliberate price of keeping an unrelated, more-sensitive product from adding coupling to a
Directory that CLAUDE.md already flags as needing hardening.

Identity is the one exception. The `users` table is owned by `modules/identity`, so the two Growth
personas attach there as profile blocks, exactly as Recruitment's `employerProfile` /
`candidateProfile` do (`backend/modules/identity/routes/users.routes.js` — `become-employer` at
`:740`): a `growthProfile` block (the SME business identity — no approval gate, any user creates one
freely, mirrors `candidateProfile`) and a `growthProviderProfile` block (the provider identity —
admin-approved, mirrors `employerProfile`). Everything else Growth touches lives in `modules/growth`.

---

## 2. Data model

New collections, all owned by `modules/growth` (declared in `modules/growth/schema/tables.js` so the
architecture test can enforce the boundary):

| Collection / field | Shape / notes |
|---|---|
| `users.json` → `growthProfile` | The SME business identity. No approval gate — mirrors `candidateProfile`. Fields: `businessName`, `industry`, `state`, `city`, `yearsOperating`, `employeeCount` (text band, e.g. `"11-50"`, same convention as `sellerProfile.employeeCount`), `entityType` (`proprietorship`\|`partnership`\|`llp`\|`pvt-ltd`\|`other`), `gstRegistered` (bool), `revenueBand`, `targetBand`. Created / edited via `PUT /api/me/growth-profile` (`modules/identity`). Pre-filled from `sellerProfile` when the user already has one (see §3, existing-seller entry). |
| `users.json` → `growthProviderProfile` | The provider identity. Admin-approved — mirrors `employerProfile`. Fields: `companyName`, `slug` (unique), `about`, `logo`, `coverImage`, `category` (one of the marketplace categories), `contactMobile`, `contactEmail` (**gated** — see below), `location{city,state}`, `status` (`pending`\|`approved`\|`suspended`), `isVerified`, `rating`, `reviewCount`. Created via `POST /api/become-growth-provider`; editable fields via `PUT /api/me/growth-provider` (status/isVerified stay admin-owned, same rule as seller monetization fields). |
| `growth-questions.json` | The admin-editable question bank + weights that drives both the check form and the score. One row per question: `id`, `section` (`business`\|`money`\|`sales`\|`problems`), `pillar` (one of the six — see §4), `text`, `type` (`select`\|`multi`), `options[]` (`{value, label, weight}` — `weight` is the 0–100 contribution that answer makes to its pillar), `active`, `order`. Editing weights here re-tunes scoring with **no deploy**. |
| `growth-checks.json` | One row per completed health check — **history is kept** so a retake can be compared. `id`, `smeId`, `answers[]` (`{questionId, value(s)}` — a snapshot, so later question-bank edits don't rewrite past results), `score` (0–100), `pillarScores{}` (six keys), `band` (`emerging`\|`growing`\|`scaling`\|`mature`), `bottlenecks[]` (`{pillar, title, whyItCosts, fixRoute}` — ranked, exactly 3), `takenAt`. Guests can create one (see §3); it attaches to their account on register via the same claim-on-auth flow inquiries use. |
| `growth-needs.json` | A requirement posted by an SME. `id`, `smeId`, `fromBottleneck` (nullable — the `growth-checks` bottleneck it came from), `category`, `title`, `description`, `budgetBand`, `timelineBand`, `location{city,state}`, `matchType` (`directory`\|`provider`\|`ops` — decided by the matcher), `status` (`open`\|`matching`\|`matched`\|`unmatched`\|`closed`), `unmatched` (bool — set when the matcher finds zero, drives the admin queue), `createdAt`. |
| `growth-need-deliveries.json` | Append-only, one row per (need, provider) surface — the Growth equivalent of a lead delivery, **kept separate from Directory's `leads_ledger`** (see below). `id`, `needId`, `providerUserId`, `source` (`growth-provider`\|`directory-seller`), `deliveredAt`, `contactStatus` (`none`\|`called`\|`whatsapped`), `contactedAt`. Written only through the `modules/growth` port. |
| `growth-provider-services.json` | A provider's offering detail — the "separate entity" domain object that would not fit `listings.json`. `id`, `providerUserId`, `category`, `services[]` (free text tags), `budgetBands[]`, `industriesServed[]`, `engagementModel` (`retainer`\|`project`\|`hourly`), `typicalEngagementWeeks`, `caseStudies[]` (`{title, summary, url}`), `status` (`active`\|`paused`). |
| `growth-provider-suggestions.json` | The "suggest a provider" queue — an SME (or admin) naming a firm that should be on the platform. `id`, `suggestedByUserId`, `name`, `contact`, `category`, `note`, `status` (`pending`\|`invited`\|`onboarded`\|`rejected`), `createdAt`. Same mechanic as the Directory RFQ form's "suggest a missing category" flow. |
| `growth-funding-requests.json` | `id`, `smeId`, `needType` (`working-capital`\|`term-loan`\|`equipment`\|`invoice-finance`\|`equity`\|`scheme`), `amountBand`, `purpose`, `readiness{}` (the 6-item checklist — each key `yes`\|`no`\|`unknown`), `status` (`open`\|`with-ops`\|`connected`\|`closed`), `createdAt`. No lender entity in the MVP — the request routes to ops (§3). |
| `growth-schemes.json` | Admin-curated government-scheme catalog. `id`, `name`, `issuingBody`, `schemeType` (`subsidy`\|`credit`\|`grant`\|`training`), `benefitSummary`, `eligibility{turnoverBands[], industries[], states[], entityTypes[]}`, `officialUrl`, `active`. Pure data entry — no integration. |
| `growth-kpis.json` | Self-reported monthly numbers for the dashboard. `id`, `smeId`, `month` (`YYYY-MM`), `revenue`, `newCustomers`, `receivables`, `headcount`, `biggestExpense`, `reportedAt`. **Self-declared** — labelled as such in the UI (see §8). |

### Reused as-is (no new code)

| Existing system | How Growth uses it |
|---|---|
| `backend/lib/uploadStorage.js` `saveFile()` (via `POST /api/uploads`) | Provider logos / cover images / case-study files, and any funding documents — local-disk or S3 by env var, exactly as Directory/Recruitment uploads. No parallel upload route. |
| `backend/lib/notify.js` `createNotification()` | "N providers matched your need", "a provider replied", "your funding request moved to our team". In-app bell rows only — the same no-external-delivery gap DIRECTORY.md §4 flags applies here. |
| `backend/middleware/authGuard.js` | `authGuard` on write routes, `optionalAuth` on the guest-friendly check + public provider pages, `requireRole("admin")` on the admin sub-API. |
| `backend/lib/claudeCli.js` | The Growth assistant and the need-draft refinement — deterministic-first, CLI-refine, never-blank. |
| `POST /api/ai/rfq` (`backend/modules/ai/routes/ai.routes.js`) | **The single most directly reusable piece.** It already turns a free-text business need into a structured brief (regex slot extraction for quantity/timeline, deterministic fallback when AI is down). `/growth/need/new` reuses it verbatim for the free-entry path. |
| `frontend/components/sell/Stepper.tsx` | The 4-step health-check form — generic `Step[]` + guarded nav, already used by `/sell`. |
| `frontend/components/auth/ContactAuthModal.tsx` | The login gate on `/growth/score` (bottlenecks) and on provider Call/WhatsApp — inline login/OTP + register, same as Directory. |
| `frontend/lib/catalog.tsx` | If Growth needs the category tree or featured data, use its hooks — never a per-component `getCategories()` in a `useEffect` (CLAUDE.md §6, the fetch-storm bug). |
| Reviews with `context` (`GET/POST /api/reviews?context=…`) | Recruitment added a `context` column so the same user can be reviewed independently per product. Growth passes `context="growth"` — provider reviews stay out of the Directory seller pool. |

### Deliberately not reused

- **`listings.json` / `lib/db/listings.js`** — a Growth service ("B2B lead-gen retainer, ₹25–50k/mo,
  3-month minimum") has no `productKey`, no boost ranking, no product/service block. `growth-provider-services.json`
  instead. Same call Recruitment made for `jobs.json`.
- **`sellerProfile`** — overloading it a fourth way (base + `expert` + monetization + a Growth block)
  would put every CA firm into seller counts and seller analytics unless every query filtered it out,
  and would add a third case to the "must not leak into Directory browse" gotcha. `growthProviderProfile`
  is its own block.
- **`leads_ledger` / `backend/lib/leads.js`** — owned by `modules/directory`
  (`modules/directory/schema/tables.js`), written only via `lib/leads.js`. A Growth need delivery is
  not a Directory lead (no per-lead billing, no seller quota), so it gets its own
  `growth-need-deliveries.json` rather than a new `leadType`. The `appendConsultationLead` precedent
  shows a new lead type is *possible*, but that keeps Consultations coupled to Directory billing —
  Growth is deliberately not.
- **`modules/directory` repositories, directly** — when the matcher wants to surface an existing
  Directory seller for a Growth need, it reads seller cards through the **`directory` / `identity`
  public ports** (`index.js`), never `modules/directory/repository/*`. A deep import fails
  `backend/test/architecture.test.js`.

---

## 3. Flows (page → endpoint)

### SME

| Step | Frontend | Backend |
|---|---|---|
| Land / hook | `/growth` | `GET /api/config` (flag), static copy |
| Existing-seller entry (pre-filled) | `/growth` CTA when `useAuth()` has `sellerProfile` | `PUT /api/me/growth-profile` seeded from `sellerProfile` (industry, city, size, GST) |
| Health check (4-step) | `/growth/check` | `GET /api/growth/questions` (active bank) → `POST /api/growth/checks` (answers → score, computed server-side) |
| Score + 3 bottlenecks (payoff) | `/growth/score` | `GET /api/growth/checks/:id` (`optionalAuth`) — **guest response omits `bottlenecks[]`**; a logged-in request includes them |
| Unlock bottlenecks (guest → account) | `ContactAuthModal` on `/growth/score` | register / OTP → **parent must refetch `GET /api/growth/checks/:id`** on `onSuccess` (see §7) |
| SME home | `/growth/dashboard` (tabs: Overview / My needs / Funding / Numbers / Business profile) | `GET /api/growth/checks/mine`, `GET /api/growth/needs/mine`, `GET /api/growth/kpis` |
| "Fix this" → post requirement | `/growth/need/new?from=<bottleneckId>` | form **pre-drafted** from the bottleneck; free-entry path calls `POST /api/ai/rfq` first |
| Submit requirement | `/growth/need/new` | `POST /api/growth/needs` → matcher runs synchronously, sets `matchType` + `status` |
| See matches | `/growth/need/[id]` | `GET /api/growth/needs/:id` (+ deliveries). State A matched / B partial→ops / C funding→ops — **same screen shell for all three** |
| Contact a matched provider | `/growth/need/[id]` | provider contact fields via `GET /api/growth-providers/:slug` (`optionalAuth`, gated); `POST /api/growth/needs/:id/contact` records `contactStatus` |
| Suggest a provider | `/growth/need/[id]` (partial-match state) | `POST /api/growth/provider-suggestions` → admin queue |
| Browse the marketplace | `/growth/providers` | `GET /api/growth/providers?category=&city=&budget=&rating=` (native `<select>` filters) |
| Provider profile | `/growth/providers/[slug]` (or `/seller/[slug]`-style route — see §7) | `GET /api/growth-providers/:slug` |
| Funding need + readiness | `/growth/funding` | `POST /api/growth/funding` → `PUT /api/growth/funding/:id/readiness` (checklist); routes to ops |
| Government schemes | `/growth/schemes` | `GET /api/growth/schemes?state=&industry=&turnover=&entityType=&type=` — eligibility computed against `growthProfile` |
| Monthly numbers | `/growth/dashboard?tab=numbers` | `GET/POST /api/growth/kpis` |
| Ask the assistant | assistant panel (reuse `ChatAssistant` shell) | `POST /api/growth/assistant` — grounded in the SME's own `growthProfile` + latest check + scheme catalog only; deterministic "explain my score" first, `claudeCli` refine |
| Retake the check | `/growth/check` (prefilled from last answers) | `POST /api/growth/checks` — new row, dashboard shows the delta |

### Provider

| Step | Frontend | Backend |
|---|---|---|
| Register / login | `/register`, `/login` | Suite-wide auth |
| Become a provider | `/growth/providers/join` | `POST /api/become-growth-provider` (companyName required; `status:"pending"`) |
| Edit provider profile + services | `/dashboard?tab=growth-provider` (new tab in the **existing** shell) | `PUT /api/me/growth-provider`, CRUD `growth-provider-services.json` |
| Incoming requirements | `/dashboard?tab=growth-leads` (new tab) | `GET /api/growth/needs?forProvider=me` (deliveries addressed to this provider) |
| Get verified | provider dashboard | `POST /api/me/growth-verification` → admin queue (own flow, not the seller one — see §1) |

### Admin (`/admin`)

Four new tabs, each a phase-`admin-sub` sub-API under `/api/admin/growth/*` mounted **before** the
blanket `/api/admin` guard (CLAUDE.md §5):

- **Growth queue** — `growth-needs` where `unmatched` is true; manual forward / attach a provider.
  `GET /api/admin/growth/queue`, `POST /api/admin/growth/needs/:id/forward`.
- **Provider approvals** — pending `growthProviderProfile`s and `growth-provider-suggestions`;
  approve / suspend / mark a suggestion invited-or-onboarded. `GET /api/admin/growth/providers/pending`,
  `POST /api/admin/growth/providers/:userId/approve|suspend`, `.../suggestions/:id/:action`.
- **Scheme catalog** — CRUD for `growth-schemes.json`. `GET/POST/PUT/DELETE /api/admin/growth/schemes`.
- **Question bank & weights** — CRUD for `growth-questions.json`; editing an option's `weight`
  re-tunes the score with no deploy. `GET/POST/PUT /api/admin/growth/questions`.

---

## 4. Scoring model

The Growth Score is the product's hook — and it **must be deterministic weighted rules, never AI**.
The SME retakes the check in 90 days and compares the number; if the same answers ever produce a
different score, credibility is gone permanently. The `claude` CLI is used only to *explain* a score
and to draft requirement text — never to compute the number.

### The six pillars

| Pillar | Fed by (section) |
|---|---|
| Sales & Marketing | how customers are found, enquiry volume, conversion, sells-online |
| Finance & Cash | revenue vs target gap, receivables situation, existing debt |
| Operations | years operating, systems/process answers, capacity problems |
| Team | employee count vs revenue, hiring difficulty answers |
| Digital Presence | website, online selling, listing/store presence |
| Compliance | entity type, GST registration, whether financials/ITR are in order |

### Computation

1. Each answer `option` in `growth-questions.json` carries a `weight` (0–100) and its question
   carries a `pillar`.
2. **Pillar score** = the weighted mean of that pillar's answered option weights, normalised to
   0–100.
3. **Overall score** = the weighted mean of the six pillar scores. Pillar weights are admin-set
   (`growth-questions.json` header row or a `settings.json` block) and default to equal.
4. **Band:** `0–40 emerging · 41–60 growing · 61–80 scaling · 81–100 mature`.
5. **Top 3 bottlenecks:** rank the pillars by `(100 − pillarScore) × pillarWeight` (the biggest
   weighted deficits), then override ordering with any problem the SME explicitly multi-selected in
   the check's Step 4 — an explicitly named problem always outranks an inferred one. Take the top 3.
   Each bottleneck row carries a fixed `whyItCosts` sentence and a `fixRoute`:

   | Bottleneck pillar / problem | `fixRoute` |
   |---|---|
   | Sales & Marketing, "not enough leads" | `/growth/need/new` (category: lead generation / demand gen) |
   | Finance & Cash, "working capital" | `/growth/funding` |
   | Team, "can't find people" | `/recruitment` |
   | Digital Presence, "no online presence" | `/growth/need/new` (category: web / digital marketing) |
   | Operations, packaging / logistics / machinery | `/directory` (category deep-link) |
   | Compliance | `/growth/need/new` (category: accounting & GST / legal) |

The methodology (weights, thresholds) should be publishable — an SME asking "why 71?" gets a real
answer from the pillar breakdown, not a black box.

---

## 5. Production gating: the coming-soon switch

Growth is built fully — backend and frontend — while staying invisible in production until a single
deliberate flip. This is a **frontend visibility gate**, not a dev block: backend routes stay
functional throughout the build so they can be tested. Mirror RECRUITMENT.md §5 exactly.

- **Flag:** add `growthLive` to the feature-flag set.
- **Default `false`** — this inverts the codebase's usual convention (every other flag defaults
  `true` so shipped features degrade gracefully if the config fetch fails). Set it in
  `frontend/lib/config.tsx`'s `DEFAULT_FLAGS` with a one-line comment noting the inversion is
  intentional: an unfinished product must never go live because a fetch failed. `recruitmentLive`
  and `consultationsLive` are the existing precedents in that object.
- **Env override (primary switch):** add `GROWTH_LIVE` to `backend/lib/config.js` as the same
  three-state read as `RECRUITMENT_LIVE` (`"true"` → `true`, `"false"` → `false`, unset → `null`).
  `backend/modules/platform/routes/config.routes.js` applies it: when
  `config.GROWTH_LIVE !== null`, it overrides `featureFlags.growthLive` from the stored
  `settings.json` value before `GET /api/config` returns. Flip the env var + restart, no admin step,
  no redeploy.
- **Admin toggle (secondary):** when the env var is unset, `featureFlags.growthLive` is editable in
  `frontend/components/admin/SiteConfigTab.tsx` (the flags grid) → `PUT /api/admin/settings`
  (`backend/modules/platform/routes/admin.routes.js`) → persisted in `settings.json`.
- **What checks the flag:**
  - `frontend/components/suite/SuiteNavMenu.tsx`'s `useModules()` — add a Growth entry with
    `status: featureFlags.growthLive ? "live" : "soon"` (Recruitment's entry is the template).
  - `frontend/components/Footer.tsx`'s local `modules` memo — same, kept in lockstep with the nav.
  - `frontend/components/home/AgentHeroCard.tsx`'s local `PRODUCTS` array — add Growth with a
    `"Coming soon"` badge that the flag drops when live.
  - **A new `frontend/components/growth/GrowthGate.tsx`** — reads
    `useConfig().featureFlags.growthLive`, renders `GrowthComingSoon` when off (not a redirect, not a
    404). `frontend/app/growth/layout.tsx` wraps everything under `/growth/*`. **Any Growth-reachable
    route outside that tree needs its own explicit `<GrowthGate>` wrap** — the exact trap `/job/[id]`,
    `/post-job` and `/employer/[slug]` hit for Recruitment. The provider tabs added to the shared
    `/dashboard` shell must gate on the flag too (like `sellerOnly`/`expertOnly` tabs do in
    `DashboardShell.tsx`).
- **Not in scope for the switch:** backend route access — `/api/growth/*` is not gated by
  `growthLive`; nothing links to it from a gated-off UI, and the routes need to work for testing.

---

## 6. Build roadmap

Built in phases; keep this section current as phases land. Both agreed phase-1 slices ship together —
the diagnosis core *and* funding + schemes (the latter needs zero provider supply, so it doubles as a
day-one lead magnet).

### Phase 0 — this doc
🔲 Not started.

### Phase 1 — Module + data model + gate
🔲 `modules/growth` skeleton (`index.js` port, `mount.js`, `schema/tables.js`), the ten collections
above, `growthProfile` / `growthProviderProfile` blocks on `modules/identity`, schema migration,
`growthLive` flag wired per §5 (default `false`, `GROWTH_LIVE` env, `GrowthGate`, nav/footer/hero
entries), `GrowthComingSoon`. Idempotent demo seed (`backend/scripts/seed-growth-demo.js`).

### Phase 2 — Diagnosis core
🔲 `growth-questions` bank + admin CRUD + weights; `POST /api/growth/checks` deterministic scorer
(§4) + `GET` readers with the guest/account split; `/growth` landing (both entry variants),
`/growth/check` 4-step form (reusing `Stepper.tsx`), `/growth/score` payoff screen with
`ContactAuthModal` unlock + **refetch-on-success**.

### Phase 3 — Requirements + matching + marketplace
🔲 `POST /api/growth/needs` + synchronous matcher (provider match → Directory-seller suggestion via
ports → `unmatched` → ops queue); `/growth/need/new` (pre-drafted + `POST /api/ai/rfq` free-entry
path), `/growth/need/[id]` three-state screen; `/growth/providers` browse; provider profile page;
`POST /api/become-growth-provider` + provider dashboard tabs + own verification flow; admin
Growth-queue and Provider-approvals tabs; `growth-provider-suggestions`.

### Phase 4 — Funding + schemes
🔲 `/growth/funding` (need + 6-item readiness checklist → ops), `/growth/schemes` finder with
profile-based eligibility, admin scheme-catalog CRUD.

### Phase 5 — Dashboard + assistant
🔲 `/growth/dashboard` tabbed shell (own component tree, mirroring `DashboardShell` gating — the
`RecruitmentDashboardShell` precedent), score-trend Overview, `growth-kpis` Numbers tab,
`POST /api/growth/assistant` grounded assistant.

### Deferred (explicitly out of MVP)
🔲 Accounting / GST / Tally / Zoho integration for real KPIs (self-reported until then). Real lender
/ investor entities and any matching there (ops-fulfilled in MVP). Outbound WhatsApp campaigns, a CRM,
buyer-discovery databases — the brief's "AI Business Manager" list that needs data the platform does
not hold (§8). External notification delivery (shared with the whole suite's gap).

---

## 7. Gotchas the next dev must know

- **Restart the backend after backend edits** — plain `node index.js`, no hot reload.
- **`admin-sub` mounts before the blanket `/api/admin` guard.** Add the Growth admin sub-API as an
  `admin-sub` entry in `modules/growth/mount.js`'s `MOUNTS`; `app.js` runs every module's `admin-sub`
  phase before `platform`'s `admin` phase. The op sits under an inner `/admin/*` in the router.
- **A route reaches another domain only through its `index.js` port.** The matcher reads Directory
  sellers via the `directory` / `identity` ports — never `modules/directory/repository/*`.
  `backend/test/architecture.test.js` fails on a deep import and on a route file naming another
  module's owned table in raw SQL.
- **Refetch on auth-unlock — do not just re-render.** `GET /api/growth/checks/:id` omits
  `bottlenecks[]` for a logged-out request. A `/growth/score` page that fetched the check while
  logged out has `bottlenecks` permanently `undefined` in React state; `useAuth()`'s `user` turning
  truthy does not change already-fetched data. The page must pass an `onUnlocked` callback to
  `ContactAuthModal` that **refetches** the check. This exact bug class already bit
  `SellerContactCard.tsx` / `SellerHeader.tsx` (`onContactUnlocked`) and `ApplyModal.tsx` — CLAUDE.md §9.
- **Lazy-mount any modal that seeds state from `useAuth()`.** A `useState(user?.growthProfile?.city)`
  initializer runs on first render, before `/api/auth/me` resolves, and stays stale. Mount the modal
  only when opened (`{open && <Modal …/>}`) or resync with a `useEffect` keyed on the prop.
- **`request<T>()` in `frontend/lib/api.ts` drops top-level `meta`.** If a Growth list endpoint
  returns `{data, meta}` (paginated provider browse), use a raw `fetch` that keeps both.
- **Use `lib/catalog.tsx` hooks, never a per-component `getCategories()` in a `useEffect`** — the
  fetch-storm that caused the "first click does nothing" bug (CLAUDE.md §6).
- **Provider profile route.** Reusing the literal `/seller/[slug]` page is tempting but a growth
  provider is not a seller (§1) — give it `/growth/providers/[slug]` with its own component, sharing
  only leaf atoms (`Avatar`, `Rating`, `Badge`, `ContactAuthModal`).
- **Design rules are enforced** — no emojis (inline SVG line-glyphs), native `<select>` filters,
  local images only, zero 390px overflow, `en-IN` ₹ formatting, `null` price → "Custom quote".
- **AI degrades gracefully** — if the `claude` CLI is absent, the score still computes (it never
  needed AI), the need form still drafts from the deterministic `POST /api/ai/rfq` fallback, and the
  assistant falls back to "explain your score" from the stored pillar breakdown. Never blank.

---

## 8. Open questions for the client

Not padding — these are decisions the build cannot make on its own:

1. **The dashboard KPIs are self-reported.** The brief's dashboard shows *Revenue ₹42L/mo,
   Receivables ₹27L, Cash flow ₹8L, Conversion 8.2%*. The platform cannot show any of that unless
   the SME types it in monthly (`growth-kpis.json`). It will be labelled **self-declared** in the UI.
   Real figures need a Tally / Zoho Books / GST-portal integration — a phase-3+ build with ongoing
   maintenance, not an MVP promise.
2. **Score benchmarks.** "Peers your size average 3 sales channels" needs real industry data the
   platform will not have on day one. Phase 1 uses expert-set thresholds; the comparative language
   softens ("most growing businesses…") until enough checks accumulate to compute real percentiles.
3. **Manual fallback has a ceiling.** Concierge fulfilment of unmatched needs and funding requests
   works for roughly the first ~100 SMEs and strains around ~1,000. The ops headcount plan needs to
   exist before marketing scales.
4. **Funding referral revenue is regulated.** Loan-referral / DSA arrangements in India carry
   RBI implications. The brief's "referral / arrangement revenue where legally permitted" is carrying
   weight — this needs legal review **before** any "we'll arrange your loan" copy appears in the UI.
   Until then the Funding Hub is a readiness checklist + a manual introduction, nothing more.
5. **This is the suite's most sensitive data.** Revenue, debt, receivables, CIBIL, business problems
   — far beyond the phone number the Directory holds. Growth needs its own access-control review and
   a data-retention policy (how long is an abandoned health check kept?), not the suite defaults.
6. **Provider commission.** The brief proposes 5–15% commission from providers. The suite takes no
   payments (CLAUDE.md §2), so any commission is billed off-platform and reconciled manually, or the
   model stays subscription + lead-fee like the Directory. Confirm which before the provider
   onboarding copy is written.
