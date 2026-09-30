# CHAT-PLAN.md — Product-tagged chat with seller (Directory)

Companion doc, referenced from **DIRECTORY.md** §3 and §8. Read **CLAUDE.md** first (architecture + rules).

## Status

All 8 phases landed and verified via backend smoke tests (tsc clean, real create-conversation/send-message/notification round trip against local Postgres). Two things are NOT yet verified and need a human/browser pass before calling this fully done:
1. Manual click-through in an actual browser (Call/WhatsApp/Chat buttons, modal open/close, deep-link from a notification) — the session that built this had no browser/CDP tool available, only curl + a raw socket.io-client smoke test.
2. 390px overflow check on the 3-button row and the chat modal.

### UI bugs caught in real browser use (post-verification, fixed)
- **3-button row mid-word wrap**: `SellerContactCard.tsx`'s Call/WhatsApp/Chat row is `flex:1` per button — at that width, side-by-side icon+label ("WhatsApp") wrapped mid-word ("Wha tsAp p"). Fixed by stacking icon above a small `nowrap` label (`contactBtnStyle`/`contactBtnLabelStyle`) for all three buttons; added a phone icon to Call for visual parity.
- **Send button squeezed to one letter per line**: `ChatThread.tsx`'s composer `<input>` had no `flex:1`, so its own CSS `width:100%` made it claim the full row, leaving the Send button almost no space. Fixed with `flex:1, minWidth:0` on the input and `flexShrink:0, whiteSpace:"nowrap"` on the Button.
- **WebSocket connect failure** (`ws://localhost:3000/socket.io/...` failed): `frontend/.env.local` had no `NEXT_PUBLIC_SOCKET_URL`, so `lib/socket.ts` fell back to the page origin (`:3000`, no Socket.IO there) instead of the backend (`:4000`). Added `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` — **this must also be set on the testing server / prod pointing at that environment's backend origin**, same class of "works locally, forgotten elsewhere" risk as a schema migration (CLAUDE.md §9).

### Real bug caught during verification (worth knowing before touching notifications again)
`backend/DB` notifications live in a **fixed-column schema**, not a free-form JSON blob — `notifications` table has `data_name`, `data_buyer_id`, `data_inquiry_id`, `data_product_name`, `data_message`, `data_link`, `data_booking_id`, `data_package_title`, `data_job_id`, `data_job_title`, `data_application_id`, `data_candidate_name`, `data_status`, `data_follower_id` and nothing else — `repoForCollection`'s mapper silently drops any `data.*` key outside that whitelist (no error, just gone). The first `new_message` notification payload (`{from, conversationId, listingId, listingTitle, preview, link}`) lost everything except `link` on write. Fixed by reusing the existing columns instead of adding new ones: `{name, message, productName, link}` — same shape `notifySellerOfLead` already writes. `NotificationBell.tsx`'s `describe()` was updated to match (`data.name` via the existing `who` var, not `data.from`). No migration needed, and none should be added for this feature — the existing columns cover it. If a future notification type genuinely needs a field outside this whitelist, that's a real migration (see CLAUDE.md's migration gotcha — must run on every target DB, not just local).

Checkboxes below are updated as each phase lands — this file is kept current, not written once and left stale.

- [x] Phase 0 — create this file, reference it from DIRECTORY.md
- [x] Phase 1 — backend: `GET /api/chat/conversations/:id`, batch-hydrate `listingTitle` on list + single-fetch, verify `listingId`-optional create path
- [x] Phase 2 — backend: `new_message` notification hook in `realtime/chat.js` (best-effort, self-notify guarded, correct `link`)
- [x] Phase 3 — frontend: extract `ChatThread` from `InboxTab.tsx`, fix `otherUserId`/`otherUserName` bug
- [x] Phase 4 — frontend: `ChatModal` (new), wire into `SellerContactCard.tsx` + `SellerHeader.tsx` (3rd button, own-listing hide, auth gate, `?chat=<id>` deep link)
- [x] Phase 5 — frontend: mount `InboxTab` in `DashboardShell.tsx`, `?tab=inbox&c=<id>` deep link, listing tag on rows/thread
- [x] Phase 6 — feature flag `flagOn("chat", true)` — no collision: `backend/DB/settings.json` already had `featureFlags.chat: true` seeded (default was already correct, unused until now)
- [x] Phase 7 — docs: update CLAUDE.md §2 and DIRECTORY.md (§3 "Contact seller" row, §8 gaps/roadmap) to reflect the reversed decision
- [x] Phase 8 — verification pass (tsc, curl/socket smoke test; manual browser click-through and 390px overflow check still pending — no browser tool available in the session that built this)
- [x] Phase 9 — real-time in-app push (while a tab is open): every authenticated socket auto-joins `user:<id>` (`realtime/chat.js`); `notifyNewMessage` emits a `notification` event there in addition to the DB row; `NotificationBell.tsx` listens on the same socket singleton `ChatThread` opens, toasts (`useToast`, "info") and bumps the unread badge instantly instead of waiting on the 30s poll. The 30s poll stays as the fallback/reconciler and still covers notification types nothing pushes live yet (new_lead, new_review, …).
- [x] Phase 10 — FCM push (reaches the user when no tab is open — browser closed/backgrounded, eventually native app). Built and working locally; NOT yet configured on the testing server. See "Phase 10 — FCM push" section below.
- [x] Phase 11 — seller-side product inbox: on a seller's OWN listing, Chat is now shown (was previously hidden entirely by `isOwnListing`) but opens `ProductInboxModal` — every buyer's thread about that one product, list + thread like the dashboard Inbox but scoped to one `listingId`, with the same live-update behavior as Phase 9. Call/WhatsApp remain hidden on your own listing (unchanged). Buyer-side Chat flow is untouched.

## Phase 10 — FCM push

### Why this is separate from Phase 9
Phase 9 (done) pushes a toast + live badge over the **existing Socket.IO connection** — it only reaches a browser tab that's open right now with a live connection. FCM (Firebase Cloud Messaging) is a different delivery path: a **push notification from Google's servers** that reaches the device even when the tab/browser is closed or the app is backgrounded, via a service worker (web) or the OS push channel (native app, later). Both are worth having — Phase 9 for "user is here right now," FCM for "user isn't, tell them anyway."

### What the owner needs to do first (only the account owner can do this — Google account, billing-adjacent)
1. Go to the [Firebase Console](https://console.firebase.google.com), sign in with the Google account this project should live under.
2. **Create a project** — name it something like `bharatsource-dev` (or one shared project for local + testing server both, simplest for now; a separate `bharatsource-prod` later when going live). Google Analytics prompt during creation is optional, skip it.
3. Cloud Messaging is enabled by default on a new project. Open **Project settings → Cloud Messaging** tab.
4. Under **Web configuration → Web Push certificates**, click **Generate key pair**. This gives a **VAPID key** — the frontend needs this to request a push subscription in the browser. Copy it.
5. Still in Project settings, go to **Service accounts** tab → **Generate new private key**. This downloads a JSON file (service account credentials) — the **backend** needs this to actually send pushes via `firebase-admin`. Treat this file like `JWT_SECRET`: never commit it, never paste its contents into chat/logs.
6. Also grab the **Web app config** (Project settings → General → "Your apps" → add a Web app if none exists) — a small `{apiKey, authDomain, projectId, messagingSenderId, appId}` object the frontend SDK needs to initialize.

### Status: built and wired, local-only so far (2026-09-30)

Owner created a `bharatnavya-dev` Firebase project and dropped the credentials into `backend/private/` (service account JSON + a `creds.txt` with the VAPID key and web config). `backend/private/` was added to `backend/.gitignore` before anything else touched that folder — confirmed via `git status` that it was never tracked.

**Real gotcha hit during build**: `firebase-admin` v14 (what actually installed) is fully modular — there is no `admin.credential.cert()` / `admin.messaging()` namespace anymore (that's the old v9-style API most docs/tutorials still show). It's `cert` from `firebase-admin/app` and `getMessaging` from `firebase-admin/messaging`, same shape as the modular client SDK. `lib/fcm.js` uses the correct modular imports; if this ever gets "fixed" back to the namespaced style, it'll throw `Cannot read properties of undefined (reading 'cert')` again — that's exactly the error hit and fixed while building this.

**What was built:**
- **Migration**: `backend/lib/db/schema-migrations/0017_add_fcm_tokens.sql` — `fcm_tokens(token PK, user_id, platform, created_at, last_seen_at)`, owned by `identity` (added to `modules/identity/schema/tables.js`). Also added to `lib/db/schema.sql` (the fresh-install baseline) per the migration script's own doc comment. **Applied to local only** (`npm run migrate-schema`) — MUST also be run against the testing server's DB before this works there (`PG_URL=<testing-server-url> npm run migrate-schema`), same class of miss as the Google-OAuth incident.
- **Backend port**: `modules/identity/index.js` — `registerFcmToken`, `unregisterFcmToken`, `getFcmTokensForUser`, `pruneFcmTokens` (upsert-on-conflict by token; dead tokens pruned automatically when Firebase reports one as unregistered).
- **Backend routes**: `modules/identity/routes/fcm.routes.js` — `POST /api/fcm/token`, `DELETE /api/fcm/token`, both `authGuard`. A device token is never echoed back in any response.
- **`backend/lib/fcm.js`**: `isFcmAvailable()` / `sendPush(tokens, {title,body,link}, onInvalidTokens)`. No-ops (never throws) if `FCM_SERVICE_ACCOUNT_PATH` is unset or the file is missing — same "absent config = feature off" contract as `GOOGLE_CLIENT_ID`.
- **Wired into `realtime/chat.js`'s `notifyNewMessage`**: after the DB row + Phase 9's socket push, fetches the recipient's tokens and calls `fcm.sendPush` — fire-and-forget (`void`), never awaited by the send path.
- **Frontend**: `frontend/public/firebase-messaging-sw.js` (background handler + `notificationclick` → focuses/opens the right `link`), `frontend/lib/fcm.ts` (`registerPushToken()` — requests permission once, registers the token), called from `NotificationBell.tsx` on mount (only rendered once logged in). `firebase` added as an npm dependency (frontend), `firebase-admin` (backend).
- **Env vars — local only right now**: `backend/.env`'s `FCM_SERVICE_ACCOUNT_PATH`, `frontend/.env.local`'s `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. **Not yet set on the testing server** — until they are (env vars + the service account file uploaded there + the migration run there), push silently no-ops in that environment, same as local did before today.

### Before this is "done" (not just "built locally")
1. Run `0017_add_fcm_tokens.sql` against the testing server's DB.
2. Get the service account JSON onto the testing server (NOT via git — same gitignored-file discipline, uploaded directly or via the host's secret-manager equivalent) and set `FCM_SERVICE_ACCOUNT_PATH` there.
3. Set the same `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_FIREBASE_VAPID_KEY` vars in the testing server's frontend env, rebuild (these are baked in at build time, not runtime).
4. Manual test on a real device/browser: grant notification permission, background the tab (or close it), send a message from the other side, confirm the OS-level push notification appears and clicking it opens the right chat.

## Phase 11 — seller-side product inbox

### Why
The original design only ever gave a seller a single buyer's thread (or none — `isOwnListing` hid Chat entirely on their own listing). But a popular product gets messages from many different buyers, and a seller standing on their own product page has no way to see any of it without going to the dashboard Inbox and hunting for the right conversations. This closes that gap directly on the listing page.

### Design
- `isOwnListing` no longer hides Chat (Call/WhatsApp still hidden — unchanged, calling yourself is still nonsensical). Button label switches to "Messages" instead of "Chat" for this case (`SellerContactCard.tsx`).
- Clicking it (own listing) opens `components/chat/ProductInboxModal.tsx` — NOT the single-thread `ChatModal`. No `createConversation` call (a seller isn't starting a thread, just viewing existing ones), no auth gate (already authenticated as themselves by definition).
- `ProductInboxModal` is list+thread, same shape as the dashboard `InboxTab`, scoped to one `listingId`: left pane lists every buyer conversation about this product, right pane is the open thread via the same shared `ChatThread`. Live updates via the same `"message"` socket event pattern as `InboxTab`'s top-level listener — a new message from any buyer bumps that row (preview/unread/re-sort) even if their thread isn't the one currently open.
- **Backend**: `GET /api/chat/conversations` gained an optional `?listingId=` filter (`chat.routes.js`) — additive, existing callers (no param) get everything as before. Verified via curl: filtering to a listing with one thread returns exactly that one, an unrelated listing returns `[]`, and the unfiltered call still returns everything including non-product (general) conversations.
- **Refactor while building this**: the socket-payload-parsing helper (`normalizeIncoming`) was duplicated in `InboxTab.tsx` and `ChatThread.tsx`; extracted to `frontend/lib/chatSocket.ts` (`normalizeIncomingMessage`, `ChatMsg` type) since `ProductInboxModal` needed the exact same logic a third time — both existing call sites were switched over rather than adding a fourth copy.
- Buyer-side flow is completely untouched — a buyer still gets the single-thread `ChatModal` tied to their own conversation with the seller.

### Files
`frontend/components/chat/ProductInboxModal.tsx` (new), `frontend/lib/chatSocket.ts` (new, extracted), `frontend/components/listing/SellerContactCard.tsx` (own-listing branch), `frontend/components/dashboard/InboxTab.tsx` + `frontend/components/chat/ChatThread.tsx` (switched to the extracted helper), `backend/modules/chat/routes/chat.routes.js` (`listingId` query filter).

## Context

Directory currently gates seller contact behind Call/WhatsApp only (login-gated, per CLAUDE.md §2 / DIRECTORY.md §3). A full Socket.IO chat system was already built in an earlier phase — backend routes/realtime, DB tables, frontend API client, types, and a complete dashboard chat tab (`InboxTab.tsx`) — but it was deliberately **not surfaced** on buyer-facing pages, and `InboxTab` was never mounted into the dashboard. CLAUDE.md §2 and DIRECTORY.md §3/§8 all say "don't re-add a chat button" — that was the old decision.

Owner has now reversed this: a **Chat** icon alongside Call/WhatsApp on the listing page and seller profile, so a buyer can message a seller about a **specific product** (tagged so the seller can identify which listing the thread is about), viewable both as an in-page modal (fast, no navigation away from the product) and from a full dashboard Inbox tab (all conversations in one place). Notifications deep-link back to the right place — the listing page's chat modal if the thread is about a product, dashboard Inbox otherwise (including when a seller gets notified about a message on their own listing).

~80% of the plumbing already existed and is reused, not rebuilt — this is wire-up + small backend hydration + one new shared UI component, not a new chat system.

## What already existed (reused, not rebuilt)

- **Backend**: `backend/modules/chat/routes/chat.routes.js` — `GET/POST /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`. Conversation already carries `listingId` (nullable, part of the get-or-create match key) — product-tagging was already a first-class field, just needed hydrating with the listing's title/thumbnail for display.
- **Realtime**: `backend/realtime/chat.js` — JWT-authed socket, `convo:<id>` rooms, `joinConversation`/`sendMessage`/`typing` events, emits `message`/`typing`.
- **Frontend API/types**: `frontend/lib/api.ts` (`getConversations`, `createConversation(listingId, toUserId)`, `getMessages`) and `frontend/lib/types.ts` (`Conversation`, `Message`) — `createConversation` had zero callers, now wired up. `frontend/lib/socket.ts` — socket singleton.
- **Dashboard chat UI**: `frontend/components/dashboard/InboxTab.tsx` — full list+thread UI, socket wiring, optimistic send. Existed on disk, was not imported anywhere. Had a real bug: it read `otherName()`/`otherAvatar()` off `participantsInfo`, but the backend actually returns `otherUserId`/`otherUserName` — fixed in Phase 3.
- **Contact pattern mirrored**: `frontend/components/listing/SellerContactCard.tsx` — `ContactSeller.userId`'s own comment said "used to open a conversation." Call/WhatsApp are feature-flag gated (`flagOn("call"/"whatsapp", true)`), hidden via `isOwnListing`, and logged-out taps open `ContactAuthModal` before proceeding. Same gate pattern applies to Chat.
- **Product-tagging precedent**: `LeadsTab.tsx`/`inquiries.routes.js` denormalize `productName`/`listingId` onto lead rows server-side, batched (not per-row) — same batching discipline applied to hydrating `listingTitle` onto conversations.

## Design

### 1. Shared `ChatThread` component
`frontend/components/chat/ChatThread.tsx` — message-list + composer + socket join/send/listen logic, extracted out of `InboxTab.tsx`. Props: `{ conversationId, listingTitle?, otherUserName, onClose? }`. `InboxTab` renders it in its right-hand pane; `ChatModal` renders it inside `Modal.tsx` (existing atom). One thread implementation, not two divergent ones.

### 2. `ChatModal` — listing page + seller profile
`frontend/components/chat/ChatModal.tsx` — wraps `ChatThread` in `Modal.tsx`, header shows product name (if `listingId` present) + seller/buyer name, close button.

- **Listing page** (`SellerContactCard.tsx`): Chat as a 3rd equal-weight button next to Call/WhatsApp. Hidden when `isOwnListing` (mirrors Call/WhatsApp). Logged-out tap → `ContactAuthModal` gate → `onSuccess` proceeds. Logged-in tap → `createConversation(listing.id, seller.userId)` (get-or-create) → open `ChatModal`, no page navigation.
- **Seller profile** (`SellerHeader.tsx`): same 3-button row, same gate. `createConversation(undefined, seller.userId)` — general conversation, not tied to one product.
- **Deep-link open** (`?chat=<conversationId>` on `/listing/[id]`): on mount, if present and user authenticated, fetch that one conversation and open `ChatModal` automatically — **not gated on `isOwnListing`**, since this is how a seller replies to a buyer's message about their own listing from a notification.

### 3. Backend: single-conversation fetch + hydration
- `GET /api/chat/conversations/:id`, participant-checked (403 otherwise, mirrors the `/messages` route).
- Both list and single-fetch batch-hydrate `listingTitle` (+ thumbnail) for conversations with a non-null `listingId`, via `directory`'s listings port (`id = ANY($1)`, never per-row).
- Frontend `getConversation(id)` wrapper in `lib/api.ts`.

### 4. Notification on new message
- `realtime/chat.js`'s `sendMessage` handler, after persistence, best-effort `notify.createNotification(recipientUserId, "new_message", {...})` — mirrors `notifySellerOfLead`, self-notify guarded, never blocks message delivery.
- `link`: has `listingId` → `/listing/<listingId>?chat=<conversationId>`; else → `/dashboard?tab=inbox&c=<conversationId>`.

### 5. Dashboard Inbox tab
- `InboxTab` registered in `DashboardShell.tsx`'s `ALL_TABS` (both buyers and sellers).
- `otherName()`/`otherAvatar()` fixed to read `otherUserId`/`otherUserName`.
- `listingTitle` tag per row and in thread header, clickable to the listing.
- `?tab=inbox&c=<conversationId>` deep-link opens that thread on mount.

### 6. Feature flag
- `flagOn("chat", true)`, default **on** — same mechanism as `call`/`whatsapp`, kill-switch not staged rollout.

## Non-regression checklist

- No DB schema migration needed — `conversations.listingId` already existed.
- New route `GET /api/chat/conversations/:id` doesn't shadow/get shadowed by `GET /api/chat/conversations/:id/messages`.
- Hydration fields are additive only — nothing renamed/removed on the conversation payload.
- Notification hook wrapped in its own try/catch, called after the socket `message` emit, never blocks delivery; only notifies the other participant.
- `isOwnListing` gating for Call/WhatsApp untouched — Chat only adds a 3rd button using the same condition.
- `ContactAuthModal` reused unchanged (`purpose="contact"`), no new purpose variant.
- `DashboardShell.tsx`'s new `inbox` tab entry matches the exact shape every other `ALL_TABS` entry uses.
- Feature-flag key `"chat"` checked for collisions before use.
- Socket auth/room/participant-check logic in `realtime/chat.js` untouched — notification hook is additive only.
- Backend restarted after edits (`node index.js`, no hot reload) before verifying.

## Suggested UX polish (not required for MVP)

- Prefill first message: "Hi, I'm interested in `<product title>`" — mirrors the WhatsApp prefilled `wa.me` message.
- Pin a small product card (thumbnail + title + price) at the top of `ChatThread` when `listingId` is set.
- Surface the socket `typing` event (already emitted server-side) in `ChatThread`.
- Native-`<select>` filter-by-product in the Inbox tab list for sellers with many concurrent product threads.
- "Continue in chat" CTA on the RFQ/enquiry success state.

## Files touched

**Backend**: `backend/modules/chat/routes/chat.routes.js`, `backend/realtime/chat.js`, `backend/modules/identity/index.js`, `backend/modules/identity/routes/fcm.routes.js` (new), `backend/modules/identity/mount.js`, `backend/modules/identity/schema/tables.js`, `backend/lib/fcm.js` (new), `backend/lib/config.js`, `backend/lib/db/schema.sql`, `backend/lib/db/schema-migrations/0017_add_fcm_tokens.sql` (new).

**Frontend**: `frontend/components/chat/ChatThread.tsx` (new), `frontend/components/chat/ChatModal.tsx` (new), `frontend/components/chat/ProductInboxModal.tsx` (new), `frontend/lib/chatSocket.ts` (new), `frontend/lib/fcm.ts` (new), `frontend/public/firebase-messaging-sw.js` (new), `frontend/components/listing/SellerContactCard.tsx`, `frontend/components/seller/SellerHeader.tsx`, `frontend/components/dashboard/InboxTab.tsx`, `frontend/components/dashboard/DashboardShell.tsx`, `frontend/components/NotificationBell.tsx`, `frontend/components/Toast.tsx`, `frontend/lib/api.ts`, `frontend/lib/types.ts`, `frontend/app/listing/[id]/page.tsx`.

**Docs**: `CLAUDE.md` §2, `DIRECTORY.md` §3/§8.

## Verification

- `cd frontend && npx tsc --noEmit` clean.
- `curl -s http://localhost:4000/api/chat/conversations/<id>` (authed) returns hydrated `listingTitle`.
- Manual, two logged-in sessions (buyer + seller): tap Chat on a listing → modal opens → send a message → seller gets a `new_message` notification whose link opens the same listing's chat modal directly → Inbox tab in dashboard shows the same thread with the product tag, `?tab=inbox&c=<id>` deep-link opens it.
- `isOwnListing` hides the initiate-Chat button but does not block the `?chat=<id>` deep-link modal.
- Logged-out tap on Chat shows `ContactAuthModal`, not a silent failure.
- Visual/overflow check at 390px on the 3-button row and the modal.
