# HANDOVER.md — developer setup & handover

Welcome to **BharatSource**. This gets you running in ~5 minutes and points you at the
deeper docs. If you're an AI agent, read **CLAUDE.md** first. Before touching security or
deploying, read **SECURITY.md**. For the flagship product's flows + what to build next,
read **DIRECTORY.md**.

> The repo path contains a space (`…/Personal /Projects/…`). **Quote paths** in shell.

---

## What you're getting

A Zoho-style **suite** of products under one brand and one account:
- **Directory** (live) — a lead-based B2B/B2C marketplace (no payments/cart).
- **Consultations** (live) — hire experts with fixed-price packages (lead-based booking).
- **Credit Card** & **Mutual** (coming-soon placeholders).

Stack: **Next.js 14 (App Router) + TypeScript** frontend on **:3000**, **Node + Express** API
on **:4000**, **file-based JSON storage** (no external DB), AI via the local **`claude` CLI**.

```
bharatsource/
├── CLAUDE.md            ← AI-agent onboarding (architecture, rules, gotchas)
├── HANDOVER.md          ← you are here
├── SECURITY.md          ← pre-go-live checklist (READ before exposing/deploying)
├── DIRECTORY.md         ← Directory product: flows + Done/Partial/Missing + roadmap
├── README.md            ← short project intro
├── DESIGN.md / BUILD-SPEC.md / FRONTEND-PAGES-SPEC.md  ← original specs (partly stale)
├── backend/             ← Express API + file-DB
│   ├── index.js         ← app entry + route mounts
│   ├── routes/          ← 31 route modules (listings, categories, ai, experts, admin, …)
│   ├── lib/             ← store.js (file-DB), auth, config, claudeCli, search, …
│   ├── scripts/         ← seed/migration scripts (rebuild demo data)
│   └── DB/              ← the "database": *.json / *.jsonl  (demo data + PII — keep private)
└── frontend/            ← Next.js app
    ├── app/             ← App Router pages (29 routes)
    ├── components/      ← 114 components (incl. dashboard/*, consultations/*, suite/*)
    └── lib/             ← api.ts (typed client), types.ts, auth, i18n, config
```

---

## Prerequisites
- **Node 18+** (developed on Node 24) and npm.
- **The `claude` CLI**, logged into a Claude Code subscription — powers AI search/RFQ.
  Without it the app still runs; AI features fall back to deterministic search (never blank).
- macOS or Linux. (Windows: use WSL — the shell scripts assume a POSIX shell.)

---

## First-time setup

```bash
# 1) Backend env — set a real JWT secret (see SECURITY.md)
cd "…/bharatsource/backend"
cp .env.example .env
#   then edit .env:  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
npm install

# 2) Frontend env (can stay empty for the default single-origin setup)
cd "…/bharatsource/frontend"
cp .env.local.example .env.local
npm install
```

## Run (two terminals)

```bash
# Terminal 1 — API
cd "…/bharatsource/backend" && node index.js      # http://localhost:4000

# Terminal 2 — UI
cd "…/bharatsource/frontend" && npm run dev        # http://localhost:3000
```

Open **http://localhost:3000**. The browser only talks to :3000; `/api/*` is proxied to the
backend by `next.config.mjs`, so you don't call :4000 directly.

> The backend has **no hot reload** (plain `node index.js`). After editing anything under
> `backend/`, **restart it**. The frontend hot-reloads on save.

---

## Logging in

- **Admin** (`/admin`): `admin@bharatsource.in` — **password provided by the owner separately**
  (it was rotated away from the old default for security — see SECURITY.md). Or set your own via
  `ADMIN_PASSWORD` before seeding.
- **Demo seller/buyer accounts**: created by the seed scripts with password **`demo123`**
  (e.g. any seller email printed by `node scripts/seed-demo2.js`, or a buyer like
  `rohan.mehta@example.com`). **Demo only — rotate/remove before go-live.**
- **Login also supports mobile + OTP.** In dev the OTP is returned by the API for convenience
  (must be disabled in prod — SECURITY.md).

---

## The database & seeding

- `backend/DB/` **is the database** — it ships with the repo already populated, so a fresh
  clone runs with demo content immediately. Keep the repo **private** (it contains PII + password hashes).
- To **rebuild demo data from scratch**, run the seed scripts (each mostly idempotent). Rough order:
  ```bash
  cd "…/bharatsource/backend"
  node scripts/migrate-users.js          # users + admin (prints a random admin pw if ADMIN_PASSWORD unset)
  node scripts/seed-categories.js        # category tree   (+ seed-empty-categories.js)
  node scripts/migrate-sellers-listings.js
  node scripts/seed-demo.js && node scripts/seed-demo2.js   # demo buyers/vendors/products
  node scripts/seed-multi-vendor.js      # same product, multiple sellers
  node scripts/seed-monetization.js      # plans / per-lead / ad slots
  node scripts/seed-features.js          # admin feature catalog + entitlements
  node scripts/seed-siteconfig.js        # editable site config
  node scripts/seed-experts.js           # Consultations experts + packages
  node scripts/localize-images.js        # point demo media at local /demo images
  ```
  If a fresh rebuild misbehaves, the shipped `backend/DB/` is the source of truth — copy it back.

---

## Day-to-day checks (the project's definition of "done")
- Frontend types: `cd frontend && npx tsc --noEmit` → must be clean.
- API smoke: `curl -s http://localhost:4000/api/config` → `200`.
- Page compiles: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/<path>`.
- Responsive: verify **zero horizontal overflow at 390px** (the owner is strict on this).
- Design rules (enforced): **no emojis** (inline SVG only), **native `<select>`** for filters,
  **local images only**, light design tokens. See CLAUDE.md §2/§6.

---

## Sharing on a local network (demos)
Both servers already bind to all interfaces. Anyone on the **same Wi-Fi** can open
`http://<your-LAN-ip>:3000` (find it with `ipconfig getifaddr en0` on macOS). One URL/port serves
everything. For access **beyond** the LAN, front it with a Cloudflare Tunnel / ngrok — and read
SECURITY.md first (the admin panel is reachable at `/admin`).

---

## Deployment sketch (see SECURITY.md for the hard requirements)
1. A small VM (2 vCPU / 2–4 GB is plenty for the file-DB at POC scale).
2. Run backend (`node index.js`) and frontend (`npm run build && npm start`) under a process
   manager (pm2/systemd). Keep the **`claude` CLI logged in** on the host for AI.
3. Put a reverse proxy (Caddy/Nginx/Cloudflare Tunnel) in front of **:3000** for HTTPS.
4. Set production `JWT_SECRET` + `ADMIN_PASSWORD` + `NODE_ENV=production`.
5. Schedule a **backup of `backend/DB/`** (it's the whole database).

---

## Where to go next
- **Building on the Directory?** → `DIRECTORY.md` has the flows, a Done/Partial/Missing feature
  inventory, and a **P0 → P2 roadmap**. The Directory is already feature-built — the job is to
  **productionize + finish**, not start from scratch.
- **Hardening for launch?** → `SECURITY.md`.
- **Understanding conventions / picking up as an AI agent?** → `CLAUDE.md`.
