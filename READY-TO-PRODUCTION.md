# READY-TO-PRODUCTION.md — going live plan (draft)

> **Status: draft, pending client confirmation.** This is a living reference — update it as pricing changes, as vendors are actually purchased, or as the client picks a plan. Don't treat any figure here as a locked quote; re-check current vendor pricing before committing spend. A non-technical, client-shareable version of this plan lives at `docs/production-plan/BharatSource-Production-Readiness-Guide.docx` and `.xlsx` (gitignored — not part of this repo's history, regenerate locally if needed).

Companion docs: **CLAUDE.md** (architecture/rules this plan must not violate), **SECURITY.md** (pre-go-live checklist this plan closes several items on), **DIRECTORY.md** (flags the notification-delivery and rate-limiting gaps this plan addresses), **HANDOVER.md** (existing storage/env setup this plan extends).

---

## 1. What's changing and why

BharatSource today runs entirely on free, developer-only stand-ins:

| Area | Today (dev) | Problem for production |
|---|---|---|
| Login | OTP is faked — echoed back in the API response, plus a hardcoded `123456` master code | No real SMS ever sends; can't verify a real user's phone |
| AI | Shells out to a `claude` CLI authenticated by one developer's personal Claude Code subscription | Doesn't exist on a production server; not billed/metered per the business |
| File storage | Saved to one server's local disk (`frontend/public/uploads/`) | Lost on redeploy; breaks the moment there's more than one server |
| Notifications | In-app bell rows only (`backend/lib/notify.js`) | A seller/candidate only finds out about a lead/application if they happen to open the app |
| Hosting | Local dev machine (`localhost:3000` / `:4000`) | Not reachable by the public at all |

This doc is the plan to close all five gaps, plus add Google login as a second sign-in path (not previously in the app at all).

---

## 2. Decisions log

Fill this in as choices get made — this is the section to keep most up to date.

| Decision | Options | Chosen | Date | Notes |
|---|---|---|---|---|
| Which of the 3 hosting plans (§5) | Bootstrap / Growth / Scale | _pending_ | | |
| SMS/WhatsApp provider | MSG91 / Twilio / other | _pending_ | | |
| File storage provider | Cloudflare R2 / AWS S3 | _pending_ | | |
| Email provider | AWS SES / other | _pending_ | | |
| DLT registration started? | — | _pending_ | | Starts the ~1 week compliance clock — see §6 |
| Anthropic (AI) account created? | — | _pending_ | | |

---

## 3. Every API / service — what it does, why this one, what it costs

| Category | Service | Provider | Why this one | Pricing |
|---|---|---|---|---|
| Login | Mobile OTP delivery | **MSG91** | Cheapest per-OTP rate for India, purpose-built OTP API (not raw SMS), simplest path to DLT compliance | ₹0.15–0.25/OTP, tiered down with volume |
| Login | Google sign-in | **Google Cloud Console** | The login method users already expect; verifying an ID token is a small one-time integration | Free — no charge at any volume |
| Login (compliance) | SMS registration (DLT) | TRAI-authorised DLT operator, via MSG91 | Legally mandatory in India before sending any transactional/OTP SMS — not a vendor choice | ₹6,500 one-time + ₹590/yr header renewal |
| AI | Search-intent parsing, RFQ drafting, chat assistant | **Anthropic — Claude Haiku 4.5** (`claude-haiku-4-5`) | Cheapest/fastest current tier; these are short, structured, classification/extraction-shaped tasks | $1.00 / MTok input, $5.00 / MTok output |
| AI | Listing-photo autofill (vision), content moderation | **Anthropic — Claude Sonnet 5** (`claude-sonnet-5`) | Needs stronger reasoning/vision quality than Haiku reliably gives | $3.00 / MTok in, $15.00 / MTok out ($2.00/$10.00 intro through 2026-08-31) |
| Storage | Product photos, résumés, logos | **Cloudflare R2** | Cheapest at scale — $0 egress vs S3's per-download charge, and the app is read-heavy | $0.015/GB stored, $0 egress |
| Storage (already wired, no code change) | Same, fallback option | AWS S3 | Zero engineering effort (already the built `uploadStorage.js` path) but costs more at real traffic | $0.023/GB + $0.09/GB egress |
| Notifications | Email alerts | **AWS SES** | Cheapest transactional email at any volume (5–10x cheaper than SendGrid/Resend past free tier) | $0.10 / 1,000 emails |
| Notifications | SMS alerts | MSG91 (same account as OTP) | No new vendor | ₹0.15–0.25/SMS |
| Notifications | WhatsApp alerts | MSG91 WhatsApp API | Passes through Meta's own rate, no markup | ₹0.11 (utility, most alerts) – ₹0.86 (marketing) per message |
| Hosting | Compute — Bootstrap tier | Hetzner Cloud VPS | Lowest raw compute cost | ~$9–10/month |
| Hosting | Compute — Growth tier | Vercel (frontend) + Railway/Render (backend) | Managed deploys, zero-downtime, purpose-built for Next.js | ~$150–220/month combined |
| Hosting | Compute — Scale tier | AWS/GCP autoscaling | Handles traffic spikes, multi-instance | $600–1,500+/month |
| Database | Postgres — Bootstrap | Self-hosted on the same VPS | No extra cost; manual backups | Included in server cost |
| Database | Postgres — Growth/Scale | Neon or DigitalOcean Managed DB (Growth) / managed RDS/Cloud SQL + replica (Scale) | Automated backups, no DBA needed | ~$15–25/month (Growth), scales up (Scale) |
| Domain | Web address | Any registrar | One-time-per-year purchase | ₹800–1,000/year |
| Domain | SSL certificate | Let's Encrypt / Cloudflare | Free, auto-renewing | Free |

---

## 4. Recruitment — no separate decision needed

`backend/routes/applications.js` already reuses the exact same `uploadStorage.js` (résumé files) and `notify.js`'s `createNotification` (employer/candidate alerts) that Directory and Consultations use. Whatever gets chosen in §3 for storage/notifications automatically covers Recruitment once its own `recruitmentLive` feature flag is separately turned on — that flag is an unrelated go-live switch, not an infra cost.

---

## 5. Three hosting/infrastructure plans

### Plan A — Bootstrap (~₹1,200/month, ~$14)
- One Hetzner Cloud VPS running Next.js (via PM2) + Express together.
- Self-hosted Postgres on the same box — no extra cost, manual `pg_dump` backups.
- Cloudflare R2 for storage.
- OTP + Google login live; email/SMS/WhatsApp notifications optional add-on at this tier.
- **Trade-off:** one server = single point of failure; manual deploys.
- **Best for:** validating the product with real users before spending more.

### Plan B — Growth (~₹16,000/month, ~$190) — recommended next step
- Vercel (frontend) + Railway/Render (backend), each managed separately.
- Managed Postgres (Neon or DigitalOcean) with automated backups.
- Cloudflare R2, sized for more traffic.
- Full notification suite: email + SMS + WhatsApp all live.
- Zero-downtime deploys.
- **Trade-off:** more services to track, far less manual ops work.
- **Best for:** once the app is business-critical, day to day.

### Plan C — Scale (₹60,000+/month, ~$700+)
- AWS/GCP autoscaling compute + load balancer, multi-instance.
- Managed database + live read replica/standby.
- S3 or R2 + CDN in front.
- **Trade-off:** highest reliability, meaningfully more expensive, usually needs dedicated DevOps.
- **Best for:** tens of thousands of active users — not a day-one choice.

**Recommendation:** start on Bootstrap; move to Growth once manual VPS maintenance becomes the actual bottleneck (the point most apps at this stage reach anyway); Scale is not warranted until real scale.

---

## 6. One-time and usage-based costs (outside the monthly plan price)

| Item | Frequency | Cost |
|---|---|---|
| SMS compliance registration (DLT) | Once + yearly renewal | ₹6,500 + ₹590/yr |
| Domain name | Yearly | ₹800–1,000/yr |
| OTP SMS | Per message | ₹0.15–0.25 |
| WhatsApp alert | Per message | ₹0.11–0.86 |
| Email alert | Per 1,000 emails | ~$0.10 (~₹9) |
| AI (search/chat/drafting) | Per ~1,000 requests | Low tens of ₹/month at moderate traffic — watch the Anthropic Console |

---

## 7. From local to live — step by step

1. Buy the domain, point its DNS (keep pointed at current host until go-live day).
2. Start DLT registration early — needs company PAN/GST, ~1 week to clear, don't let it block other work.
3. Open vendor accounts: MSG91, Google Cloud Console, Anthropic Console, Cloudflare, AWS — sign-up only.
4. Add billing + set spend limits (Anthropic Console, AWS budgets) as a safety net.
5. Set real API keys in the production server's environment (`ANTHROPIC_API_KEY`, `MSG91_AUTH_KEY`, `GOOGLE_CLIENT_ID`, AWS creds, etc. — see Part 1–3 of the engineering plan below for exact var names).
6. Provision hosting for the chosen plan (§5).
7. Point the database at production; run pending migrations.
8. Switch `UPLOAD_STORAGE` from `local` to `s3`/R2.
9. Test end-to-end: OTP login, Google login, AI search, file upload, and at least one real email/SMS/WhatsApp alert — with real accounts, not dev shortcuts.
10. Point the live domain at the production server; confirm HTTPS.
11. Confirm dev-only shortcuts (OTP echoed in the API response, `123456` master code) are disabled outside dev — this is already gated behind `config.isDev`, just verify `NODE_ENV=production` is actually set.
12. Watch vendor billing dashboards daily for the first week.

---

## 8. Engineering implementation detail

The code-level implementation plan (exact files, functions, line numbers, env vars, and verification steps for each of the four areas below) is more detailed than belongs in this business-facing doc. It was developed and reviewed in-session and should be re-derived or re-requested from the assistant when implementation actually starts, covering:

- **Part 1 — Auth:** real MSG91 OTP delivery (`backend/lib/sms.js` new, `backend/routes/auth.js` `send-otp` wired to it) + Google login (new `POST /api/auth/google`, `google-auth-library`, `googleId` field on the user model, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on the frontend, "Sign in with Google" button on `/login`, `/register`, and `ContactAuthModal.tsx`).
- **Part 2 — AI:** switching on `ANTHROPIC_API_KEY` (the SDK path already exists for 3 of 4 AI features), fixing the `assistant.js` model mismatch (`claude-opus-5` → `claude-haiku-4-5`), adding the missing SDK path to `lib/listingVerification.js` (content moderation, currently CLI-only), prompt caching on the category-list prefix, and per-user rate limiting on `routes/ai.js`.
- **Part 3 — Storage & notifications:** the small `endpoint`/`forcePathStyle` addition to `uploadStorage.js`'s `S3Client` needed for R2 (real AWS S3 needs zero code change), and a new `notifyDelivery.js` layer that sends email/SMS/WhatsApp alongside the existing 6 in-app notification types (`new_follower`, `new_lead`, `consultation_request`, `new_application`, `application_status`, `application_withdrawn`).
- **Part 4 — Hosting:** deployment mechanics per chosen tier (§5).

Update this section with a real technical plan file path once implementation is scheduled.
