-- BharatSource relational schema.
--
-- One real table per collection, real typed columns per JSON key. Nested arrays of
-- objects become child tables (FK + position, to preserve original order). Simple
-- string arrays become native Postgres text[] columns (still fully queryable via
-- ANY()/unnest()/GIN index). The one genuinely open-ended key/value map
-- (product.specifications, which varies per product category) is an EAV child table.
-- A few sub-lists (priceTiers, variants, portfolio) have never been populated in the
-- source data, so their exact shape is unconfirmed — they get a couple of guessed
-- common columns plus an `extra jsonb` catch-all; tighten once real data exists.
--
-- Every statement is idempotent (IF NOT EXISTS) — safe to re-run.
--
-- This file is the BASELINE for a brand-new database (`npm run setup-pg-schema`).
-- Once a database exists, schema CHANGES go through lib/db/schema-migrations/ instead
-- (run with `npm run migrate-schema`) — each new column/table gets its own numbered
-- .sql file there, tracked in a `schema_migrations` table so it runs exactly once.
-- This file still gets updated to match (so a *fresh* install doesn't need the old
-- migrations replayed), but an existing database is never assumed to be caught up
-- just because this file changed.

-- ── counters (id generation, replaces DB/_counters.json) ─────────────────────────
CREATE TABLE IF NOT EXISTS counters (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);

-- ── users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  mobile              TEXT NOT NULL,
  email               TEXT,
  password_hash       TEXT,
  avatar_url          TEXT,
  city                TEXT,
  state               TEXT,
  roles               TEXT[] NOT NULL DEFAULT '{}',
  interests           TEXT[] NOT NULL DEFAULT '{}',
  contact_visibility  TEXT,
  -- Recruitment role lock (RECRUITMENT.md enhancement pass) — see
  -- 0004_add_recruitment_role_and_questions.sql for the full rationale.
  recruitment_role            TEXT CHECK (recruitment_role IS NULL OR recruitment_role IN ('candidate', 'recruiter')),
  recruitment_role_locked_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_mobile_idx ON users(mobile);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_roles_idx ON users USING GIN(roles);

-- 1:1, present only when the user is a seller.
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name            TEXT NOT NULL,
  slug                    TEXT UNIQUE NOT NULL,
  about                   TEXT,
  logo                    TEXT,
  cover_image             TEXT,
  gst_number              TEXT,
  year_established        INTEGER,
  employee_count          TEXT,
  website                 TEXT,
  contact_mobile          TEXT,
  contact_email           TEXT,
  location_city           TEXT,
  location_state          TEXT,
  location_pincode        TEXT,
  status                  TEXT,
  is_verified             BOOLEAN NOT NULL DEFAULT false,
  trust_seal_verified     BOOLEAN NOT NULL DEFAULT false,
  verified_badge_expiry   TIMESTAMPTZ,
  rating                  NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count            INTEGER NOT NULL DEFAULT 0,
  response_rate           NUMERIC(6,2) NOT NULL DEFAULT 0,
  -- flattened from sellerProfile.performance (small fixed object)
  perf_on_time_delivery       NUMERIC(6,2),
  perf_avg_response_time_hrs  NUMERIC(8,2),
  perf_repeat_buyers          INTEGER,
  perf_order_completion       NUMERIC(6,2),
  perf_performance_score      NUMERIC(6,2),
  plan_id                 TEXT,
  plan_tier                TEXT,
  plan_start_date          TIMESTAMPTZ,
  plan_end_date            TIMESTAMPTZ,
  plan_status               TEXT,
  listing_limit             INTEGER,
  lead_quota_per_cycle       INTEGER,
  leads_consumed             INTEGER NOT NULL DEFAULT 0,
  lead_quota_reset_date      TIMESTAMPTZ,
  featured_credits           INTEGER NOT NULL DEFAULT 0,
  per_lead_price              NUMERIC(10,2),
  rank_boost_score            NUMERIC(10,2) NOT NULL DEFAULT 0,
  priority_tier                TEXT,
  is_featured_seller           BOOLEAN NOT NULL DEFAULT false,
  featured_start_date          TIMESTAMPTZ,
  featured_end_date            TIMESTAMPTZ,
  boost_category_ids           TEXT[] NOT NULL DEFAULT '{}',
  boost_keywords                TEXT[] NOT NULL DEFAULT '{}',
  boost_geo_locations           TEXT[] NOT NULL DEFAULT '{}',
  analytics_enabled              BOOLEAN NOT NULL DEFAULT false,
  account_manager_id             TEXT,
  admin_notes                     TEXT,
  pan_number                      TEXT,
  cin_number                      TEXT,
  annual_turnover                 TEXT,
  nature_of_business              TEXT,
  certifications                  TEXT[] NOT NULL DEFAULT '{}',
  legacy_categories               TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS seller_profiles_slug_idx ON seller_profiles(slug);
CREATE INDEX IF NOT EXISTS seller_profiles_status_idx ON seller_profiles(status);

-- child array: sellerProfile.locations[]
CREATE TABLE IF NOT EXISTS seller_locations (
  id        TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES seller_profiles(user_id) ON DELETE CASCADE,
  label     TEXT,
  city      TEXT,
  state     TEXT,
  pincode   TEXT,
  address   TEXT,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS seller_locations_seller_idx ON seller_locations(seller_id);

-- 1:1, present only when sellerProfile.expert is set.
CREATE TABLE IF NOT EXISTS expert_profiles (
  user_id               TEXT PRIMARY KEY REFERENCES seller_profiles(user_id) ON DELETE CASCADE,
  profession            TEXT,
  profession_key        TEXT,
  headline               TEXT,
  registration_body      TEXT,
  registration_no        TEXT,
  credential_verified     BOOLEAN NOT NULL DEFAULT false,
  specializations         TEXT[] NOT NULL DEFAULT '{}',
  languages                TEXT[] NOT NULL DEFAULT '{}',
  experience_years         INTEGER,
  consultation_modes       TEXT[] NOT NULL DEFAULT '{}',
  response_time             TEXT,
  free_intro_call            BOOLEAN NOT NULL DEFAULT false,
  clients_served              INTEGER
);

-- child array: sellerProfile.expert.caseStudies[]
CREATE TABLE IF NOT EXISTS expert_case_studies (
  id        SERIAL PRIMARY KEY,
  expert_id TEXT NOT NULL REFERENCES expert_profiles(user_id) ON DELETE CASCADE,
  title     TEXT,
  result    TEXT,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS expert_case_studies_expert_idx ON expert_case_studies(expert_id);

-- 1:1, present only when a legacy (pre-migration) record exists on the user.
CREATE TABLE IF NOT EXISTS user_legacy (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company            TEXT,
  gst_number         TEXT,
  website            TEXT,
  annual_turnover    TEXT,
  active_years       INTEGER,
  trust_score        NUMERIC(6,2),
  -- flattened from legacy.verification (small fixed object)
  gst_verified       BOOLEAN NOT NULL DEFAULT false,
  website_verified   BOOLEAN NOT NULL DEFAULT false,
  phone_verified     BOOLEAN NOT NULL DEFAULT false,
  email_verified     BOOLEAN NOT NULL DEFAULT false,
  linkedin_presence  BOOLEAN NOT NULL DEFAULT false
);

-- ── categories ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  parent_id     TEXT REFERENCES categories(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  path          TEXT[] NOT NULL DEFAULT '{}',
  type          TEXT,
  icon          TEXT,
  description   TEXT,
  facets        TEXT[] NOT NULL DEFAULT '{}',
  listing_count INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);

-- ── listings ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                     TEXT PRIMARY KEY,
  seller_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL CHECK (type IN ('product', 'service')),
  title                  TEXT NOT NULL,
  slug                   TEXT NOT NULL,
  description            TEXT,
  category_id            TEXT REFERENCES categories(id) ON DELETE SET NULL,
  legacy_category        TEXT,
  category_path          TEXT[] NOT NULL DEFAULT '{}',
  keywords               TEXT[] NOT NULL DEFAULT '{}',
  -- flattened from listings.location (small fixed object)
  location_city          TEXT,
  location_state         TEXT,
  location_pincode       TEXT,
  location_lat           NUMERIC(9,6),
  location_lng           NUMERIC(9,6),
  location_pan_india     BOOLEAN,
  status                 TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating                 NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count           INTEGER NOT NULL DEFAULT 0,
  is_verified_seller     BOOLEAN NOT NULL DEFAULT false,
  is_featured            BOOLEAN NOT NULL DEFAULT false,
  featured_start_date    TIMESTAMPTZ,
  featured_end_date      TIMESTAMPTZ,
  rank_boost_score       NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_sponsored           BOOLEAN NOT NULL DEFAULT false,
  boost_to_top_last_used TIMESTAMPTZ,
  manual_pin_rank        INTEGER,
  location_id            TEXT,
  views                  INTEGER, -- optional in source data (view tracking added later); nullable, not defaulted
  pan_india              BOOLEAN,
  product_key            TEXT,
  service_cities         TEXT[] NOT NULL DEFAULT '{}',
  -- AI-VERIFICATION GATE (backend/lib/listingVerification.js): the whole
  -- { status, score, aiRan, deterministicChecks, ai, summary, reviewedBy, ... }
  -- object, round-tripped as-is (mirrors the file-DB shape 1:1).
  verification           JSONB
);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings(category_id);
CREATE INDEX IF NOT EXISTS listings_type_idx ON listings(type);
CREATE INDEX IF NOT EXISTS listings_slug_idx ON listings(slug);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_keywords_idx ON listings USING GIN(keywords);

-- child array: listings.media[]
CREATE TABLE IF NOT EXISTS listing_media (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS listing_media_listing_idx ON listing_media(listing_id);

-- 1:1, present when listings.type = 'product'.
CREATE TABLE IF NOT EXISTS listing_products (
  listing_id        TEXT PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  sku               TEXT,
  price             NUMERIC(12,2),
  currency          TEXT,
  unit_of_measure   TEXT,
  moq               INTEGER,
  stock_qty         INTEGER,
  availability      TEXT,
  lead_time         TEXT,
  sample_available  BOOLEAN NOT NULL DEFAULT false,
  brand             TEXT,
  condition         TEXT,
  certifications    TEXT[] NOT NULL DEFAULT '{}'
);

-- EAV: product.specifications{} — key set genuinely varies per product category.
CREATE TABLE IF NOT EXISTS listing_product_specifications (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listing_products(listing_id) ON DELETE CASCADE,
  spec_key   TEXT NOT NULL,
  spec_value TEXT
);
CREATE INDEX IF NOT EXISTS listing_product_specs_listing_idx ON listing_product_specifications(listing_id);
CREATE INDEX IF NOT EXISTS listing_product_specs_key_idx ON listing_product_specifications(spec_key);

-- child array: product.priceTiers[] — always empty in current data; shape provisional.
CREATE TABLE IF NOT EXISTS listing_product_price_tiers (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listing_products(listing_id) ON DELETE CASCADE,
  min_qty    INTEGER,
  price      NUMERIC(12,2),
  extra      JSONB,
  position   INTEGER NOT NULL DEFAULT 0
);

-- child array: product.variants[] — always empty in current data; shape provisional.
CREATE TABLE IF NOT EXISTS listing_product_variants (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listing_products(listing_id) ON DELETE CASCADE,
  name       TEXT,
  extra      JSONB,
  position   INTEGER NOT NULL DEFAULT 0
);

-- 1:1, present when listings.type = 'service'.
CREATE TABLE IF NOT EXISTS listing_services (
  listing_id             TEXT PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  pricing_model          TEXT,
  service_mode           TEXT,
  availability_schedule  TEXT,
  experience_years       INTEGER,
  team_size              TEXT,
  sla                    TEXT,
  warranty               TEXT,
  booking_type           TEXT,
  timeline               TEXT,
  service_area           TEXT[] NOT NULL DEFAULT '{}',
  credentials            TEXT[] NOT NULL DEFAULT '{}',
  deliverables           TEXT[] NOT NULL DEFAULT '{}'
);

-- child array: service.rateCard[]
CREATE TABLE IF NOT EXISTS listing_service_rate_card (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listing_services(listing_id) ON DELETE CASCADE,
  label      TEXT,
  price      NUMERIC(12,2),
  unit       TEXT,
  position   INTEGER NOT NULL DEFAULT 0
);

-- child array: service.portfolio[] — always empty in current data; shape provisional.
CREATE TABLE IF NOT EXISTS listing_service_portfolio (
  id         SERIAL PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listing_services(listing_id) ON DELETE CASCADE,
  extra      JSONB,
  position   INTEGER NOT NULL DEFAULT 0
);

-- ── flat collections (scalar + simple array columns only, no child tables) ──────

CREATE TABLE IF NOT EXISTS ad_slots (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  placement_type TEXT,
  default_size  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ad_bookings (
  id                   TEXT PRIMARY KEY,
  ad_slot_id           TEXT REFERENCES ad_slots(id) ON DELETE SET NULL,
  seller_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  placement_type       TEXT,
  creative_image_url   TEXT,
  target_url           TEXT,
  headline             TEXT,
  category_ids         TEXT[] NOT NULL DEFAULT '{}',
  start_date           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  priority             INTEGER,
  status               TEXT,
  amount               NUMERIC(12,2),
  impressions_served   INTEGER,
  clicks               INTEGER,
  slot_id              TEXT,
  listing_id           TEXT REFERENCES listings(id) ON DELETE SET NULL,
  payment_record_id    TEXT,
  created_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blogs (
  id            TEXT PRIMARY KEY,
  seller_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT,
  slug          TEXT,
  cover_image   TEXT,
  body          TEXT,
  category_id   TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        TEXT,
  published_at  TIMESTAMPTZ,
  views         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS boost_requests (
  id           TEXT PRIMARY KEY,
  seller_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  listing_id   TEXT REFERENCES listings(id) ON DELETE CASCADE,
  boost_type   TEXT,
  days         INTEGER,
  amount       NUMERIC(12,2),
  status       TEXT,
  created_at   TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS category_suggestions (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  note         TEXT,
  context      TEXT,
  suggested_by TEXT,
  status       TEXT,
  count        INTEGER,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collections (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT,
  subtitle        TEXT,
  cover_image     TEXT,
  listing_ids     TEXT[] NOT NULL DEFAULT '{}',
  category_slugs  TEXT[] NOT NULL DEFAULT '{}',
  brand_slugs     TEXT[] NOT NULL DEFAULT '{}',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id              TEXT PRIMARY KEY,
  expert_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  expert_slug     TEXT,
  expert_name     TEXT,
  package_id      TEXT,
  package_title   TEXT,
  name            TEXT,
  mobile          TEXT,
  email           TEXT,
  preferred_date  TEXT,
  preferred_time  TEXT,
  mode            TEXT,
  message         TEXT,
  status          TEXT,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS features (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  "group"      TEXT,
  description  TEXT,
  audience     TEXT,
  plans        TEXT[] NOT NULL DEFAULT '{}',
  status       TEXT,
  phase        INTEGER
);

CREATE TABLE IF NOT EXISTS follows (
  id           TEXT PRIMARY KEY,
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);

CREATE TABLE IF NOT EXISTS inquiries (
  id             TEXT PRIMARY KEY,
  buyer_name     TEXT,
  buyer_mobile   TEXT,
  buyer_email    TEXT,
  product_name   TEXT,
  quantity       TEXT,
  message        TEXT,
  listing_id     TEXT REFERENCES listings(id) ON DELETE SET NULL,
  -- No FK to categories: inquiries are immutable historical records of what a buyer
  -- asked for at the time, and can carry a categoryId from a taxonomy that's since
  -- been reorganized/reseeded (seen in the actual demo data). Hard-FK'ing here would
  -- mean a category rename/reseed invalidates or blocks old inquiry history.
  category_id    TEXT,
  intent         TEXT,
  seller_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ,
  stage          TEXT,
  buyer_id       TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS inquiries_seller_idx ON inquiries(seller_id);
CREATE INDEX IF NOT EXISTS inquiries_buyer_idx ON inquiries(buyer_id);

CREATE TABLE IF NOT EXISTS notifications (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             TEXT,
  -- flattened from notifications.data (bounded, type-dependent key set)
  data_follower_id TEXT,
  data_name        TEXT,
  data_buyer_id    TEXT,
  data_inquiry_id  TEXT,
  data_product_name TEXT,
  data_message     TEXT,
  data_link        TEXT,
  data_booking_id  TEXT,
  data_package_title TEXT,
  -- Recruitment (RECRUITMENT.md): new_application / application_status notifications.
  data_job_id      TEXT,
  data_job_title   TEXT,
  data_application_id TEXT,
  data_candidate_name TEXT,
  data_status      TEXT,
  read             BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);

CREATE TABLE IF NOT EXISTS payment_records (
  id                   TEXT PRIMARY KEY,
  seller_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
  related_entity_type  TEXT,
  related_entity_id    TEXT,
  amount               NUMERIC(12,2),
  payment_method       TEXT,
  payment_status       TEXT,
  valid_from           TIMESTAMPTZ,
  valid_to             TIMESTAMPTZ,
  reference_no         TEXT,
  notes                TEXT,
  marked_paid_date     TIMESTAMPTZ,
  created_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quotes (
  id             TEXT PRIMARY KEY,
  inquiry_id     TEXT REFERENCES inquiries(id) ON DELETE CASCADE,
  seller_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  price          NUMERIC(12,2),
  unit           TEXT,
  moq            INTEGER,
  delivery_days  INTEGER,
  note           TEXT,
  valid_until    TIMESTAMPTZ,
  status         TEXT,
  created_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referrals (
  id                TEXT PRIMARY KEY,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  code              TEXT UNIQUE,
  credits           NUMERIC(12,2) NOT NULL DEFAULT 0,
  invited_user_ids  TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason        TEXT,
  details       TEXT,
  status        TEXT,
  created_at    TIMESTAMPTZ,
  resolved_by   TEXT,
  resolved_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reviews (
  id              TEXT PRIMARY KEY,
  target_user_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
  seller_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  direction       TEXT,
  buyer_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  buyer_name      TEXT,
  rating          NUMERIC(3,2),
  review_text     TEXT,
  status          TEXT,
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shortlist (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS shortlist_user_idx ON shortlist(user_id);

CREATE TABLE IF NOT EXISTS stories (
  id               TEXT PRIMARY KEY,
  seller_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type       TEXT,
  media_url        TEXT,
  caption          TEXT,
  link_listing_id  TEXT REFERENCES listings(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  views            INTEGER NOT NULL DEFAULT 0,
  is_highlight     BOOLEAN NOT NULL DEFAULT false,
  status           TEXT
);
CREATE INDEX IF NOT EXISTS stories_seller_idx ON stories(seller_id);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                          TEXT PRIMARY KEY,
  name                        TEXT,
  tier                        TEXT,
  billing_cycle               TEXT,
  listing_limit               INTEGER,
  lead_quota_per_cycle        INTEGER,
  featured_credits_per_cycle  INTEGER,
  rank_boost_baseline         NUMERIC(10,2),
  verified_badge_included     BOOLEAN NOT NULL DEFAULT false,
  analytics_enabled           BOOLEAN NOT NULL DEFAULT false,
  per_lead_price              NUMERIC(10,2),
  -- flattened from priceInfo (small fixed object)
  price_monthly               NUMERIC(10,2),
  price_currency               TEXT,
  price_label                  TEXT,
  tier_rank                    INTEGER
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id            TEXT PRIMARY KEY,
  seller_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  gst_number    TEXT,
  pan_number    TEXT,
  note          TEXT,
  status        TEXT,
  created_at    TIMESTAMPTZ,
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ
);

-- singleton admin config: ranking scalars are real columns (compared directly in
-- lib/ranking.js); free-form admin UI config blocks stay jsonb (not queried/joined on).
CREATE TABLE IF NOT EXISTS settings (
  singleton                     BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  w_organic                     NUMERIC(6,3),
  w_paid                        NUMERIC(6,3),
  -- tierBaseline is a fixed priorityTier -> boost map (none/premium/star/leader), not a scalar.
  tier_baseline_none            NUMERIC(6,3),
  tier_baseline_premium         NUMERIC(6,3),
  tier_baseline_star            NUMERIC(6,3),
  tier_baseline_leader          NUMERIC(6,3),
  max_sponsored_per_page        INTEGER,
  relevance_floor_threshold     NUMERIC(6,3),
  sponsored_row_enabled         BOOLEAN,
  branding                      JSONB,
  homepage                      JSONB,
  feature_flags                 JSONB,
  contact                       JSONB,
  footer                        JSONB
);

-- ── chat (conversations / messages / read-state) ─────────────────────────────────
-- last_msg_at / messages.ts are epoch-millisecond BIGINTs (Date.now()), NOT ISO
-- strings — routes/chat.js sorts conversations with plain numeric subtraction
-- (b.lastMsgAt - a.lastMsgAt), which would silently break (NaN) against a timestamptz
-- round-tripped back out as an ISO string. created_at IS an ISO string (new
-- Date().toISOString()), so that one stays timestamptz.
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  participant_1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id    TEXT REFERENCES listings(id) ON DELETE SET NULL,
  last_msg_seq  INTEGER NOT NULL DEFAULT 0,
  last_msg_at   BIGINT,
  preview       TEXT,
  created_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS conversations_p1_idx ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS conversations_p2_idx ON conversations(participant_2);

CREATE TABLE IF NOT EXISTS messages (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  client_msg_id   TEXT,
  from_user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ts              BIGINT NOT NULL,
  body            TEXT,
  PRIMARY KEY (conversation_id, seq)
);

CREATE TABLE IF NOT EXISTS conversation_read_state (
  conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_seq    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id)
);

-- ── leads ledger (append-only, replaces DB/leads-ledger.jsonl) ───────────────────
CREATE TABLE IF NOT EXISTS leads_ledger (
  lead_id              TEXT PRIMARY KEY,
  seller_id            TEXT REFERENCES users(id) ON DELETE CASCADE,
  buyer_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
  inquiry_id           TEXT REFERENCES inquiries(id) ON DELETE SET NULL,
  listing_id           TEXT REFERENCES listings(id) ON DELETE SET NULL,
  lead_type            TEXT,
  delivered_date       TIMESTAMPTZ,
  consumed_from_quota  BOOLEAN NOT NULL DEFAULT false,
  chargeable           BOOLEAN NOT NULL DEFAULT false,
  billing_status       TEXT,
  status               TEXT
);
CREATE INDEX IF NOT EXISTS leads_ledger_seller_idx ON leads_ledger(seller_id);

-- ── search events (append-only, replaces DB/search-events.jsonl) ─────────────────
CREATE TABLE IF NOT EXISTS search_events (
  id             TEXT PRIMARY KEY,
  query          TEXT NOT NULL,
  category_slug  TEXT,
  city           TEXT,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_events_created_idx ON search_events(created_at);

-- ── Recruitment product (see lib/db/schema-migrations/0002_add_recruitment_tables.sql
--    for the change history on an existing database; this baseline is what a brand-new
--    install gets directly) ──────────────────────────────────────────────────────────

-- 1:1, present only when the user has become an employer.
CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name       TEXT NOT NULL,
  slug               TEXT UNIQUE NOT NULL,
  about              TEXT,
  logo               TEXT,
  cover_image        TEXT,
  industry           TEXT,
  company_size       TEXT,
  website            TEXT,
  contact_mobile     TEXT,
  contact_email      TEXT,
  location_city      TEXT,
  location_state     TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  is_verified        BOOLEAN NOT NULL DEFAULT false,
  plan_tier          TEXT,
  job_post_limit     INTEGER,
  application_quota  INTEGER,
  -- Added in 0006_add_recruitment_profile_extras.sql — company-profile fields the
  -- dashboard build plan needed. employee_count is a text range string, same
  -- convention as seller_profiles.employee_count (e.g. "11-50"). benefits is
  -- company-level, distinct from the per-job jobs.benefits list below.
  employee_count     TEXT,
  benefits           TEXT[] NOT NULL DEFAULT '{}',
  working_hours      TEXT
  -- No created_at — mirrors seller_profiles (also none); users.created_at covers it.
);
CREATE INDEX IF NOT EXISTS employer_profiles_slug_idx ON employer_profiles(slug);
CREATE INDEX IF NOT EXISTS employer_profiles_status_idx ON employer_profiles(status);

-- 1:1, present only when the user has a candidate profile (no approval gate — see
-- RECRUITMENT.md §2). skills/preferredLocations/preferredJobTypes are simple string
-- lists (text[], GIN-indexed on skills so a future "search candidates by skill" query
-- can use it directly).
CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline             TEXT,
  summary              TEXT,
  resume_url           TEXT,
  skills               TEXT[] NOT NULL DEFAULT '{}',
  experience_years     INTEGER,
  -- named current_position, not current_role — CURRENT_ROLE is a reserved SQL keyword.
  current_position     TEXT,
  current_company      TEXT,
  expected_salary      NUMERIC(12,2),
  preferred_locations  TEXT[] NOT NULL DEFAULT '{}',
  preferred_job_types  TEXT[] NOT NULL DEFAULT '{}',
  contact_phone        TEXT,
  contact_email        TEXT,
  is_open_to_work      BOOLEAN NOT NULL DEFAULT true
  -- No created_at — same reasoning as employer_profiles above.
);
CREATE INDEX IF NOT EXISTS candidate_profiles_skills_idx ON candidate_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS candidate_profiles_open_idx ON candidate_profiles(is_open_to_work);

-- child array: candidateProfile.education[]
CREATE TABLE IF NOT EXISTS candidate_education (
  id           SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  degree       TEXT,
  institution  TEXT,
  year         INTEGER,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS candidate_education_candidate_idx ON candidate_education(candidate_id);

-- child array: candidateProfile.workHistory[]
CREATE TABLE IF NOT EXISTS candidate_work_history (
  id           SERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  company      TEXT,
  role         TEXT,
  duration     TEXT,
  description  TEXT,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS candidate_work_history_candidate_idx ON candidate_work_history(candidate_id);

-- Flat, admin-editable job taxonomy — deliberately NOT a nested tree like categories.
-- job_function on jobs below stores this list's slug as plain text, no FK: mirrors the
-- documented reasoning for inquiries.category_id having no FK — a job posting is not
-- retroactively invalidated by a taxonomy edit.
CREATE TABLE IF NOT EXISTS job_functions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Predefined job-title / skill picklists, tagged to a job_functions.slug (nullable —
-- some skills, e.g. "Communication", aren't tied to one function). Same flat,
-- no-FK shape as job_functions above; see 0005_add_recruitment_master_data.sql.
CREATE TABLE IF NOT EXISTS job_roles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  job_function  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS job_roles_job_function_idx ON job_roles(job_function);

CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  job_function  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS skills_job_function_idx ON skills(job_function);

-- Job postings. No child tables — skills/responsibilities/requirements/benefits are
-- simple string lists (text[]), same convention as blogs.tags / categories.facets.
-- Indexed on every column GET /api/jobs filters or sorts by, so the schema is ready for
-- SQL-level WHERE-pushdown when that pass happens (RECRUITMENT.md notes this is deferred,
-- same as Directory's own listings browse — see POSTGRES-MIGRATION.md).
CREATE TABLE IF NOT EXISTS jobs (
  id                    TEXT PRIMARY KEY,
  employer_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  job_function          TEXT,
  employment_type       TEXT,
  experience_level      TEXT,
  location_city         TEXT,
  location_state        TEXT,
  -- nullable, not NOT NULL DEFAULT — see 0002_add_recruitment_tables.sql for why
  -- (nestedToRow, the nested-object flattening helper, assigns NULL for an omitted
  -- field rather than substituting a default).
  location_remote       BOOLEAN,
  salary_min            NUMERIC(12,2),
  salary_max            NUMERIC(12,2),
  salary_currency       TEXT,
  salary_is_disclosed   BOOLEAN,
  skills                TEXT[] NOT NULL DEFAULT '{}',
  responsibilities      TEXT[] NOT NULL DEFAULT '{}',
  requirements          TEXT[] NOT NULL DEFAULT '{}',
  benefits              TEXT[] NOT NULL DEFAULT '{}',
  openings              INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'pending',
  view_count            INTEGER NOT NULL DEFAULT 0,
  application_count     INTEGER NOT NULL DEFAULT 0,
  -- Recruiter-defined screening questions: [{id, text, required}]. See
  -- 0004_add_recruitment_role_and_questions.sql for why this is jsonb, not a child table.
  questions             JSONB NOT NULL DEFAULT '[]',
  posted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ,
  -- Added in 0006_add_recruitment_profile_extras.sql — education/qualification
  -- requirement, plain text, distinct from experience_level.
  qualification         TEXT
);
CREATE INDEX IF NOT EXISTS jobs_employer_idx ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_job_function_idx ON jobs(job_function);
CREATE INDEX IF NOT EXISTS jobs_employment_type_idx ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS jobs_experience_level_idx ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS jobs_city_idx ON jobs(location_city);
CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON jobs(posted_at);
CREATE INDEX IF NOT EXISTS jobs_skills_idx ON jobs USING GIN(skills);

-- Applications. status_history is a small append-only log of {status, note, changedAt}
-- entries — never filtered/queried on its own, so it's a plain jsonb column (inline on
-- the row, zero extra queries to read) rather than a child table (which would cost one
-- extra batched query on every read for no querying benefit).
--
-- UNIQUE(job_id, candidate_id): a candidate can apply to a given job exactly once,
-- enforced at the DB level (not just an app-level check) so a rapid double-submit can't
-- race past an app-level "already applied?" read and create two rows.
CREATE TABLE IF NOT EXISTS applications (
  id               TEXT PRIMARY KEY,
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_url       TEXT,
  cover_note       TEXT,
  status           TEXT NOT NULL DEFAULT 'applied',
  status_history   JSONB NOT NULL DEFAULT '[]',
  -- Candidate answers to job.questions at apply time: [{questionId, text}].
  answers          JSONB NOT NULL DEFAULT '[]',
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_candidate_uniq ON applications(job_id, candidate_id);
CREATE INDEX IF NOT EXISTS applications_employer_idx ON applications(employer_id);
CREATE INDEX IF NOT EXISTS applications_candidate_idx ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
