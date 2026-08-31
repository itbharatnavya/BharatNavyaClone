# SECURITY.md — pre-go-live checklist

This app was built as a POC and is being hardened for launch. This file records what
has already been fixed and what still must be done **before real users or exposing the
machine on a shared/office network**. See also **HANDOVER.md** and **CLAUDE.md**.

> Paths contain a space (`…/Personal /Projects/…`) — quote them in shell.

---

## ✅ Already fixed (2026-08)

1. **Default admin login rotated.** The seeded default `admin@bharatsource.in / admin123`
   was live and guessable (it was printed in seed scripts). The admin password has been
   rotated to a strong random value. `admin123` no longer works.
   *The new admin password was handed to the owner directly — it is NOT stored in this repo.*
2. **Demo expert password rotated.** The demo login `expert123` (on the Sharma & Associates
   expert account) was rotated to a strong random value; `expert123` no longer works.
3. **JWT secret rotated.** `backend/.env` `JWT_SECRET` was replaced with 48 random bytes.
   (Rotating it invalidated all existing tokens — everyone simply logs in again.)
4. **`.gitignore` added** at the repo root. It protects `backend/.env`, `frontend/.env.local`,
   `node_modules/`, build output, logs, and runtime uploads. **This exists so your FIRST
   `git init` + commit does not leak the JWT secret.** Verify before committing:
   `git status --ignored | grep -E '\.env'` should show them ignored.
5. **`.env.example` templates added** (`backend/.env.example`, `frontend/.env.local.example`)
   so a fresh clone knows which vars to set — without shipping secret values.
6. **Seed scripts no longer hardcode a weak admin password.** `scripts/migrate-users.js` now
   reads `ADMIN_PASSWORD` from the environment, or generates a strong random one and prints
   it once. Re-seeding can never re-introduce `admin123`.

---

## ❗ Must do before go-live

### Secrets & accounts
- [ ] **Generate a production `JWT_SECRET`** on the production host and set it in `backend/.env`
      (never reuse the dev value): `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. The server **refuses to boot in production** (`NODE_ENV=production`) if it's unset — that guard is intentional; don't remove it.
- [ ] **Set a real admin password** via `ADMIN_PASSWORD` before seeding, or change it in-app after first login. Use a password manager.
- [ ] **Wipe or reset all demo accounts.** Many demo users share `demo123` (created by
      `scripts/seed-demo2.js`). Before real signups, either wipe demo users from `backend/DB/users.json`
      or reset their passwords. Demo users can only manage their own listings (not admin), but they're still guessable.
- [ ] **Confirm no secrets are committed:** `git ls-files | grep -E '\.env$|\.env\.local$'` must be empty.
      Keep the repo **private** — `backend/DB/` holds demo data + bcrypt password hashes + PII (emails, mobiles).

### Network & transport
- [ ] **Don't expose the raw dev servers to an untrusted network.** For LAN demos the app is
      reachable at `http://<host-ip>:3000` (single origin proxies the API). On a shared office
      network that means anyone can reach `/admin` — acceptable only with the rotated admin
      password and ideally behind the OS firewall or a tunnel with access control.
- [ ] **Serve over HTTPS in production** (a reverse proxy — Caddy/Nginx/Cloudflare Tunnel —
      terminating TLS in front of Next on :3000). JWTs and login posts must not travel in clear.
- [ ] **Set `CORS_ORIGIN`** in `backend/.env` if the API is ever hosted on a different origin
      than the UI (the default single-origin proxy doesn't need it).

### Application hardening (backend)
- [ ] **Add rate limiting** on auth + write endpoints (login, OTP, register, inquiry, review) —
      e.g. `express-rate-limit`. Currently none.
- [ ] **Confirm input validation coverage.** `zod` and `lib/validate.js` exist — verify every
      write route validates its body (see DIRECTORY.md for which are partial).
- [ ] **OTP delivery:** in dev the login OTP is returned in the API response for convenience.
      **Ensure it is NOT returned in production** and is actually sent via SMS. (Grep `routes/auth.js` for the OTP-in-response path.)
- [ ] **File-DB durability:** `lib/store.js` uses `proper-lockfile`, but confirm writes are
      atomic (write-temp-then-rename) and add a **backup/snapshot** of `backend/DB/` (cron copy or
      git-crypt private repo). A crash mid-write must not corrupt a collection. (See DIRECTORY.md P0.)
- [ ] **Uploads:** confirm where base64 image uploads persist (`routes/uploads.js`) and cap
      size/type; move to disk (`public/uploads/`, gitignored) or object storage, not into JSON.
- [ ] **Security headers:** add `helmet` (or equivalent) for sensible defaults.
- [x] **Account-level suspend** (2026-08-27, ADMIN-CONSOLE.md Phase 7). `users.status = "suspended"`
      is enforced in `middleware/authGuard.js` (403 `account_suspended` on every authenticated request),
      at `POST /api/auth/login` and `/verify-otp`, and degrades to guest under `optionalAuth`. Admin
      accounts and self cannot be suspended. Note: existing tokens are rejected on their next request
      (no server-side session/blacklist needed) since `authGuard` reloads the user every request.
- [ ] **Dependency audit:** `npm audit` in both `backend/` and `frontend/`. Known note: two
      residual highs need a Next.js major upgrade — evaluate `npm audit` output and plan it.

### Data & privacy
- [ ] **Backups + retention** for `backend/DB/` (it's the whole database).
- [ ] A short **privacy note** on what buyer/seller data is stored (the footer already links Privacy/Terms — wire real content).

---

## How to verify the fixes right now

```bash
API=http://localhost:4000
# old creds dead:
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@bharatsource.in","password":"admin123"}'      # → success:false
# .env ignored by git (after `git init`):
git check-ignore backend/.env frontend/.env.local                    # → prints both paths
```

---

## Notes for whoever hardens this
- The **AI concierge uses the local `claude` CLI**, not an API key. In production keep the host
  logged into the Claude Code subscription; if the CLI is unavailable the app degrades gracefully
  (deterministic search still works). Do not switch to `ANTHROPIC_API_KEY` without owner approval — it starts billing.
- **No payments anywhere** — there is no payment surface to secure, by design.
