/**
 * seed-recruitment-demo.js — demo data for the Recruitment product (RECRUITMENT.md).
 *
 * Adds:
 *   1. A flat job-functions.json taxonomy (9 entries).
 *   2. 2 demo employers (usr_emp1, usr_emp2) — approved, so their jobs show on the
 *      public browse immediately.
 *   3. 2 demo candidates (usr_cand1, usr_cand2) with full candidateProfile.
 *   4. 5 demo jobs across the two employers (varied jobFunction/employmentType/
 *      experienceLevel/city — enough to exercise every filter).
 *   5. 3 demo applications across different statuses (applied/shortlisted/rejected) so
 *      the employer Applications tab and candidate My Applications tab both have
 *      something real to render.
 *
 * Idempotent: fixed ids throughout; update-if-present, insert-if-absent (same pattern
 * as scripts/seed-experts.js) — safe to run repeatedly. All writes go through
 * lib/store, so this works identically against the file-DB or Postgres (whichever
 * backend.PG_URL selects) without this script knowing which one is active.
 *
 * Run:  node scripts/seed-recruitment-demo.js
 *
 * For a fresh Postgres database, run the schema migration FIRST:
 *   npm run setup-pg-schema   (brand-new DB)  — or —
 *   npm run migrate-schema    (existing DB, applies schema-migrations/0002_...)
 * then this script.
 */

const store = require("../lib/store");

// Shared demo password hash — same one already used across most other seeded demo
// accounts in backend/DB/users.json (see HANDOVER.md for the plaintext).
const DEMO_PASSWORD_HASH = "$2b$10$ZYfWl9e9d1P.yIVRZvGPwudhDqNuxcayBtoZUxmJOYR.freSH0oAS";

/* ---------------------------------------------------------- job functions -- */

const JOB_FUNCTIONS = [
  { id: "jf_engineering", name: "Engineering", slug: "engineering", order: 1 },
  { id: "jf_sales", name: "Sales", slug: "sales", order: 2 },
  { id: "jf_marketing", name: "Marketing", slug: "marketing", order: 3 },
  { id: "jf_design", name: "Design", slug: "design", order: 4 },
  { id: "jf_operations", name: "Operations", slug: "operations", order: 5 },
  { id: "jf_customer-support", name: "Customer Support", slug: "customer-support", order: 6 },
  { id: "jf_finance", name: "Finance", slug: "finance", order: 7 },
  { id: "jf_hr", name: "Human Resources", slug: "hr", order: 8 },
  { id: "jf_product", name: "Product", slug: "product", order: 9 },
].map((jf) => ({ ...jf, isActive: true }));

/* ---------------------------------------------------------------- employers -- */

const EMPLOYERS = [
  {
    id: "usr_emp1",
    name: "TechNova Solutions",
    mobile: "9876500001",
    email: "hr@technova-demo.example",
    city: "Bengaluru",
    state: "Karnataka",
    employerProfile: {
      companyName: "TechNova Solutions Pvt Ltd",
      slug: "technova-solutions",
      about: "A mid-size product engineering company building B2B SaaS for Indian manufacturers.",
      logo: null,
      coverImage: "/demo/industry-2.jpg",
      industry: "Information Technology",
      companySize: "51-200",
      website: "https://technova-demo.example",
      contactMobile: "9876500001",
      contactEmail: "hr@technova-demo.example",
      location: { city: "Bengaluru", state: "Karnataka" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp2",
    name: "GreenLeaf Foods",
    mobile: "9876500002",
    email: "careers@greenleaf-demo.example",
    city: "Pune",
    state: "Maharashtra",
    employerProfile: {
      companyName: "GreenLeaf Foods Pvt Ltd",
      slug: "greenleaf-foods",
      about: "FMCG manufacturer of packaged organic snacks, distributed pan-India.",
      logo: null,
      coverImage: "/demo/agriculture-2.jpg",
      industry: "FMCG / Food Processing",
      companySize: "201-500",
      website: "https://greenleaf-demo.example",
      contactMobile: "9876500002",
      contactEmail: "careers@greenleaf-demo.example",
      location: { city: "Pune", state: "Maharashtra" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
];

/* --------------------------------------------------------------- candidates -- */

const CANDIDATES = [
  {
    id: "usr_cand1",
    name: "Priya Sharma",
    mobile: "9876500011",
    email: "priya.sharma.demo@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    candidateProfile: {
      headline: "Backend Engineer — Node.js & Postgres",
      summary: "5 years building high-throughput APIs for logistics and fintech platforms.",
      resumeUrl: null,
      skills: ["Node.js", "PostgreSQL", "TypeScript", "Docker", "AWS"],
      experienceYears: 5,
      currentRole: "Senior Software Engineer",
      currentCompany: "Freight Analytics Co.",
      expectedSalary: 1800000,
      preferredLocations: ["Bengaluru", "Remote"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876500011",
      contactEmail: "priya.sharma.demo@example.com",
      isOpenToWork: true,
      education: [
        { degree: "B.E. Computer Science", institution: "RV College of Engineering", year: 2019 },
      ],
      workHistory: [
        { company: "Freight Analytics Co.", role: "Senior Software Engineer", duration: "2022–present", description: "Owns the pricing-engine API." },
        { company: "PayEase", role: "Software Engineer", duration: "2019–2022", description: "Payments reconciliation service." },
      ],
    },
  },
  {
    id: "usr_cand2",
    name: "Rohit Verma",
    mobile: "9876500012",
    email: "rohit.verma.demo@example.com",
    city: "Pune",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Regional Sales Manager — FMCG",
      summary: "8 years in FMCG distribution sales across Western India.",
      resumeUrl: null,
      skills: ["B2B Sales", "Distributor Management", "Negotiation", "Excel"],
      experienceYears: 8,
      currentRole: "Area Sales Manager",
      currentCompany: "Sunrise Snacks Ltd",
      expectedSalary: 1200000,
      preferredLocations: ["Pune", "Mumbai"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876500012",
      contactEmail: "rohit.verma.demo@example.com",
      isOpenToWork: true,
      education: [
        { degree: "MBA Marketing", institution: "Symbiosis Institute of Business Management", year: 2016 },
      ],
      workHistory: [
        { company: "Sunrise Snacks Ltd", role: "Area Sales Manager", duration: "2020–present", description: "Manages 40+ distributors across Maharashtra." },
      ],
    },
  },
];

/* --------------------------------------------------------------------- jobs -- */

const JOBS = [
  {
    id: "job_demo1",
    employerId: "usr_emp1",
    title: "Backend Engineer (Node.js)",
    description: "Build and scale the APIs powering our supplier-matching engine.",
    jobFunction: "engineering",
    employmentType: "full-time",
    experienceLevel: "mid",
    location: { city: "Bengaluru", state: "Karnataka", remote: false },
    salaryRange: { min: 1200000, max: 2000000, currency: "INR", isDisclosed: true },
    skills: ["Node.js", "PostgreSQL", "REST APIs"],
    responsibilities: ["Design and ship backend services", "Own API performance and reliability"],
    requirements: ["3+ years with Node.js", "Comfortable with SQL and query optimization"],
    benefits: ["Health insurance", "Flexible hours"],
    openings: 2,
  },
  {
    id: "job_demo2",
    employerId: "usr_emp1",
    title: "Frontend Engineer (React)",
    description: "Own the buyer-facing search and discovery experience.",
    jobFunction: "engineering",
    employmentType: "full-time",
    experienceLevel: "entry",
    location: { city: "Bengaluru", state: "Karnataka", remote: true },
    salaryRange: { min: 800000, max: 1400000, currency: "INR", isDisclosed: true },
    skills: ["React", "TypeScript", "CSS"],
    responsibilities: ["Build responsive UI", "Collaborate with design on new flows"],
    requirements: ["1+ years with React", "Strong CSS fundamentals"],
    benefits: ["Health insurance", "Remote-friendly"],
    openings: 1,
  },
  {
    id: "job_demo3",
    employerId: "usr_emp1",
    title: "Product Designer",
    description: "Shape the end-to-end experience for our directory and recruitment products.",
    jobFunction: "design",
    employmentType: "full-time",
    experienceLevel: "senior",
    location: { city: "Bengaluru", state: "Karnataka", remote: false },
    salaryRange: { min: 1500000, max: 2400000, currency: "INR", isDisclosed: true },
    skills: ["Figma", "Design Systems", "User Research"],
    responsibilities: ["Lead design for new product surfaces", "Maintain the design system"],
    requirements: ["5+ years product design experience", "Portfolio required"],
    benefits: ["Health insurance", "Annual learning budget"],
    openings: 1,
  },
  {
    id: "job_demo4",
    employerId: "usr_emp2",
    title: "Regional Sales Manager — West",
    description: "Grow distributor coverage for our organic snacks range across Maharashtra & Gujarat.",
    jobFunction: "sales",
    employmentType: "full-time",
    experienceLevel: "senior",
    location: { city: "Pune", state: "Maharashtra", remote: false },
    salaryRange: { min: 1000000, max: 1500000, currency: "INR", isDisclosed: true },
    skills: ["B2B Sales", "Distributor Management"],
    responsibilities: ["Own the Western India distributor network", "Hit quarterly volume targets"],
    requirements: ["5+ years FMCG sales experience", "Willing to travel"],
    benefits: ["Travel allowance", "Performance bonus"],
    openings: 1,
  },
  {
    id: "job_demo5",
    employerId: "usr_emp2",
    title: "Supply Chain Intern",
    description: "Support the ops team on inbound logistics and vendor coordination.",
    jobFunction: "operations",
    employmentType: "internship",
    experienceLevel: "entry",
    location: { city: "Pune", state: "Maharashtra", remote: false },
    salaryRange: { min: null, max: null, currency: "INR", isDisclosed: false },
    skills: ["Excel", "Communication"],
    responsibilities: ["Track shipments", "Coordinate with vendors on delivery schedules"],
    requirements: ["Currently pursuing a degree in supply chain / operations"],
    benefits: ["Stipend", "Certificate on completion"],
    openings: 3,
  },
].map((j) => ({
  ...j,
  status: "active",
  viewCount: 0,
  applicationCount: 0,
  postedAt: new Date().toISOString(),
  expiresAt: null,
}));

/* ---------------------------------------------------------------- applications -- */

function statusHistoryFor(status) {
  const now = new Date().toISOString();
  const history = [{ status: "applied", note: null, changedAt: now }];
  if (status !== "applied") history.push({ status, note: null, changedAt: now });
  return history;
}

const APPLICATIONS = [
  {
    id: "app_demo1",
    jobId: "job_demo1",
    employerId: "usr_emp1",
    candidateId: "usr_cand1",
    resumeUrl: null,
    coverNote: "I've built exactly this kind of matching-engine API before — would love to chat.",
    status: "shortlisted",
  },
  {
    id: "app_demo2",
    jobId: "job_demo3",
    employerId: "usr_emp1",
    candidateId: "usr_cand1",
    resumeUrl: null,
    coverNote: "Design isn't my primary background, but I've led several internal tooling redesigns.",
    status: "rejected",
  },
  {
    id: "app_demo3",
    jobId: "job_demo4",
    employerId: "usr_emp2",
    candidateId: "usr_cand2",
    resumeUrl: null,
    coverNote: "8 years running exactly this territory for a competitor brand.",
    status: "applied",
  },
].map((a) => {
  const now = new Date().toISOString();
  return { ...a, statusHistory: statusHistoryFor(a.status), appliedAt: now, updatedAt: now };
});

/* --------------------------------------------------------------------- run -- */

(async () => {
  let jobFunctionsUpserted = 0;
  let usersUpserted = 0;
  let jobsUpserted = 0;
  let applicationsUpserted = 0;

  for (const jf of JOB_FUNCTIONS) {
    const existing = await store.getById("job-functions.json", jf.id);
    if (existing) {
      const { id, ...patch } = jf;
      await store.update("job-functions.json", jf.id, patch);
    } else {
      await store.insert("job-functions.json", jf);
    }
    jobFunctionsUpserted++;
  }

  for (const person of [...EMPLOYERS, ...CANDIDATES]) {
    const existing = await store.getById("users.json", person.id);
    const record = {
      id: person.id,
      name: person.name,
      mobile: person.mobile,
      email: person.email,
      passwordHash: DEMO_PASSWORD_HASH,
      avatarUrl: null,
      city: person.city,
      state: person.state,
      roles: ["user"],
      interests: [],
      employerProfile: person.employerProfile || null,
      candidateProfile: person.candidateProfile || null,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };
    if (existing) {
      const { id, createdAt, ...patch } = record;
      await store.update("users.json", person.id, patch);
    } else {
      await store.insert("users.json", record);
    }
    usersUpserted++;
  }

  for (const job of JOBS) {
    const existing = await store.getById("jobs.json", job.id);
    if (existing) {
      // Preserve live counters across re-runs instead of resetting demo view/application
      // counts back to 0 every time this script is re-run.
      const { id, viewCount, applicationCount, postedAt, ...patch } = job;
      await store.update("jobs.json", job.id, patch);
    } else {
      await store.insert("jobs.json", job);
    }
    jobsUpserted++;
  }

  for (const application of APPLICATIONS) {
    const existing = await store.getById("applications.json", application.id);
    if (existing) {
      const { id, appliedAt, ...patch } = application;
      await store.update("applications.json", application.id, patch);
    } else {
      await store.insert("applications.json", application);
    }
    applicationsUpserted++;
  }

  console.log(
    `Recruitment demo data seeded: ${jobFunctionsUpserted} job functions, ` +
    `${usersUpserted} users (employers+candidates), ${jobsUpserted} jobs, ` +
    `${applicationsUpserted} applications.`
  );
})().catch((err) => {
  console.error("seed-recruitment-demo failed:", err);
  process.exitCode = 1;
});
