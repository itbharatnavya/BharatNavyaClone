/**
 * Integration smoke test for the Recruitment data layer (RECRUITMENT.md Phase 1):
 * exercises the REAL store (whichever backend backend/.env's PG_URL selects — Postgres
 * or the file-DB) through lib/store.js exactly the way route code does, round-tripping
 * every collection this phase added: employerProfile/candidateProfile on users.json
 * (composite mapper, lib/db/users.js), and job-functions.json/jobs.json/
 * applications.json (flat.js, incl. the nested location/salaryRange objects and the
 * jsonb statusHistory column).
 *
 * Requires the schema to already exist — run `npm run setup-pg-schema` (fresh DB) or
 * `npm run migrate-schema` (existing DB) first if this is pointed at Postgres.
 *
 * Uses distinctive test-only ids (usr_test_*, job_test_*, app_test_*, jf_test_*) so it
 * never collides with scripts/seed-recruitment-demo.js's fixed demo ids, and cleans up
 * everything it creates in an `after` hook regardless of pass/fail.
 *
 * Run:  npm test   (or  node --test test/recruitment-store.integration.test.js)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const store = require("../lib/store");

const EMPLOYER_ID = "usr_test_emp_recruitment";
const CANDIDATE_ID = "usr_test_cand_recruitment";
const JOB_FUNCTION_ID = "jf_test_recruitment";
const JOB_ID = "job_test_recruitment";
const APPLICATION_ID = "app_test_recruitment";

async function cleanup() {
  await store.remove("applications.json", APPLICATION_ID).catch(() => {});
  // Defensive: only ever inserted if the duplicate-rejection assertion below somehow
  // doesn't throw (e.g. an unexpected partial success) — otherwise a no-op.
  await store.remove("applications.json", "app_test_recruitment_dupe").catch(() => {});
  await store.remove("jobs.json", JOB_ID).catch(() => {});
  await store.remove("job-functions.json", JOB_FUNCTION_ID).catch(() => {});
  await store.remove("users.json", CANDIDATE_ID).catch(() => {});
  await store.remove("users.json", EMPLOYER_ID).catch(() => {});
}

test("Recruitment data layer", async (t) => {
  await cleanup(); // in case a previous failed run left rows behind

  t.after(cleanup);

  await t.test("employerProfile round-trips through users.json (composite mapper)", async () => {
    await store.insert("users.json", {
      id: EMPLOYER_ID,
      name: "Test Employer Co",
      mobile: "9990000001",
      email: "test-employer@example.com",
      passwordHash: "x",
      createdAt: new Date().toISOString(),
      city: "Bengaluru",
      state: "Karnataka",
      roles: ["user"],
      employerProfile: {
        companyName: "Test Employer Co Pvt Ltd",
        slug: "test-employer-co-recruitment",
        about: "Integration test fixture",
        industry: "IT",
        companySize: "1-10",
        contactMobile: "9990000001",
        contactEmail: "test-employer@example.com",
        location: { city: "Bengaluru", state: "Karnataka" },
        status: "approved",
        isVerified: false,
        planTier: "free",
        jobPostLimit: null,
        applicationQuota: null,
      },
    });

    const fetched = await store.getById("users.json", EMPLOYER_ID);
    assert.ok(fetched, "employer user should be readable back");
    assert.equal(fetched.employerProfile.companyName, "Test Employer Co Pvt Ltd");
    assert.equal(fetched.employerProfile.status, "approved");
    // Nested location object must survive the flatten/reconstruct round trip.
    assert.equal(fetched.employerProfile.location.city, "Bengaluru");
  });

  await t.test("candidateProfile + education/workHistory child arrays round-trip", async () => {
    await store.insert("users.json", {
      id: CANDIDATE_ID,
      name: "Test Candidate",
      mobile: "9990000002",
      email: "test-candidate@example.com",
      passwordHash: "x",
      createdAt: new Date().toISOString(),
      city: "Bengaluru",
      state: "Karnataka",
      roles: ["user"],
      candidateProfile: {
        headline: "Test Engineer",
        skills: ["Node.js", "SQL"],
        experienceYears: 4,
        preferredLocations: ["Bengaluru"],
        preferredJobTypes: ["full-time"],
        isOpenToWork: true,
        education: [{ degree: "B.E.", institution: "Test University", year: 2020 }],
        workHistory: [{ company: "Prev Co", role: "Engineer", duration: "2020-2024", description: "Did engineering things" }],
      },
    });

    const fetched = await store.getById("users.json", CANDIDATE_ID);
    assert.deepEqual(fetched.candidateProfile.skills, ["Node.js", "SQL"]);
    assert.equal(fetched.candidateProfile.isOpenToWork, true);
    assert.equal(fetched.candidateProfile.education.length, 1);
    assert.equal(fetched.candidateProfile.education[0].institution, "Test University");
    assert.equal(fetched.candidateProfile.workHistory[0].company, "Prev Co");

    // Batched all() must also hydrate these correctly, not just getById's per-row path
    // (this is the code path CLAUDE.md's N+1 rule specifically guards).
    const all = await store.all("users.json");
    const viaAll = all.find((u) => u.id === CANDIDATE_ID);
    assert.ok(viaAll, "candidate must appear in the batched all() result");
    assert.equal(viaAll.candidateProfile.headline, "Test Engineer");
    assert.equal(viaAll.candidateProfile.education[0].degree, "B.E.");
  });

  await t.test("job-functions.json flat collection round-trips", async () => {
    await store.insert("job-functions.json", {
      id: JOB_FUNCTION_ID, name: "Test Function", slug: "test-function-recruitment",
      order: 999, isActive: true,
    });
    const fetched = await store.getById("job-functions.json", JOB_FUNCTION_ID);
    assert.equal(fetched.name, "Test Function");
    assert.equal(fetched.isActive, true);
  });

  await t.test("jobs.json round-trips text[] arrays and nested location/salaryRange", async () => {
    const inserted = await store.insert("jobs.json", {
      id: JOB_ID,
      employerId: EMPLOYER_ID,
      title: "Test Job",
      description: "An integration-test job posting.",
      jobFunction: "test-function-recruitment",
      employmentType: "full-time",
      experienceLevel: "mid",
      location: { city: "Bengaluru", state: "Karnataka", remote: true },
      salaryRange: { min: 1000000, max: 1500000, currency: "INR", isDisclosed: true },
      skills: ["Node.js", "PostgreSQL"],
      responsibilities: ["Ship features"],
      requirements: ["3+ years experience"],
      benefits: ["Health insurance"],
      openings: 2,
      status: "active",
      viewCount: 0,
      applicationCount: 0,
      postedAt: new Date().toISOString(),
      expiresAt: null,
    });
    assert.equal(inserted.id, JOB_ID);

    const fetched = await store.getById("jobs.json", JOB_ID);
    assert.deepEqual(fetched.skills, ["Node.js", "PostgreSQL"]);
    // The location_remote/salary_is_disclosed nullable-boolean fix (util.js/schema) —
    // must come back as real booleans, not the string "true"/null.
    assert.equal(fetched.location.remote, true);
    assert.equal(fetched.salaryRange.isDisclosed, true);
    // Numeric columns must come back as JS numbers (node-postgres returns NUMERIC as a
    // string by default; fromColumn in lib/db/util.js is responsible for the Number()
    // conversion) — a naive reader would get "1000000" and silently break arithmetic.
    assert.equal(typeof fetched.salaryRange.min, "number");
    assert.equal(fetched.salaryRange.min, 1000000);

    // findMany must apply predicates correctly over this collection too.
    const viaFindMany = await store.findMany("jobs.json", (j) => j.employerId === EMPLOYER_ID);
    assert.equal(viaFindMany.length, 1);
    assert.equal(viaFindMany[0].id, JOB_ID);
  });

  await t.test("applications.json round-trips the jsonb statusHistory column", async () => {
    const now = new Date().toISOString();
    const statusHistory = [
      { status: "applied", note: null, changedAt: now },
      { status: "shortlisted", note: "Strong fit", changedAt: now },
    ];
    await store.insert("applications.json", {
      id: APPLICATION_ID,
      jobId: JOB_ID,
      employerId: EMPLOYER_ID,
      candidateId: CANDIDATE_ID,
      resumeUrl: null,
      coverNote: "Test cover note",
      status: "shortlisted",
      statusHistory,
      appliedAt: now,
      updatedAt: now,
    });

    const fetched = await store.getById("applications.json", APPLICATION_ID);
    // jsonb must round-trip as a real array of objects, not a JSON string — this is
    // exactly what the toParam() jsonb fix in lib/db/util.js exists to guarantee (a
    // bare JS array passed to a jsonb column without it gets mangled by node-postgres's
    // default array-literal serialization).
    assert.equal(Array.isArray(fetched.statusHistory), true);
    assert.equal(fetched.statusHistory.length, 2);
    assert.equal(fetched.statusHistory[1].status, "shortlisted");
    assert.equal(fetched.statusHistory[1].note, "Strong fit");
  });

  await t.test("duplicate (job_id, candidate_id) is rejected under Postgres", async (t) => {
    if (!process.env.PG_URL && !process.env.DATABASE_URL) {
      t.skip("no PG_URL set — this DB-level UNIQUE constraint only exists under Postgres");
      return;
    }
    await assert.rejects(
      () => store.insert("applications.json", {
        id: "app_test_recruitment_dupe",
        jobId: JOB_ID,
        employerId: EMPLOYER_ID,
        candidateId: CANDIDATE_ID, // same (job, candidate) pair as the row inserted above
        status: "applied",
        statusHistory: [],
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      /duplicate key|unique/i
    );
  });
});
