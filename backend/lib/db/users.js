/**
 * users.js — composite relational mapper for users.json.
 *
 * users (1) --< seller_profiles (1:1, optional)
 *                 |--< seller_locations (array)
 *                 \--- expert_profiles (1:1, optional)
 *                         \--< expert_case_studies (array)
 * users (1) --- user_legacy (1:1, optional)
 * users (1) --- employer_profiles (1:1, optional — Recruitment, RECRUITMENT.md)
 * users (1) --< candidate_profiles (1:1, optional — Recruitment)
 *                 |--< candidate_education (array)
 *                 \--< candidate_work_history (array)
 *
 * Update semantics match the original file-store: a shallow merge of the patch into
 * the existing doc ({...existing, ...patch, id}) — so patching `sellerProfile` REPLACES
 * the whole sub-object (and, transitively, its own children), same as the old
 * {...row, ...patch} behaviour with a plain JSON array.
 *
 * The top-level `users` row is always upserted in place (INSERT ... ON CONFLICT DO
 * UPDATE), never delete+reinsert — dozens of other tables hold FKs to users.id, and a
 * delete would cascade through all of it. Child/owned tables (nothing outside this
 * doc's own subtree references them) are safely replaced via delete+reinsert.
 */

const { docToRow, rowToDoc, quoteIdent, insertParts, withTransaction, upsertRow, replaceChildRows, nestedToRow, nestedFromRow } = require("./util");

const t = "text", i = "int", n = "numeric", b = "bool", ts = "timestamptz", arr = "textArray";
const col = (c, type) => ({ col: c, type });

const USER_COLUMNS = {
  id: col("id", t), name: col("name", t), mobile: col("mobile", t), email: col("email", t),
  passwordHash: col("password_hash", t), avatarUrl: col("avatar_url", t), city: col("city", t),
  state: col("state", t), roles: col("roles", arr), interests: col("interests", arr),
  contactVisibility: col("contact_visibility", t), createdAt: col("created_at", ts),
  recruitmentRole: col("recruitment_role", t), recruitmentRoleLockedAt: col("recruitment_role_locked_at", ts),
  status: col("status", t),
};

const SELLER_COLUMNS = {
  companyName: col("company_name", t), slug: col("slug", t), about: col("about", t), logo: col("logo", t),
  coverImage: col("cover_image", t), gstNumber: col("gst_number", t), yearEstablished: col("year_established", i),
  employeeCount: col("employee_count", t), certifications: col("certifications", arr), website: col("website", t),
  contactMobile: col("contact_mobile", t), contactEmail: col("contact_email", t),
  legacyCategories: col("legacy_categories", arr), status: col("status", t), isVerified: col("is_verified", b),
  trustSealVerified: col("trust_seal_verified", b), verifiedBadgeExpiry: col("verified_badge_expiry", ts),
  rating: col("rating", n), reviewCount: col("review_count", i), responseRate: col("response_rate", n),
  planId: col("plan_id", t), planTier: col("plan_tier", t), planStartDate: col("plan_start_date", ts),
  planEndDate: col("plan_end_date", ts), planStatus: col("plan_status", t), listingLimit: col("listing_limit", i),
  leadQuotaPerCycle: col("lead_quota_per_cycle", i), leadsConsumed: col("leads_consumed", i),
  leadQuotaResetDate: col("lead_quota_reset_date", ts), featuredCredits: col("featured_credits", i),
  perLeadPrice: col("per_lead_price", n), rankBoostScore: col("rank_boost_score", n),
  priorityTier: col("priority_tier", t), isFeaturedSeller: col("is_featured_seller", b),
  featuredStartDate: col("featured_start_date", ts), featuredEndDate: col("featured_end_date", ts),
  boostCategoryIds: col("boost_category_ids", arr), boostKeywords: col("boost_keywords", arr),
  boostGeoLocations: col("boost_geo_locations", arr), analyticsEnabled: col("analytics_enabled", b),
  accountManagerId: col("account_manager_id", t), adminNotes: col("admin_notes", t),
  panNumber: col("pan_number", t), cinNumber: col("cin_number", t), annualTurnover: col("annual_turnover", t),
  natureOfBusiness: col("nature_of_business", t),
};
const SELLER_NESTED = [
  { docKey: "location", fields: { city: col("location_city", t), state: col("location_state", t), pincode: col("location_pincode", t) } },
  { docKey: "performance", fields: {
    onTimeDelivery: col("perf_on_time_delivery", n), avgResponseTimeHours: col("perf_avg_response_time_hrs", n),
    repeatBuyers: col("perf_repeat_buyers", i), orderCompletion: col("perf_order_completion", n),
    performanceScore: col("perf_performance_score", n),
  } },
];

const EXPERT_COLUMNS = {
  profession: col("profession", t), professionKey: col("profession_key", t), headline: col("headline", t),
  registrationBody: col("registration_body", t), registrationNo: col("registration_no", t),
  credentialVerified: col("credential_verified", b), specializations: col("specializations", arr),
  languages: col("languages", arr), experienceYears: col("experience_years", i),
  consultationModes: col("consultation_modes", arr), responseTime: col("response_time", t),
  freeIntroCall: col("free_intro_call", b), clientsServed: col("clients_served", i),
};

const LEGACY_COLUMNS = {
  company: col("company", t), gstNumber: col("gst_number", t), website: col("website", t),
  annualTurnover: col("annual_turnover", t), activeYears: col("active_years", i), trustScore: col("trust_score", n),
};
const LEGACY_NESTED = [
  { docKey: "verification", fields: {
    gstVerified: col("gst_verified", b), websiteVerified: col("website_verified", b),
    phoneVerified: col("phone_verified", b), emailVerified: col("email_verified", b),
    linkedinPresence: col("linkedin_presence", b),
  } },
];

// ── Recruitment: employerProfile / candidateProfile (RECRUITMENT.md §2) ────────────
// Same 1:1-optional-profile shape as sellerProfile/expertProfile above, mirrored
// deliberately rather than reusing seller_profiles — see RECRUITMENT.md §1's
// "separate collections" decision.

const EMPLOYER_COLUMNS = {
  companyName: col("company_name", t), slug: col("slug", t), about: col("about", t),
  logo: col("logo", t), coverImage: col("cover_image", t), industry: col("industry", t),
  companySize: col("company_size", t), website: col("website", t),
  contactMobile: col("contact_mobile", t), contactEmail: col("contact_email", t),
  status: col("status", t), isVerified: col("is_verified", b), planTier: col("plan_tier", t),
  jobPostLimit: col("job_post_limit", i), applicationQuota: col("application_quota", i),
  // Build-plan Phase 1 (0006_add_recruitment_profile_extras.sql).
  employeeCount: col("employee_count", t), benefits: col("benefits", arr),
  workingHours: col("working_hours", t),
};
const EMPLOYER_NESTED = [
  { docKey: "location", fields: { city: col("location_city", t), state: col("location_state", t) } },
];

const CANDIDATE_COLUMNS = {
  headline: col("headline", t), summary: col("summary", t), resumeUrl: col("resume_url", t),
  skills: col("skills", arr), experienceYears: col("experience_years", i),
  currentRole: col("current_position", t), currentCompany: col("current_company", t),
  expectedSalary: col("expected_salary", n), preferredLocations: col("preferred_locations", arr),
  preferredJobTypes: col("preferred_job_types", arr), contactPhone: col("contact_phone", t),
  contactEmail: col("contact_email", t), isOpenToWork: col("is_open_to_work", b),
};

function createUsersStore(pool, nextId) {
  async function hydrate(client, userRow) {
    const doc = rowToDoc(userRow, USER_COLUMNS);
    doc.sellerProfile = null;
    doc.legacy = undefined;

    const sellerRes = await client.query(`SELECT * FROM seller_profiles WHERE user_id = $1`, [userRow.id]);
    if (sellerRes.rowCount) {
      const sellerRow = sellerRes.rows[0];
      const sp = rowToDoc(sellerRow, SELLER_COLUMNS);
      nestedFromRow(sellerRow, SELLER_NESTED, sp);

      const locRes = await client.query(
        `SELECT * FROM seller_locations WHERE seller_id = $1 ORDER BY position ASC`,
        [userRow.id]
      );
      if (locRes.rowCount) {
        sp.locations = locRes.rows.map((r) => ({
          id: r.id, label: r.label, city: r.city, state: r.state, pincode: r.pincode, address: r.address,
        }));
      }

      const expertRes = await client.query(`SELECT * FROM expert_profiles WHERE user_id = $1`, [userRow.id]);
      if (expertRes.rowCount) {
        const expertRow = expertRes.rows[0];
        const expert = rowToDoc(expertRow, EXPERT_COLUMNS);
        const csRes = await client.query(
          `SELECT * FROM expert_case_studies WHERE expert_id = $1 ORDER BY position ASC`,
          [userRow.id]
        );
        expert.caseStudies = csRes.rows.map((r) => ({ title: r.title, result: r.result }));
        sp.expert = expert;
      }
      doc.sellerProfile = sp;
    }

    const legacyRes = await client.query(`SELECT * FROM user_legacy WHERE user_id = $1`, [userRow.id]);
    if (legacyRes.rowCount) {
      const legacyRow = legacyRes.rows[0];
      const legacy = rowToDoc(legacyRow, LEGACY_COLUMNS);
      nestedFromRow(legacyRow, LEGACY_NESTED, legacy);
      doc.legacy = legacy;
    } else {
      delete doc.legacy;
    }

    doc.employerProfile = null;
    const employerRes = await client.query(`SELECT * FROM employer_profiles WHERE user_id = $1`, [userRow.id]);
    if (employerRes.rowCount) {
      const employerRow = employerRes.rows[0];
      const ep = rowToDoc(employerRow, EMPLOYER_COLUMNS);
      nestedFromRow(employerRow, EMPLOYER_NESTED, ep);
      doc.employerProfile = ep;
    }

    doc.candidateProfile = null;
    const candidateRes = await client.query(`SELECT * FROM candidate_profiles WHERE user_id = $1`, [userRow.id]);
    if (candidateRes.rowCount) {
      const candidateRow = candidateRes.rows[0];
      const cp = rowToDoc(candidateRow, CANDIDATE_COLUMNS);
      const eduRes = await client.query(
        `SELECT * FROM candidate_education WHERE candidate_id = $1 ORDER BY position ASC`, [userRow.id]
      );
      cp.education = eduRes.rows.map((r) => ({ degree: r.degree, institution: r.institution, year: r.year }));
      const workRes = await client.query(
        `SELECT * FROM candidate_work_history WHERE candidate_id = $1 ORDER BY position ASC`, [userRow.id]
      );
      cp.workHistory = workRes.rows.map((r) => ({
        company: r.company, role: r.role, duration: r.duration, description: r.description,
      }));
      doc.candidateProfile = cp;
    }

    return doc;
  }

  // Same shape as hydrate(), but built from maps that were already batch-
  // fetched for every user at once (see all() below) instead of issuing up
  // to 5 queries per row. Pure/sync — no client, no awaits.
  function hydrateFromMaps(userRow, maps) {
    const doc = rowToDoc(userRow, USER_COLUMNS);
    doc.sellerProfile = null;
    doc.legacy = undefined;

    const sellerRow = maps.sellerByUser.get(userRow.id);
    if (sellerRow) {
      const sp = rowToDoc(sellerRow, SELLER_COLUMNS);
      nestedFromRow(sellerRow, SELLER_NESTED, sp);

      const locs = maps.locationsBySeller.get(userRow.id);
      if (locs && locs.length) {
        sp.locations = locs.map((r) => ({
          id: r.id, label: r.label, city: r.city, state: r.state, pincode: r.pincode, address: r.address,
        }));
      }

      const expertRow = maps.expertByUser.get(userRow.id);
      if (expertRow) {
        const expert = rowToDoc(expertRow, EXPERT_COLUMNS);
        const cs = maps.caseStudiesByExpert.get(userRow.id) || [];
        expert.caseStudies = cs.map((r) => ({ title: r.title, result: r.result }));
        sp.expert = expert;
      }
      doc.sellerProfile = sp;
    }

    const legacyRow = maps.legacyByUser.get(userRow.id);
    if (legacyRow) {
      const legacy = rowToDoc(legacyRow, LEGACY_COLUMNS);
      nestedFromRow(legacyRow, LEGACY_NESTED, legacy);
      doc.legacy = legacy;
    } else {
      delete doc.legacy;
    }

    doc.employerProfile = null;
    const employerRow = maps.employerByUser.get(userRow.id);
    if (employerRow) {
      const ep = rowToDoc(employerRow, EMPLOYER_COLUMNS);
      nestedFromRow(employerRow, EMPLOYER_NESTED, ep);
      doc.employerProfile = ep;
    }

    doc.candidateProfile = null;
    const candidateRow = maps.candidateByUser.get(userRow.id);
    if (candidateRow) {
      const cp = rowToDoc(candidateRow, CANDIDATE_COLUMNS);
      const edu = maps.educationByCandidate.get(userRow.id) || [];
      cp.education = edu.map((r) => ({ degree: r.degree, institution: r.institution, year: r.year }));
      const work = maps.workHistoryByCandidate.get(userRow.id) || [];
      cp.workHistory = work.map((r) => ({
        company: r.company, role: r.role, duration: r.duration, description: r.description,
      }));
      doc.candidateProfile = cp;
    }

    return doc;
  }

  /** Group an array of rows by an arbitrary column into a Map<value, row[]>. */
  function groupBy(rows, key) {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r[key])) m.set(r[key], []);
      m.get(r[key]).push(r);
    }
    return m;
  }

  async function getByIdWith(client, id) {
    const res = await client.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!res.rowCount) return null;
    return hydrate(client, res.rows[0]);
  }

  async function upsertDoc(client, doc) {
    const userRow = docToRow(doc, USER_COLUMNS);
    await upsertRow(client, "users", "id", userRow);

    if (doc.sellerProfile) {
      const sp = doc.sellerProfile;
      const sellerRow = docToRow(sp, SELLER_COLUMNS);
      sellerRow.user_id = doc.id;
      nestedToRow(sp, SELLER_NESTED, sellerRow);
      await upsertRow(client, "seller_profiles", "user_id", sellerRow);

      const locations = (sp.locations || []).map((loc, idx) => ({
        id: loc.id, seller_id: doc.id, label: loc.label ?? null, city: loc.city ?? null,
        state: loc.state ?? null, pincode: loc.pincode ?? null, address: loc.address ?? null, position: idx,
      }));
      await replaceChildRows(client, "seller_locations", "seller_id", doc.id, locations);

      if (sp.expert) {
        const expertRow = docToRow(sp.expert, EXPERT_COLUMNS);
        expertRow.user_id = doc.id;
        await upsertRow(client, "expert_profiles", "user_id", expertRow);
        const caseStudies = (sp.expert.caseStudies || []).map((cs, idx) => ({
          expert_id: doc.id, title: cs.title ?? null, result: cs.result ?? null, position: idx,
        }));
        await replaceChildRows(client, "expert_case_studies", "expert_id", doc.id, caseStudies);
      } else {
        // Cascades to expert_case_studies too.
        await client.query(`DELETE FROM expert_profiles WHERE user_id = $1`, [doc.id]);
      }
    } else {
      // Cascades to seller_locations / expert_profiles / expert_case_studies.
      await client.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [doc.id]);
    }

    if (doc.legacy) {
      const legacyRow = docToRow(doc.legacy, LEGACY_COLUMNS);
      legacyRow.user_id = doc.id;
      nestedToRow(doc.legacy, LEGACY_NESTED, legacyRow);
      await upsertRow(client, "user_legacy", "user_id", legacyRow);
    } else {
      await client.query(`DELETE FROM user_legacy WHERE user_id = $1`, [doc.id]);
    }

    if (doc.employerProfile) {
      const ep = doc.employerProfile;
      const employerRow = docToRow(ep, EMPLOYER_COLUMNS);
      employerRow.user_id = doc.id;
      nestedToRow(ep, EMPLOYER_NESTED, employerRow);
      await upsertRow(client, "employer_profiles", "user_id", employerRow);
    } else {
      await client.query(`DELETE FROM employer_profiles WHERE user_id = $1`, [doc.id]);
    }

    if (doc.candidateProfile) {
      const cp = doc.candidateProfile;
      const candidateRow = docToRow(cp, CANDIDATE_COLUMNS);
      candidateRow.user_id = doc.id;
      await upsertRow(client, "candidate_profiles", "user_id", candidateRow);

      const education = (cp.education || []).map((e, idx) => ({
        candidate_id: doc.id, degree: e.degree ?? null, institution: e.institution ?? null,
        year: e.year ?? null, position: idx,
      }));
      await replaceChildRows(client, "candidate_education", "candidate_id", doc.id, education);

      const workHistory = (cp.workHistory || []).map((w, idx) => ({
        candidate_id: doc.id, company: w.company ?? null, role: w.role ?? null,
        duration: w.duration ?? null, description: w.description ?? null, position: idx,
      }));
      await replaceChildRows(client, "candidate_work_history", "candidate_id", doc.id, workHistory);
    } else {
      // Cascades to candidate_education / candidate_work_history.
      await client.query(`DELETE FROM candidate_profiles WHERE user_id = $1`, [doc.id]);
    }
  }

  return {
    // Batch-hydrates every user in 10 total queries (1 for users + 9 for every
    // child table, each fetched once across all ids with = ANY($1)) instead
    // of looping a query per row.
    async all() {
      const res = await pool.query(`SELECT * FROM users ORDER BY id ASC`);
      const rows = res.rows;
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);

      const [sellerRes, locRes, expertRes, csRes, legacyRes, employerRes, candidateRes, eduRes, workRes] = await Promise.all([
        pool.query(`SELECT * FROM seller_profiles WHERE user_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM seller_locations WHERE seller_id = ANY($1) ORDER BY seller_id, position ASC`, [ids]),
        pool.query(`SELECT * FROM expert_profiles WHERE user_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM expert_case_studies WHERE expert_id = ANY($1) ORDER BY expert_id, position ASC`, [ids]),
        pool.query(`SELECT * FROM user_legacy WHERE user_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM employer_profiles WHERE user_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM candidate_profiles WHERE user_id = ANY($1)`, [ids]),
        pool.query(`SELECT * FROM candidate_education WHERE candidate_id = ANY($1) ORDER BY candidate_id, position ASC`, [ids]),
        pool.query(`SELECT * FROM candidate_work_history WHERE candidate_id = ANY($1) ORDER BY candidate_id, position ASC`, [ids]),
      ]);

      const maps = {
        sellerByUser: new Map(sellerRes.rows.map((r) => [r.user_id, r])),
        locationsBySeller: groupBy(locRes.rows, "seller_id"),
        expertByUser: new Map(expertRes.rows.map((r) => [r.user_id, r])),
        caseStudiesByExpert: groupBy(csRes.rows, "expert_id"),
        legacyByUser: new Map(legacyRes.rows.map((r) => [r.user_id, r])),
        employerByUser: new Map(employerRes.rows.map((r) => [r.user_id, r])),
        candidateByUser: new Map(candidateRes.rows.map((r) => [r.user_id, r])),
        educationByCandidate: groupBy(eduRes.rows, "candidate_id"),
        workHistoryByCandidate: groupBy(workRes.rows, "candidate_id"),
      };

      return rows.map((row) => hydrateFromMaps(row, maps));
    },
    /**
     * Batch-hydrate a known set of ids in the SAME 10 queries as all() (1 users +
     * 9 child = ANY($1)), and return the docs in the ORDER the ids were given —
     * so a caller that has already filtered/sorted/paged in SQL keeps its order.
     * Unknown ids are skipped. This is all()'s hydrate half without the full-table
     * scan; used by the admin user directory (BACKEND-AUDIT.md Phase 6a).
     */
    async hydrateManyByIds(ids = []) {
      const uniq = [...new Set(ids)].filter(Boolean);
      if (!uniq.length) return [];
      const res = await pool.query(`SELECT * FROM users WHERE id = ANY($1)`, [uniq]);
      if (res.rows.length === 0) return [];

      const [sellerRes, locRes, expertRes, csRes, legacyRes, employerRes, candidateRes, eduRes, workRes] = await Promise.all([
        pool.query(`SELECT * FROM seller_profiles WHERE user_id = ANY($1)`, [uniq]),
        pool.query(`SELECT * FROM seller_locations WHERE seller_id = ANY($1) ORDER BY seller_id, position ASC`, [uniq]),
        pool.query(`SELECT * FROM expert_profiles WHERE user_id = ANY($1)`, [uniq]),
        pool.query(`SELECT * FROM expert_case_studies WHERE expert_id = ANY($1) ORDER BY expert_id, position ASC`, [uniq]),
        pool.query(`SELECT * FROM user_legacy WHERE user_id = ANY($1)`, [uniq]),
        pool.query(`SELECT * FROM employer_profiles WHERE user_id = ANY($1)`, [uniq]),
        pool.query(`SELECT * FROM candidate_profiles WHERE user_id = ANY($1)`, [uniq]),
        pool.query(`SELECT * FROM candidate_education WHERE candidate_id = ANY($1) ORDER BY candidate_id, position ASC`, [uniq]),
        pool.query(`SELECT * FROM candidate_work_history WHERE candidate_id = ANY($1) ORDER BY candidate_id, position ASC`, [uniq]),
      ]);

      const maps = {
        sellerByUser: new Map(sellerRes.rows.map((r) => [r.user_id, r])),
        locationsBySeller: groupBy(locRes.rows, "seller_id"),
        expertByUser: new Map(expertRes.rows.map((r) => [r.user_id, r])),
        caseStudiesByExpert: groupBy(csRes.rows, "expert_id"),
        legacyByUser: new Map(legacyRes.rows.map((r) => [r.user_id, r])),
        employerByUser: new Map(employerRes.rows.map((r) => [r.user_id, r])),
        candidateByUser: new Map(candidateRes.rows.map((r) => [r.user_id, r])),
        educationByCandidate: groupBy(eduRes.rows, "candidate_id"),
        workHistoryByCandidate: groupBy(workRes.rows, "candidate_id"),
      };

      const byId = new Map(res.rows.map((row) => [row.id, hydrateFromMaps(row, maps)]));
      return uniq.map((id) => byId.get(id)).filter(Boolean);
    },
    async findOne(predicate) {
      const rows = await this.all();
      return rows.find(predicate) || null;
    },
    async findMany(predicate) {
      const rows = await this.all();
      return rows.filter(predicate);
    },
    async getById(id) {
      return getByIdWith(pool, id);
    },
    async insert(doc, idPrefix) {
      const id = doc.id || (idPrefix ? await nextId(idPrefix) : undefined);
      const full = { ...doc, ...(id ? { id } : {}) };
      return withTransaction(pool, async (client) => {
        await upsertDoc(client, full);
        return getByIdWith(client, full.id);
      });
    },
    async update(id, patch) {
      return withTransaction(pool, async (client) => {
        const existing = await getByIdWith(client, id);
        if (!existing) return null;
        const merged = { ...existing, ...patch, id };
        await upsertDoc(client, merged);
        return getByIdWith(client, id);
      });
    },
    async remove(id) {
      const res = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
      return res.rowCount > 0;
    },
    async writeJson(docs) {
      await withTransaction(pool, async (client) => {
        const ids = [];
        for (const doc of docs) {
          await upsertDoc(client, doc);
          ids.push(doc.id);
        }
        if (ids.length) {
          await client.query(`DELETE FROM users WHERE id != ALL($1)`, [ids]);
        } else {
          await client.query(`DELETE FROM users`);
        }
      });
    },
  };
}

module.exports = { createUsersStore };
