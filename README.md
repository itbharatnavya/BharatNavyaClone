# BharatSource

A multi-product **suite** for India — an umbrella brand over several products that share
one account. Built with **Next.js 14 (App Router) + TypeScript** on the frontend and
**Node.js + Express with file-based JSON storage** on the backend (no external database).

The design is light, clean and mobile-first: a blue brand accent (`#2563EB`) with an orange
action accent (`#F97316`), a token-based design system, inline-SVG icons (no emojis), and
native form controls. AI search runs through the local **`claude` CLI** — the app's own
Claude Code subscription, not a paid API key.

> **New here? Read the docs in this order:** [CLAUDE.md](CLAUDE.md) (architecture + conventions,
> for humans and AI agents) → [HANDOVER.md](HANDOVER.md) (setup & run) → [DIRECTORY.md](DIRECTORY.md)
> (the flagship product's flows + roadmap) → [SECURITY.md](SECURITY.md) (**read before deploying**).

---

## The suite

| Product | Route | Status | What it does |
| --- | --- | --- | --- |
| **Directory** | `/directory` | ✅ Live | B2B/B2C marketplace — buyers discover products & suppliers, send enquiries/RFQs. Lead model: **no payments, no cart**. |
| **Consultations** | `/consultations` | ✅ Live | Hire verified experts (CAs, lawyers, consultants…) via fixed-price **packages** and lead-based booking. |
| **Credit Card** | `/credit-card` | 🔜 Soon | Placeholder. |
| **Mutual** | `/mutual` | 🔜 Soon | Placeholder. |

The suite homepage (`/`) is an umbrella landing with an AI concierge that routes a plain-language
need ("CA in Pune for GST", "stainless steel sheets in Mumbai") to the right product.

---

## Tech stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind + a CSS-variable design system (`frontend/app/globals.css`).
- **Backend:** Node.js + Express (CommonJS). Auth via JWT (`jsonwebtoken` + `bcryptjs`); search via `minisearch`; validation via `zod`; file locking via `proper-lockfile`; realtime chat via `socket.io`.
- **Storage:** JSON / JSONL files in `backend/DB/` — read/written through `backend/lib/store.js`. **No database.**
- **AI:** the local `claude` CLI (`backend/lib/claudeCli.js`), used to refine weak/empty searches; deterministic search runs first and AI never returns a blank result.
- **One origin:** the browser calls `/api/*` on `:3000`; `frontend/next.config.mjs` proxies it to the API on `:4000`, so a single port serves UI + API (no CORS).

---

## Quick start

```bash
# Backend  (terminal 1)
cd backend && cp .env.example .env      # set JWT_SECRET — see SECURITY.md
npm install && node index.js            # http://localhost:4000

# Frontend (terminal 2)
cd frontend && cp .env.local.example .env.local
npm install && npm run dev              # http://localhost:3000
```

Open **http://localhost:3000**. The backend is plain `node` (no hot reload) — restart it after
backend edits. Full setup, seeding, and login details are in **[HANDOVER.md](HANDOVER.md)**.

> **Security note:** the old default admin login (`admin123`) has been rotated and demo passwords
> changed. Get the current admin password from the owner, and complete **[SECURITY.md](SECURITY.md)**
> before exposing this on any shared network or deploying.

---

## Response envelope

Every API response uses:

```json
{ "success": true,  "data": ... }
{ "success": false, "error": "descriptive message" }
```

31 route modules under `backend/routes/` (listings, categories, brands, inquiries, reviews,
experts, consultations, ai, admin, …). See **[DIRECTORY.md](DIRECTORY.md)** for the endpoint map
and product flows.

---

Made in India.
