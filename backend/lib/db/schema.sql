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
  service_cities         TEXT[] NOT NULL DEFAULT '{}'
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
