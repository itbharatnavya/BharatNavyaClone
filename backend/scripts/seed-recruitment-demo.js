/**
 * seed-recruitment-demo.js — demo data for the Recruitment product (RECRUITMENT.md).
 *
 * Adds:
 *   1. job-functions.json — 9-entry flat taxonomy.
 *   2. job-roles.json — ~49-entry predefined job-title picklist, tagged to a job
 *      function (0005_add_recruitment_master_data.sql). Nothing in the UI reads this
 *      as a dropdown yet (forms stay free-text) — this exists so the data is in the DB
 *      ready for that wiring later, same spirit as job-functions.json before its routes
 *      existed.
 *   3. skills.json — ~86-entry predefined skills picklist, tagged to a job function
 *      (nullable — general/soft skills apply to none).
 *   4. 15 demo employers across varied industries (IT, FMCG, logistics, textiles,
 *      construction, electronics, healthcare, automotive, retail, steel, edtech,
 *      fintech, agri-tech, packaging, chemicals) — approved, so their jobs show on the
 *      public browse immediately.
 *   5. 14 demo candidates with full candidateProfile, spanning every job function.
 *   6. 45 demo jobs across the 15 employers (varied jobFunction/employmentType/
 *      experienceLevel/city/postedAt — spread over the last ~25 days so the browse
 *      feels current — enough to exercise every filter).
 *   7. 24 demo applications across every status (applied/viewed/shortlisted/interview/
 *      rejected/hired) so the employer Applications tab and candidate My Applications
 *      tab both have something real to render.
 *   8. 30 demo company reviews (2 per employer) via the existing generic reviews.json
 *      (targetUserId = employer's user id) — RECRUITMENT.md §"reviews are already
 *      generic" — no new collection needed.
 *   9. 7 demo ad bookings (4 recruitment_home + 3 recruitment_search_top) via the
 *      existing generic ad-bookings.json, against the recruitment_home /
 *      recruitment_search_top slots already in ad-slots.json — the homepage's
 *      AdSlider rendered nothing before this (no bookings existed for either slot).
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
 *   npm run migrate-schema    (existing DB, applies schema-migrations/0002_.../0005_...)
 * then this script.
 */

const store = require("../lib/pg-store");

// Shared demo password hash — same one already used across most other seeded demo
// accounts in backend/DB/users.json (see HANDOVER.md for the plaintext).
const DEMO_PASSWORD_HASH = "$2b$10$ZYfWl9e9d1P.yIVRZvGPwudhDqNuxcayBtoZUxmJOYR.freSH0oAS";

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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

/* -------------------------------------------------------------- job roles -- */

let roleOrder = 0;
function roleGroup(jobFunction, titles) {
  return titles.map((title) => ({
    id: `jr_${slugify(title)}`,
    title,
    slug: slugify(title),
    jobFunction,
    order: roleOrder++,
    isActive: true,
  }));
}

const JOB_ROLES = [
  ...roleGroup("engineering", [
    "Backend Engineer", "Frontend Engineer", "Full Stack Developer", "DevOps Engineer",
    "QA Engineer", "Mobile App Developer", "Data Engineer", "Machine Learning Engineer",
    "Site Reliability Engineer",
  ]),
  ...roleGroup("sales", [
    "Sales Executive", "Business Development Executive", "Regional Sales Manager",
    "Key Account Manager", "Inside Sales Representative", "Channel Sales Manager",
  ]),
  ...roleGroup("marketing", [
    "Digital Marketing Executive", "Content Marketing Specialist", "SEO Specialist",
    "Social Media Manager", "Brand Manager", "Performance Marketing Manager",
  ]),
  ...roleGroup("design", [
    "UI/UX Designer", "Product Designer", "Graphic Designer", "Visual Designer", "Motion Designer",
  ]),
  ...roleGroup("operations", [
    "Operations Manager", "Supply Chain Analyst", "Logistics Coordinator",
    "Warehouse Manager", "Procurement Executive",
  ]),
  ...roleGroup("customer-support", [
    "Customer Support Executive", "Customer Success Manager", "Technical Support Engineer",
    "Call Center Agent",
  ]),
  ...roleGroup("finance", [
    "Accountant", "Financial Analyst", "Finance Manager", "Accounts Payable Executive", "Tax Consultant",
  ]),
  ...roleGroup("hr", [
    "HR Executive", "Talent Acquisition Specialist", "HR Business Partner", "HR Manager", "Payroll Executive",
  ]),
  ...roleGroup("product", [
    "Product Manager", "Associate Product Manager", "Business Analyst", "Product Owner",
  ]),
];

/* ----------------------------------------------------------------- skills -- */

let skillOrder = 0;
function skillGroup(jobFunction, names) {
  return names.map((name) => ({
    id: `sk_${slugify(name)}`,
    name,
    slug: slugify(name),
    jobFunction,
    order: skillOrder++,
    isActive: true,
  }));
}

const SKILLS = [
  ...skillGroup("engineering", [
    "Node.js", "React", "TypeScript", "Python", "Java", "PostgreSQL", "MongoDB", "AWS",
    "Docker", "Kubernetes", "REST APIs", "GraphQL", "CI/CD", "Git", "Microservices",
    "System Design", "Android (Kotlin)", "iOS (Swift)", "Machine Learning",
    "Data Structures & Algorithms",
  ]),
  ...skillGroup("sales", [
    "B2B Sales", "B2C Sales", "Negotiation", "Lead Generation", "CRM Software",
    "Distributor Management", "Channel Sales", "Cold Calling", "Account Management",
  ]),
  ...skillGroup("marketing", [
    "SEO", "Google Ads (SEM)", "Content Writing", "Social Media Marketing",
    "Email Marketing", "Google Analytics", "Brand Strategy", "Marketing Automation", "Copywriting",
  ]),
  ...skillGroup("design", [
    "Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator", "Design Systems",
    "User Research", "Wireframing", "Prototyping",
  ]),
  ...skillGroup("operations", [
    "Supply Chain Management", "Inventory Management", "Vendor Management",
    "Logistics Planning", "Six Sigma", "ERP Software", "Warehouse Operations",
  ]),
  ...skillGroup("customer-support", [
    "Customer Service", "Zendesk", "Ticketing Systems", "Conflict Resolution",
  ]),
  ...skillGroup("finance", [
    "Tally", "SAP", "Financial Modeling", "GST Compliance", "Excel", "Budgeting", "Auditing",
  ]),
  ...skillGroup("hr", [
    "Recruitment", "Onboarding", "HRIS", "Performance Management", "Employee Engagement",
    "Payroll Processing", "Labour Law Compliance",
  ]),
  ...skillGroup("product", [
    "Product Strategy", "Roadmapping", "A/B Testing", "User Stories", "Agile/Scrum", "Market Research",
  ]),
  ...skillGroup(null, [
    "Communication", "Leadership", "Problem Solving", "Team Management", "Time Management",
    "MS Office", "English Proficiency", "Presentation Skills",
  ]),
];

/* ---------------------------------------------------------------- employers -- */

function recruiterFields() {
  return { recruitmentRole: "recruiter", recruitmentRoleLockedAt: "2026-08-01T00:00:00.000Z" };
}
function candidateFields() {
  return { recruitmentRole: "candidate", recruitmentRoleLockedAt: "2026-08-01T00:00:00.000Z" };
}

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
  {
    id: "usr_emp3",
    name: "Vantage Logistics India",
    mobile: "9876503003",
    email: "careers@vantagelogistics-demo.example",
    city: "Mumbai",
    state: "Maharashtra",
    employerProfile: {
      companyName: "Vantage Logistics India Pvt Ltd",
      slug: "vantage-logistics-india",
      about: "Pan-India freight and warehousing operator serving e-commerce and FMCG clients.",
      logo: null,
      coverImage: "/demo/logistics-1.jpg",
      industry: "Logistics & Supply Chain",
      companySize: "501-1000",
      website: "https://vantagelogistics-demo.example",
      contactMobile: "9876503003",
      contactEmail: "careers@vantagelogistics-demo.example",
      location: { city: "Mumbai", state: "Maharashtra" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp4",
    name: "Suryoday Textile Mills",
    mobile: "9876503004",
    email: "hr@suryodaytextiles-demo.example",
    city: "Surat",
    state: "Gujarat",
    employerProfile: {
      companyName: "Suryoday Textile Mills Pvt Ltd",
      slug: "suryoday-textile-mills",
      about: "Integrated textile manufacturer producing fabric and finished garments for domestic brands.",
      logo: null,
      coverImage: "/demo/textile-2.jpg",
      industry: "Textiles & Apparel",
      companySize: "201-500",
      website: "https://suryodaytextiles-demo.example",
      contactMobile: "9876503004",
      contactEmail: "hr@suryodaytextiles-demo.example",
      location: { city: "Surat", state: "Gujarat" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp5",
    name: "Metrocore Constructions",
    mobile: "9876503005",
    email: "careers@metrocore-demo.example",
    city: "Gurugram",
    state: "Haryana",
    employerProfile: {
      companyName: "Metrocore Constructions Pvt Ltd",
      slug: "metrocore-constructions",
      about: "Real-estate developer and EPC contractor delivering residential and commercial projects across NCR.",
      logo: null,
      coverImage: "/demo/construction-3.jpg",
      industry: "Construction & Real Estate",
      companySize: "501-1000",
      website: "https://metrocore-demo.example",
      contactMobile: "9876503005",
      contactEmail: "careers@metrocore-demo.example",
      location: { city: "Gurugram", state: "Haryana" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp6",
    name: "Bluewave Electronics",
    mobile: "9876503006",
    email: "hr@bluewaveelectronics-demo.example",
    city: "Chennai",
    state: "Tamil Nadu",
    employerProfile: {
      companyName: "Bluewave Electronics Manufacturing Ltd",
      slug: "bluewave-electronics-manufacturing",
      about: "Contract manufacturer of consumer electronics and PCB assemblies for domestic and export brands.",
      logo: null,
      coverImage: "/demo/electronics-3.jpg",
      industry: "Electronics Manufacturing",
      companySize: "1000+",
      website: "https://bluewaveelectronics-demo.example",
      contactMobile: "9876503006",
      contactEmail: "hr@bluewaveelectronics-demo.example",
      location: { city: "Chennai", state: "Tamil Nadu" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp7",
    name: "HealFirst Diagnostics",
    mobile: "9876503007",
    email: "careers@healfirst-demo.example",
    city: "Hyderabad",
    state: "Telangana",
    employerProfile: {
      companyName: "HealFirst Diagnostics Pvt Ltd",
      slug: "healfirst-diagnostics",
      about: "Chain of diagnostic labs and imaging centres across Telangana and Andhra Pradesh.",
      logo: null,
      coverImage: "/demo/medical-2.jpg",
      industry: "Healthcare & Diagnostics",
      companySize: "201-500",
      website: "https://healfirst-demo.example",
      contactMobile: "9876503007",
      contactEmail: "careers@healfirst-demo.example",
      location: { city: "Hyderabad", state: "Telangana" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp8",
    name: "Zenith Auto Components",
    mobile: "9876503008",
    email: "hr@zenithauto-demo.example",
    city: "Pune",
    state: "Maharashtra",
    employerProfile: {
      companyName: "Zenith Auto Components Ltd",
      slug: "zenith-auto-components",
      about: "Tier-1 supplier of precision-machined components to leading Indian and global OEMs.",
      logo: null,
      coverImage: "/demo/automotive-2.jpg",
      industry: "Automotive Components",
      companySize: "501-1000",
      website: "https://zenithauto-demo.example",
      contactMobile: "9876503008",
      contactEmail: "hr@zenithauto-demo.example",
      location: { city: "Pune", state: "Maharashtra" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp9",
    name: "UrbanCart Retail",
    mobile: "9876503009",
    email: "careers@urbancart-demo.example",
    city: "New Delhi",
    state: "Delhi",
    employerProfile: {
      companyName: "UrbanCart Retail Pvt Ltd",
      slug: "urbancart-retail",
      about: "Fast-growing D2C and marketplace retailer for home & lifestyle products.",
      logo: null,
      coverImage: "/demo/retail-3.jpg",
      industry: "Retail & E-commerce",
      companySize: "201-500",
      website: "https://urbancart-demo.example",
      contactMobile: "9876503009",
      contactEmail: "careers@urbancart-demo.example",
      location: { city: "New Delhi", state: "Delhi" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp10",
    name: "Prakash Steel & Alloys",
    mobile: "9876503010",
    email: "hr@prakashsteel-demo.example",
    city: "Jamshedpur",
    state: "Jharkhand",
    employerProfile: {
      companyName: "Prakash Steel & Alloys Ltd",
      slug: "prakash-steel-alloys",
      about: "Integrated steel producer supplying long products to construction and infrastructure projects.",
      logo: null,
      coverImage: "/demo/steel-2.jpg",
      industry: "Metals & Steel",
      companySize: "1000+",
      website: "https://prakashsteel-demo.example",
      contactMobile: "9876503010",
      contactEmail: "hr@prakashsteel-demo.example",
      location: { city: "Jamshedpur", state: "Jharkhand" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp11",
    name: "NextGen EdTech",
    mobile: "9876503011",
    email: "careers@nextgenedtech-demo.example",
    city: "Bengaluru",
    state: "Karnataka",
    employerProfile: {
      companyName: "NextGen EdTech Pvt Ltd",
      slug: "nextgen-edtech",
      about: "Online learning platform for K-12 and competitive-exam prep, serving students pan-India.",
      logo: null,
      coverImage: "/demo/business-3.jpg",
      industry: "Education Technology",
      companySize: "51-200",
      website: "https://nextgenedtech-demo.example",
      contactMobile: "9876503011",
      contactEmail: "careers@nextgenedtech-demo.example",
      location: { city: "Bengaluru", state: "Karnataka" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp12",
    name: "FinEdge Capital Advisors",
    mobile: "9876503012",
    email: "careers@finedge-demo.example",
    city: "Mumbai",
    state: "Maharashtra",
    employerProfile: {
      companyName: "FinEdge Capital Advisors Pvt Ltd",
      slug: "finedge-capital-advisors",
      about: "Wealth management and lending-tech firm serving retail and SME customers.",
      logo: null,
      coverImage: "/demo/business-1.jpg",
      industry: "Financial Services",
      companySize: "51-200",
      website: "https://finedge-demo.example",
      contactMobile: "9876503012",
      contactEmail: "careers@finedge-demo.example",
      location: { city: "Mumbai", state: "Maharashtra" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp13",
    name: "AgriGrow Farm Solutions",
    mobile: "9876503013",
    email: "hr@agrigrow-demo.example",
    city: "Nashik",
    state: "Maharashtra",
    employerProfile: {
      companyName: "AgriGrow Farm Solutions Pvt Ltd",
      slug: "agrigrow-farm-solutions",
      about: "Agri-tech company connecting farmers with markets via a mobile-first produce marketplace.",
      logo: null,
      coverImage: "/demo/agriculture-4.jpg",
      industry: "Agriculture & Agri-tech",
      companySize: "11-50",
      website: "https://agrigrow-demo.example",
      contactMobile: "9876503013",
      contactEmail: "hr@agrigrow-demo.example",
      location: { city: "Nashik", state: "Maharashtra" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp14",
    name: "PackRight Industries",
    mobile: "9876503014",
    email: "careers@packright-demo.example",
    city: "Ahmedabad",
    state: "Gujarat",
    employerProfile: {
      companyName: "PackRight Industries Pvt Ltd",
      slug: "packright-industries",
      about: "Manufacturer of corrugated and flexible packaging for FMCG and pharma clients.",
      logo: null,
      coverImage: "/demo/packaging-2.jpg",
      industry: "Packaging",
      companySize: "201-500",
      website: "https://packright-demo.example",
      contactMobile: "9876503014",
      contactEmail: "careers@packright-demo.example",
      location: { city: "Ahmedabad", state: "Gujarat" },
      status: "approved",
      isVerified: true,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
  {
    id: "usr_emp15",
    name: "ChemPure Industries",
    mobile: "9876503015",
    email: "hr@chempure-demo.example",
    city: "Vadodara",
    state: "Gujarat",
    employerProfile: {
      companyName: "ChemPure Industries Ltd",
      slug: "chempure-industries",
      about: "Specialty-chemicals manufacturer supplying intermediates to pharma and agrochemical companies.",
      logo: null,
      coverImage: "/demo/chemical-1.jpg",
      industry: "Specialty Chemicals",
      companySize: "201-500",
      website: "https://chempure-demo.example",
      contactMobile: "9876503015",
      contactEmail: "hr@chempure-demo.example",
      location: { city: "Vadodara", state: "Gujarat" },
      status: "approved",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    },
  },
].map((e) => ({ ...e, ...recruiterFields() }));

/* --------------------------------------------------------------- candidates -- */

// A stand-in CV for every demo candidate so they clear the "profile complete"
// gate (lib/recruitmentProfile) and can actually apply in a demo. Points at a file
// already in frontend/public/uploads/; the gate only needs a non-empty URL.
const DEMO_RESUME_URL = "/uploads/up_1787570327506_dofy26.pdf";

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
      resumeUrl: DEMO_RESUME_URL,
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
      resumeUrl: DEMO_RESUME_URL,
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
  {
    id: "usr_cand3",
    name: "Ananya Iyer",
    mobile: "9876504003",
    email: "ananya.iyer.demo@example.com",
    city: "Chennai",
    state: "Tamil Nadu",
    candidateProfile: {
      headline: "Digital Marketing Executive — Performance & SEO",
      summary: "4 years running paid and organic acquisition for D2C and healthcare brands.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["SEO", "Google Ads (SEM)", "Google Analytics", "Content Writing", "Social Media Marketing"],
      experienceYears: 4,
      currentRole: "Digital Marketing Associate",
      currentCompany: "Coastal Wellness Pvt Ltd",
      expectedSalary: 750000,
      preferredLocations: ["Chennai", "Remote"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504003",
      contactEmail: "ananya.iyer.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "MBA Marketing", institution: "Loyola Institute of Business Administration", year: 2021 }],
      workHistory: [
        { company: "Coastal Wellness Pvt Ltd", role: "Digital Marketing Associate", duration: "2021–present", description: "Runs Google/Meta ads and SEO for the brand's D2C storefront." },
      ],
    },
  },
  {
    id: "usr_cand4",
    name: "Vikram Singh",
    mobile: "9876504004",
    email: "vikram.singh.demo@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    candidateProfile: {
      headline: "DevOps Engineer — AWS & Kubernetes",
      summary: "6 years automating deployment pipelines and infrastructure for SaaS products.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["AWS", "Kubernetes", "Docker", "CI/CD", "System Design"],
      experienceYears: 6,
      currentRole: "DevOps Engineer",
      currentCompany: "CloudMesh Technologies",
      expectedSalary: 2000000,
      preferredLocations: ["Bengaluru", "Hyderabad", "Remote"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504004",
      contactEmail: "vikram.singh.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.Tech Information Technology", institution: "PES University", year: 2018 }],
      workHistory: [
        { company: "CloudMesh Technologies", role: "DevOps Engineer", duration: "2020–present", description: "Owns Kubernetes clusters and CI/CD pipelines for 12 microservices." },
      ],
    },
  },
  {
    id: "usr_cand5",
    name: "Neha Gupta",
    mobile: "9876504005",
    email: "neha.gupta.demo@example.com",
    city: "Gurugram",
    state: "Haryana",
    candidateProfile: {
      headline: "HR Business Partner — Talent & Engagement",
      summary: "7 years partnering with business leaders on hiring, engagement and performance cycles.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Recruitment", "Employee Engagement", "Performance Management", "HRIS"],
      experienceYears: 7,
      currentRole: "HR Business Partner",
      currentCompany: "Skyline Infra Ltd",
      expectedSalary: 1400000,
      preferredLocations: ["Gurugram", "Delhi"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504005",
      contactEmail: "neha.gupta.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "MBA Human Resources", institution: "XLRI Jamshedpur", year: 2017 }],
      workHistory: [
        { company: "Skyline Infra Ltd", role: "HR Business Partner", duration: "2019–present", description: "Partners with 3 business units on hiring and performance management." },
      ],
    },
  },
  {
    id: "usr_cand6",
    name: "Arjun Mehta",
    mobile: "9876504006",
    email: "arjun.mehta.demo@example.com",
    city: "Mumbai",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Product Manager — Fintech & Lending",
      summary: "6 years shaping consumer lending and payments products from 0-to-1.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Product Strategy", "Roadmapping", "A/B Testing", "Agile/Scrum", "Market Research"],
      experienceYears: 6,
      currentRole: "Senior Product Manager",
      currentCompany: "CreditWise Financial Services",
      expectedSalary: 2800000,
      preferredLocations: ["Mumbai", "Remote"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504006",
      contactEmail: "arjun.mehta.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "MBA", institution: "Indian Institute of Management, Ahmedabad", year: 2018 }],
      workHistory: [
        { company: "CreditWise Financial Services", role: "Senior Product Manager", duration: "2021–present", description: "Owns the personal-loans product line end to end." },
      ],
    },
  },
  {
    id: "usr_cand7",
    name: "Sneha Reddy",
    mobile: "9876504007",
    email: "sneha.reddy.demo@example.com",
    city: "Hyderabad",
    state: "Telangana",
    candidateProfile: {
      headline: "UI/UX Designer — Product & Design Systems",
      summary: "5 years designing mobile-first experiences for consumer apps.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Wireframing"],
      experienceYears: 5,
      currentRole: "Product Designer",
      currentCompany: "Pixel Forge Studio",
      expectedSalary: 1600000,
      preferredLocations: ["Hyderabad", "Bengaluru", "Remote"],
      preferredJobTypes: ["full-time", "freelance"],
      contactPhone: "9876504007",
      contactEmail: "sneha.reddy.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.Des", institution: "National Institute of Design", year: 2019 }],
      workHistory: [
        { company: "Pixel Forge Studio", role: "Product Designer", duration: "2020–present", description: "Leads design for 2 consumer-facing mobile apps." },
      ],
    },
  },
  {
    id: "usr_cand8",
    name: "Karan Malhotra",
    mobile: "9876504008",
    email: "karan.malhotra.demo@example.com",
    city: "Mumbai",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Financial Analyst — FP&A",
      summary: "4 years in financial planning & analysis for mid-size financial services firms.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Financial Modeling", "Excel", "Budgeting", "SAP"],
      experienceYears: 4,
      currentRole: "Financial Analyst",
      currentCompany: "Meridian Capital",
      expectedSalary: 1100000,
      preferredLocations: ["Mumbai"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504008",
      contactEmail: "karan.malhotra.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.Com + CFA (Level 2)", institution: "Narsee Monjee College of Commerce", year: 2020 }],
      workHistory: [
        { company: "Meridian Capital", role: "Financial Analyst", duration: "2021–present", description: "Builds quarterly forecasting models and board decks." },
      ],
    },
  },
  {
    id: "usr_cand9",
    name: "Divya Nair",
    mobile: "9876504009",
    email: "divya.nair.demo@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    candidateProfile: {
      headline: "Customer Success Manager — SaaS & Healthcare",
      summary: "5 years managing enterprise accounts and reducing churn for B2B platforms.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Customer Service", "Zendesk", "Conflict Resolution", "Communication"],
      experienceYears: 5,
      currentRole: "Customer Success Manager",
      currentCompany: "CarePlus Health Systems",
      expectedSalary: 1300000,
      preferredLocations: ["Bengaluru", "Hyderabad"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504009",
      contactEmail: "divya.nair.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.A. Psychology", institution: "Christ University", year: 2018 }],
      workHistory: [
        { company: "CarePlus Health Systems", role: "Customer Success Manager", duration: "2021–present", description: "Owns onboarding and renewals for 60+ enterprise accounts." },
      ],
    },
  },
  {
    id: "usr_cand10",
    name: "Rahul Deshmukh",
    mobile: "9876504010",
    email: "rahul.deshmukh.demo@example.com",
    city: "Pune",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Operations Manager — Manufacturing & Logistics",
      summary: "9 years running plant and warehouse operations for mid-size manufacturers.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Supply Chain Management", "Six Sigma", "Vendor Management", "ERP Software"],
      experienceYears: 9,
      currentRole: "Operations Manager",
      currentCompany: "Ashoka Industrial Products",
      expectedSalary: 1700000,
      preferredLocations: ["Pune", "Mumbai"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504010",
      contactEmail: "rahul.deshmukh.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.E. Mechanical Engineering", institution: "College of Engineering, Pune", year: 2015 }],
      workHistory: [
        { company: "Ashoka Industrial Products", role: "Operations Manager", duration: "2019–present", description: "Runs day-to-day operations across 2 plants and a regional warehouse." },
      ],
    },
  },
  {
    id: "usr_cand11",
    name: "Pooja Iyengar",
    mobile: "9876504011",
    email: "pooja.iyengar.demo@example.com",
    city: "Chennai",
    state: "Tamil Nadu",
    candidateProfile: {
      headline: "Business Development Executive — B2B & Industrial",
      summary: "3 years generating and closing B2B leads in the industrial components space.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Lead Generation", "B2B Sales", "Cold Calling", "CRM Software"],
      experienceYears: 3,
      currentRole: "Business Development Executive",
      currentCompany: "Precision Components Co.",
      expectedSalary: 650000,
      preferredLocations: ["Chennai", "Bengaluru"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504011",
      contactEmail: "pooja.iyengar.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "BBA", institution: "Madras Christian College", year: 2022 }],
      workHistory: [
        { company: "Precision Components Co.", role: "Business Development Executive", duration: "2022–present", description: "Prospects and closes new OEM accounts across South India." },
      ],
    },
  },
  {
    id: "usr_cand12",
    name: "Aditya Kulkarni",
    mobile: "9876504012",
    email: "aditya.kulkarni.demo@example.com",
    city: "Pune",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Full Stack Developer — React & Node.js",
      summary: "4 years building end-to-end web applications for e-commerce and edtech products.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
      experienceYears: 4,
      currentRole: "Full Stack Developer",
      currentCompany: "ShopEasy Technologies",
      expectedSalary: 1500000,
      preferredLocations: ["Pune", "Remote"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504012",
      contactEmail: "aditya.kulkarni.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.E. Computer Engineering", institution: "Pune Institute of Computer Technology", year: 2020 }],
      workHistory: [
        { company: "ShopEasy Technologies", role: "Full Stack Developer", duration: "2020–present", description: "Builds and maintains the seller-dashboard web app." },
      ],
    },
  },
  {
    id: "usr_cand13",
    name: "Meera Krishnan",
    mobile: "9876504013",
    email: "meera.krishnan.demo@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    candidateProfile: {
      headline: "Content Marketing Specialist — B2B SaaS",
      summary: "3 years writing and managing content programs for B2B and edtech brands.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Content Writing", "Copywriting", "SEO", "Social Media Marketing"],
      experienceYears: 3,
      currentRole: "Content Marketing Specialist",
      currentCompany: "LearnSphere Pvt Ltd",
      expectedSalary: 700000,
      preferredLocations: ["Bengaluru", "Remote"],
      preferredJobTypes: ["full-time", "contract"],
      contactPhone: "9876504013",
      contactEmail: "meera.krishnan.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "B.A. English Literature", institution: "Mount Carmel College", year: 2021 }],
      workHistory: [
        { company: "LearnSphere Pvt Ltd", role: "Content Marketing Specialist", duration: "2022–present", description: "Owns the blog and email content calendar." },
      ],
    },
  },
  {
    id: "usr_cand14",
    name: "Suresh Nair",
    mobile: "9876504014",
    email: "suresh.nair.demo@example.com",
    city: "Mumbai",
    state: "Maharashtra",
    candidateProfile: {
      headline: "Supply Chain Analyst — Procurement & Planning",
      summary: "5 years in demand planning and vendor coordination for FMCG and agri-supply chains.",
      resumeUrl: DEMO_RESUME_URL,
      skills: ["Supply Chain Management", "Inventory Management", "Vendor Management", "Excel"],
      experienceYears: 5,
      currentRole: "Supply Chain Analyst",
      currentCompany: "Harvest Fresh Distributors",
      expectedSalary: 950000,
      preferredLocations: ["Mumbai", "Pune", "Nashik"],
      preferredJobTypes: ["full-time"],
      contactPhone: "9876504014",
      contactEmail: "suresh.nair.demo@example.com",
      isOpenToWork: true,
      education: [{ degree: "PGDM Operations", institution: "National Institute of Industrial Engineering", year: 2019 }],
      workHistory: [
        { company: "Harvest Fresh Distributors", role: "Supply Chain Analyst", duration: "2021–present", description: "Plans inbound produce logistics across 5 regional hubs." },
      ],
    },
  },
].map((c) => ({ ...c, ...candidateFields() }));

/* --------------------------------------------------------------------- jobs -- */

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const JOB_SPECS = [
  // ── usr_emp1 · TechNova Solutions (Bengaluru, IT) ──────────────────────────
  { id: "job_demo1", employerId: "usr_emp1", title: "Backend Engineer (Node.js)", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Bengaluru", state: "Karnataka", remote: false, salaryMin: 1200000, salaryMax: 2000000, skills: ["Node.js", "PostgreSQL", "REST APIs"], description: "Build and scale the APIs powering our supplier-matching engine.", responsibilities: ["Design and ship backend services", "Own API performance and reliability"], requirements: ["3+ years with Node.js", "Comfortable with SQL and query optimization"], benefits: ["Health insurance", "Flexible hours"], openings: 2, daysAgo: 2 },
  { id: "job_demo2", employerId: "usr_emp1", title: "Frontend Engineer (React)", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "entry", city: "Bengaluru", state: "Karnataka", remote: true, salaryMin: 800000, salaryMax: 1400000, skills: ["React", "TypeScript", "CSS"], description: "Own the buyer-facing search and discovery experience.", responsibilities: ["Build responsive UI", "Collaborate with design on new flows"], requirements: ["1+ years with React", "Strong CSS fundamentals"], benefits: ["Health insurance", "Remote-friendly"], openings: 1, daysAgo: 5 },
  { id: "job_demo3", employerId: "usr_emp1", title: "Product Designer", jobFunction: "design", employmentType: "full-time", experienceLevel: "senior", city: "Bengaluru", state: "Karnataka", remote: false, salaryMin: 1500000, salaryMax: 2400000, skills: ["Figma", "Design Systems", "User Research"], description: "Shape the end-to-end experience for our directory and recruitment products.", responsibilities: ["Lead design for new product surfaces", "Maintain the design system"], requirements: ["5+ years product design experience", "Portfolio required"], benefits: ["Health insurance", "Annual learning budget"], openings: 1, daysAgo: 9 },

  // ── usr_emp2 · GreenLeaf Foods (Pune, FMCG) ─────────────────────────────────
  { id: "job_demo4", employerId: "usr_emp2", title: "Regional Sales Manager — West", jobFunction: "sales", employmentType: "full-time", experienceLevel: "senior", city: "Pune", state: "Maharashtra", remote: false, salaryMin: 1000000, salaryMax: 1500000, skills: ["B2B Sales", "Distributor Management"], description: "Grow distributor coverage for our organic snacks range across Maharashtra & Gujarat.", responsibilities: ["Own the Western India distributor network", "Hit quarterly volume targets"], requirements: ["5+ years FMCG sales experience", "Willing to travel"], benefits: ["Travel allowance", "Performance bonus"], openings: 1, daysAgo: 1 },
  { id: "job_demo5", employerId: "usr_emp2", title: "Supply Chain Intern", jobFunction: "operations", employmentType: "internship", experienceLevel: "entry", city: "Pune", state: "Maharashtra", remote: false, salaryMin: null, salaryMax: null, salaryDisclosed: false, skills: ["Excel", "Communication"], description: "Support the ops team on inbound logistics and vendor coordination.", responsibilities: ["Track shipments", "Coordinate with vendors on delivery schedules"], requirements: ["Currently pursuing a degree in supply chain / operations"], benefits: ["Stipend", "Certificate on completion"], openings: 3, daysAgo: 12 },
  { id: "job_demo6", employerId: "usr_emp2", title: "HR Executive", jobFunction: "hr", employmentType: "full-time", experienceLevel: "entry", city: "Pune", state: "Maharashtra", remote: false, salaryMin: 350000, salaryMax: 550000, skills: ["Recruitment", "Onboarding", "HRIS"], description: "Support hiring and onboarding as we scale our plant workforce.", responsibilities: ["Coordinate factory-floor hiring drives", "Run new-hire onboarding"], requirements: ["1-2 years HR generalist experience"], benefits: ["Health insurance"], openings: 1, daysAgo: 16 },

  // ── usr_emp3 · Vantage Logistics India (Mumbai, Logistics) ─────────────────
  { id: "job_demo7", employerId: "usr_emp3", title: "Logistics Coordinator", jobFunction: "operations", employmentType: "full-time", experienceLevel: "mid", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 500000, salaryMax: 800000, skills: ["Logistics Planning", "Vendor Management", "ERP Software"], description: "Coordinate daily line-haul and last-mile schedules across our Mumbai hub.", responsibilities: ["Plan daily dispatch schedules", "Track SLA adherence with transport vendors"], requirements: ["2+ years in logistics/transport coordination"], benefits: ["Health insurance", "Shift allowance"], openings: 2, daysAgo: 3 },
  { id: "job_demo8", employerId: "usr_emp3", title: "Warehouse Manager", jobFunction: "operations", employmentType: "full-time", experienceLevel: "senior", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 900000, salaryMax: 1300000, skills: ["Warehouse Operations", "Inventory Management", "Six Sigma"], description: "Run day-to-day operations at our 80,000 sq ft Bhiwandi fulfilment centre.", responsibilities: ["Manage a 40-member warehouse team", "Drive inventory accuracy and throughput"], requirements: ["6+ years warehouse management experience"], benefits: ["Health insurance", "Performance bonus"], openings: 1, daysAgo: 8 },
  { id: "job_demo9", employerId: "usr_emp3", title: "Customer Support Executive", jobFunction: "customer-support", employmentType: "full-time", experienceLevel: "entry", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 300000, salaryMax: 450000, skills: ["Customer Service", "Ticketing Systems", "Communication"], description: "Handle shipment-status queries from our B2B clients via phone and chat.", responsibilities: ["Resolve shipment queries within SLA", "Escalate exceptions to ops"], requirements: ["Good spoken English and Hindi", "Comfortable with rotational shifts"], benefits: ["Shift allowance"], openings: 4, daysAgo: 14 },

  // ── usr_emp4 · Suryoday Textile Mills (Surat, Textiles) ─────────────────────
  { id: "job_demo10", employerId: "usr_emp4", title: "Sales Executive", jobFunction: "sales", employmentType: "full-time", experienceLevel: "entry", city: "Surat", state: "Gujarat", remote: false, salaryMin: 300000, salaryMax: 450000, skills: ["B2B Sales", "Negotiation"], description: "Sell fabric rolls and finished garments to domestic wholesale buyers.", responsibilities: ["Visit wholesale markets and onboard new buyers", "Follow up on repeat orders"], requirements: ["1+ years textile/apparel sales preferred"], benefits: ["Travel allowance"], openings: 2, daysAgo: 4 },
  { id: "job_demo11", employerId: "usr_emp4", title: "Accountant", jobFunction: "finance", employmentType: "full-time", experienceLevel: "mid", city: "Surat", state: "Gujarat", remote: false, salaryMin: 400000, salaryMax: 600000, skills: ["Tally", "GST Compliance", "Excel"], description: "Manage day-to-day accounting and GST filings for the Surat unit.", responsibilities: ["Maintain books in Tally", "File monthly GST returns"], requirements: ["3+ years accounting experience", "Working knowledge of GST"], benefits: ["Health insurance"], openings: 1, daysAgo: 11 },
  { id: "job_demo12", employerId: "usr_emp4", title: "Operations Manager", jobFunction: "operations", employmentType: "full-time", experienceLevel: "senior", city: "Surat", state: "Gujarat", remote: false, salaryMin: 900000, salaryMax: 1400000, skills: ["Supply Chain Management", "Vendor Management", "ERP Software"], description: "Oversee production planning and raw-material procurement across two units.", responsibilities: ["Plan production schedules against order book", "Manage yarn and dye vendors"], requirements: ["7+ years textile manufacturing operations experience"], benefits: ["Health insurance", "Performance bonus"], openings: 1, daysAgo: 18 },

  // ── usr_emp5 · Metrocore Constructions (Gurugram, Real Estate) ──────────────
  { id: "job_demo13", employerId: "usr_emp5", title: "Business Development Executive", jobFunction: "sales", employmentType: "full-time", experienceLevel: "mid", city: "Gurugram", state: "Haryana", remote: false, salaryMin: 600000, salaryMax: 1000000, skills: ["B2B Sales", "Lead Generation", "CRM Software"], description: "Generate and close channel-partner tie-ups for our residential projects.", responsibilities: ["Build broker/channel-partner network", "Track leads through CRM to closure"], requirements: ["3+ years real-estate or B2B sales"], benefits: ["Incentive on closures"], openings: 2, daysAgo: 6 },
  { id: "job_demo14", employerId: "usr_emp5", title: "Procurement Executive", jobFunction: "operations", employmentType: "full-time", experienceLevel: "mid", city: "Gurugram", state: "Haryana", remote: false, salaryMin: 500000, salaryMax: 800000, skills: ["Vendor Management", "ERP Software", "Negotiation"], description: "Source construction materials and manage vendor contracts for live sites.", responsibilities: ["Negotiate rate contracts with suppliers", "Track material delivery against site schedules"], requirements: ["3+ years procurement in construction/EPC"], benefits: ["Health insurance"], openings: 1, daysAgo: 10 },
  { id: "job_demo15", employerId: "usr_emp5", title: "Finance Manager", jobFunction: "finance", employmentType: "full-time", experienceLevel: "senior", city: "Gurugram", state: "Haryana", remote: false, salaryMin: 1400000, salaryMax: 2000000, skills: ["Financial Modeling", "Budgeting", "Auditing"], description: "Own project-level budgeting and cash-flow forecasting for ongoing developments.", responsibilities: ["Build project P&Ls and cash-flow models", "Coordinate statutory audits"], requirements: ["8+ years finance experience, real estate preferred", "CA preferred"], benefits: ["Health insurance", "Annual bonus"], openings: 1, daysAgo: 20 },

  // ── usr_emp6 · Bluewave Electronics (Chennai, Electronics Mfg) ─────────────
  { id: "job_demo16", employerId: "usr_emp6", title: "QA Engineer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Chennai", state: "Tamil Nadu", remote: false, salaryMin: 600000, salaryMax: 950000, skills: ["System Design", "Git"], description: "Own quality testing for PCB assembly lines and finished-goods inspection.", responsibilities: ["Design test protocols for new SKUs", "Track defect rates and drive corrective actions"], requirements: ["3+ years QA in electronics manufacturing"], benefits: ["Health insurance"], openings: 2, daysAgo: 2 },
  { id: "job_demo17", employerId: "usr_emp6", title: "Supply Chain Analyst", jobFunction: "operations", employmentType: "full-time", experienceLevel: "entry", city: "Chennai", state: "Tamil Nadu", remote: false, salaryMin: 400000, salaryMax: 600000, skills: ["Inventory Management", "Excel", "ERP Software"], description: "Track component inventory and support demand planning for the assembly lines.", responsibilities: ["Maintain component-level inventory reports", "Flag shortage risks to procurement"], requirements: ["1-2 years supply chain/analytics experience"], benefits: ["Health insurance"], openings: 1, daysAgo: 7 },
  { id: "job_demo18", employerId: "usr_emp6", title: "HR Executive", jobFunction: "hr", employmentType: "full-time", experienceLevel: "entry", city: "Chennai", state: "Tamil Nadu", remote: false, salaryMin: 350000, salaryMax: 500000, skills: ["Recruitment", "Onboarding", "Payroll Processing"], description: "Support blue-collar hiring and payroll administration for the plant.", responsibilities: ["Run weekly hiring drives for line workers", "Process monthly payroll inputs"], requirements: ["1+ years HR/payroll experience"], benefits: ["Health insurance"], openings: 1, daysAgo: 13 },

  // ── usr_emp7 · HealFirst Diagnostics (Hyderabad, Healthcare) ───────────────
  { id: "job_demo19", employerId: "usr_emp7", title: "Customer Support Executive", jobFunction: "customer-support", employmentType: "full-time", experienceLevel: "entry", city: "Hyderabad", state: "Telangana", remote: false, salaryMin: 300000, salaryMax: 450000, skills: ["Customer Service", "Communication", "Conflict Resolution"], description: "Handle patient queries on report status, appointments and billing.", responsibilities: ["Answer patient calls and chat queries", "Coordinate with lab teams on report delays"], requirements: ["Good communication skills", "Comfortable with healthcare terminology"], benefits: ["Health insurance"], openings: 3, daysAgo: 1 },
  { id: "job_demo20", employerId: "usr_emp7", title: "Operations Manager", jobFunction: "operations", employmentType: "full-time", experienceLevel: "senior", city: "Hyderabad", state: "Telangana", remote: false, salaryMin: 1100000, salaryMax: 1600000, skills: ["Supply Chain Management", "ERP Software", "Six Sigma"], description: "Run lab operations across our 6 Hyderabad collection centres.", responsibilities: ["Manage sample collection and TAT compliance", "Oversee centre-level staffing"], requirements: ["6+ years diagnostics/healthcare operations"], benefits: ["Health insurance", "Performance bonus"], openings: 1, daysAgo: 15 },
  { id: "job_demo21", employerId: "usr_emp7", title: "Digital Marketing Executive", jobFunction: "marketing", employmentType: "full-time", experienceLevel: "mid", city: "Hyderabad", state: "Telangana", remote: false, salaryMin: 500000, salaryMax: 800000, skills: ["SEO", "Google Ads (SEM)", "Social Media Marketing"], description: "Drive patient acquisition for our home-collection service via digital channels.", responsibilities: ["Run performance campaigns for home-collection bookings", "Manage local SEO across centre locations"], requirements: ["2+ years digital marketing, healthcare a plus"], benefits: ["Health insurance"], openings: 1, daysAgo: 19 },

  // ── usr_emp8 · Zenith Auto Components (Pune, Automotive) ───────────────────
  { id: "job_demo22", employerId: "usr_emp8", title: "Business Development Executive", jobFunction: "sales", employmentType: "full-time", experienceLevel: "senior", city: "Pune", state: "Maharashtra", remote: false, salaryMin: 900000, salaryMax: 1400000, skills: ["B2B Sales", "Account Management", "Negotiation"], description: "Grow OEM accounts for our precision-machined component lines.", responsibilities: ["Manage relationships with 2-wheeler and 4-wheeler OEMs", "Negotiate annual rate contracts"], requirements: ["5+ years automotive B2B sales"], benefits: ["Travel allowance", "Performance bonus"], openings: 1, daysAgo: 5 },
  { id: "job_demo23", employerId: "usr_emp8", title: "QA Engineer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Pune", state: "Maharashtra", remote: false, salaryMin: 550000, salaryMax: 900000, skills: ["System Design", "Six Sigma"], description: "Own in-line and final quality inspection for precision-machined parts.", responsibilities: ["Run dimensional inspection against OEM specs", "Drive root-cause analysis on rejections"], requirements: ["3+ years QA in auto-components manufacturing"], benefits: ["Health insurance"], openings: 2, daysAgo: 9 },
  { id: "job_demo24", employerId: "usr_emp8", title: "Procurement Executive", jobFunction: "operations", employmentType: "full-time", experienceLevel: "mid", city: "Pune", state: "Maharashtra", remote: false, salaryMin: 500000, salaryMax: 750000, skills: ["Vendor Management", "Negotiation", "ERP Software"], description: "Source raw-material and tooling vendors for the machining shop floor.", responsibilities: ["Negotiate steel and tooling rate contracts", "Track vendor delivery performance"], requirements: ["3+ years procurement in manufacturing"], benefits: ["Health insurance"], openings: 1, daysAgo: 17 },

  // ── usr_emp9 · UrbanCart Retail (Delhi, E-commerce) ─────────────────────────
  { id: "job_demo25", employerId: "usr_emp9", title: "Full Stack Developer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "New Delhi", state: "Delhi", remote: true, salaryMin: 1200000, salaryMax: 1900000, skills: ["React", "Node.js", "PostgreSQL"], description: "Build storefront and checkout-adjacent features for our D2C platform.", responsibilities: ["Ship features across the web storefront", "Own performance of high-traffic pages"], requirements: ["3+ years full-stack development", "Comfortable owning features end-to-end"], benefits: ["Health insurance", "Remote-friendly"], openings: 2, daysAgo: 3 },
  { id: "job_demo26", employerId: "usr_emp9", title: "Digital Marketing Executive", jobFunction: "marketing", employmentType: "full-time", experienceLevel: "mid", city: "New Delhi", state: "Delhi", remote: false, salaryMin: 550000, salaryMax: 900000, skills: ["Google Ads (SEM)", "Social Media Marketing", "Google Analytics"], description: "Run performance-marketing campaigns across Meta and Google for our storefront.", responsibilities: ["Plan and execute paid campaigns", "Report weekly on ROAS and CAC"], requirements: ["2+ years performance marketing, D2C preferred"], benefits: ["Health insurance"], openings: 1, daysAgo: 6 },
  { id: "job_demo27", employerId: "usr_emp9", title: "Customer Success Manager", jobFunction: "customer-support", employmentType: "full-time", experienceLevel: "mid", city: "New Delhi", state: "Delhi", remote: false, salaryMin: 700000, salaryMax: 1100000, skills: ["Customer Service", "Zendesk", "Communication"], description: "Own post-purchase experience and resolve escalations for high-value customers.", responsibilities: ["Manage escalation queue via Zendesk", "Identify recurring issues and loop in product"], requirements: ["3+ years customer success/support, e-commerce preferred"], benefits: ["Health insurance"], openings: 1, daysAgo: 21 },

  // ── usr_emp10 · Prakash Steel & Alloys (Jamshedpur, Steel) ──────────────────
  { id: "job_demo28", employerId: "usr_emp10", title: "Operations Manager", jobFunction: "operations", employmentType: "full-time", experienceLevel: "senior", city: "Jamshedpur", state: "Jharkhand", remote: false, salaryMin: 1300000, salaryMax: 1900000, skills: ["Supply Chain Management", "Six Sigma", "ERP Software"], description: "Oversee rolling-mill production planning and dispatch scheduling.", responsibilities: ["Plan production against order book", "Coordinate dispatch with logistics partners"], requirements: ["8+ years steel/metals manufacturing operations"], benefits: ["Health insurance", "Performance bonus"], openings: 1, daysAgo: 4 },
  { id: "job_demo29", employerId: "usr_emp10", title: "Accountant", jobFunction: "finance", employmentType: "full-time", experienceLevel: "entry", city: "Jamshedpur", state: "Jharkhand", remote: false, salaryMin: 350000, salaryMax: 550000, skills: ["Tally", "SAP", "Excel"], description: "Support plant-level accounting, vendor payments and GST reconciliation.", responsibilities: ["Process vendor invoices and payments", "Assist with monthly GST reconciliation"], requirements: ["1-2 years accounting experience"], benefits: ["Health insurance"], openings: 2, daysAgo: 10 },
  { id: "job_demo30", employerId: "usr_emp10", title: "Key Account Manager", jobFunction: "sales", employmentType: "full-time", experienceLevel: "senior", city: "Jamshedpur", state: "Jharkhand", remote: false, salaryMin: 1200000, salaryMax: 1800000, skills: ["Account Management", "B2B Sales", "Negotiation"], description: "Manage relationships with our top construction and infrastructure accounts.", responsibilities: ["Own quarterly volume targets for key accounts", "Negotiate annual supply contracts"], requirements: ["6+ years B2B sales in steel/metals"], benefits: ["Travel allowance", "Performance bonus"], openings: 1, daysAgo: 16 },

  // ── usr_emp11 · NextGen EdTech (Bengaluru, EdTech) ──────────────────────────
  { id: "job_demo31", employerId: "usr_emp11", title: "Frontend Engineer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Bengaluru", state: "Karnataka", remote: true, salaryMin: 1000000, salaryMax: 1600000, skills: ["React", "TypeScript"], description: "Build interactive learning modules used by 200,000+ students.", responsibilities: ["Ship new lesson-player features", "Optimize load times on low-end devices"], requirements: ["3+ years React experience"], benefits: ["Health insurance", "Remote-friendly"], openings: 1, daysAgo: 2 },
  { id: "job_demo32", employerId: "usr_emp11", title: "Content Marketing Specialist", jobFunction: "marketing", employmentType: "contract", experienceLevel: "mid", city: "Bengaluru", state: "Karnataka", remote: true, salaryMin: 500000, salaryMax: 800000, skills: ["Content Writing", "SEO", "Copywriting"], description: "Create exam-prep content and manage our blog's editorial calendar.", responsibilities: ["Write and edit exam-prep articles", "Plan monthly content calendar"], requirements: ["2+ years content marketing, edtech a plus"], benefits: ["Flexible hours"], openings: 1, daysAgo: 8 },
  { id: "job_demo33", employerId: "usr_emp11", title: "Talent Acquisition Specialist", jobFunction: "hr", employmentType: "full-time", experienceLevel: "entry", city: "Bengaluru", state: "Karnataka", remote: false, salaryMin: 450000, salaryMax: 700000, skills: ["Recruitment", "Onboarding"], description: "Own end-to-end hiring for our engineering and content teams.", responsibilities: ["Source and screen candidates", "Coordinate interview loops with hiring managers"], requirements: ["1-2 years tech recruitment experience"], benefits: ["Health insurance"], openings: 1, daysAgo: 14 },

  // ── usr_emp12 · FinEdge Capital Advisors (Mumbai, Fintech) ──────────────────
  { id: "job_demo34", employerId: "usr_emp12", title: "Financial Analyst", jobFunction: "finance", employmentType: "full-time", experienceLevel: "mid", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 900000, salaryMax: 1400000, skills: ["Financial Modeling", "Excel", "Budgeting"], description: "Build credit-risk and portfolio-performance models for our lending book.", responsibilities: ["Build monthly portfolio-performance models", "Support pricing decisions with risk analysis"], requirements: ["3+ years financial analysis, lending/NBFC preferred"], benefits: ["Health insurance", "Annual bonus"], openings: 1, daysAgo: 3 },
  { id: "job_demo35", employerId: "usr_emp12", title: "Business Analyst", jobFunction: "product", employmentType: "full-time", experienceLevel: "senior", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 1400000, salaryMax: 2100000, skills: ["Market Research", "Product Strategy", "User Stories"], description: "Drive product requirements for our next-gen lending workflow.", responsibilities: ["Gather requirements from ops and risk teams", "Write user stories for the engineering team"], requirements: ["5+ years business analysis, fintech preferred"], benefits: ["Health insurance", "Annual bonus"], openings: 1, daysAgo: 12 },
  { id: "job_demo36", employerId: "usr_emp12", title: "Inside Sales Representative", jobFunction: "sales", employmentType: "full-time", experienceLevel: "entry", city: "Mumbai", state: "Maharashtra", remote: false, salaryMin: 400000, salaryMax: 600000, skills: ["Cold Calling", "CRM Software", "B2C Sales"], description: "Convert inbound leads into funded loan applications over phone and chat.", responsibilities: ["Follow up on inbound loan leads", "Guide applicants through document submission"], requirements: ["1+ years inside sales/telesales"], benefits: ["Incentive on conversions"], openings: 3, daysAgo: 20 },

  // ── usr_emp13 · AgriGrow Farm Solutions (Nashik, Agri-tech) ─────────────────
  { id: "job_demo37", employerId: "usr_emp13", title: "Supply Chain Analyst", jobFunction: "operations", employmentType: "full-time", experienceLevel: "mid", city: "Nashik", state: "Maharashtra", remote: false, salaryMin: 500000, salaryMax: 800000, skills: ["Supply Chain Management", "Inventory Management", "Excel"], description: "Plan produce collection routes and cold-storage capacity across our network.", responsibilities: ["Plan farm-to-hub collection schedules", "Track cold-storage utilization"], requirements: ["2+ years supply chain, agri-supply chain a plus"], benefits: ["Health insurance"], openings: 1, daysAgo: 5 },
  { id: "job_demo38", employerId: "usr_emp13", title: "Sales Executive", jobFunction: "sales", employmentType: "full-time", experienceLevel: "entry", city: "Nashik", state: "Maharashtra", remote: false, salaryMin: 300000, salaryMax: 450000, skills: ["B2B Sales", "Negotiation"], description: "Onboard farmers and local retailers onto our produce marketplace.", responsibilities: ["Sign up farmers in assigned taluka", "Onboard local retail buyers"], requirements: ["Willing to travel within Nashik district"], benefits: ["Travel allowance"], openings: 3, daysAgo: 11 },
  { id: "job_demo39", employerId: "usr_emp13", title: "Data Engineer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Nashik", state: "Maharashtra", remote: true, salaryMin: 1000000, salaryMax: 1600000, skills: ["Python", "PostgreSQL", "AWS"], description: "Build the pricing and demand-forecasting data pipelines for our marketplace.", responsibilities: ["Build ETL pipelines from mandi price feeds", "Support demand-forecasting models"], requirements: ["3+ years data engineering experience"], benefits: ["Health insurance", "Remote-friendly"], openings: 1, daysAgo: 18 },

  // ── usr_emp14 · PackRight Industries (Ahmedabad, Packaging) ─────────────────
  { id: "job_demo40", employerId: "usr_emp14", title: "Operations Manager", jobFunction: "operations", employmentType: "full-time", experienceLevel: "senior", city: "Ahmedabad", state: "Gujarat", remote: false, salaryMin: 1000000, salaryMax: 1500000, skills: ["Supply Chain Management", "ERP Software", "Six Sigma"], description: "Run production planning across our corrugated and flexible-packaging lines.", responsibilities: ["Plan production against order book", "Drive OEE improvements on the shop floor"], requirements: ["6+ years packaging/manufacturing operations"], benefits: ["Health insurance", "Performance bonus"], openings: 1, daysAgo: 7 },
  { id: "job_demo41", employerId: "usr_emp14", title: "Accounts Payable Executive", jobFunction: "finance", employmentType: "full-time", experienceLevel: "entry", city: "Ahmedabad", state: "Gujarat", remote: false, salaryMin: 300000, salaryMax: 450000, skills: ["Tally", "Excel", "GST Compliance"], description: "Process vendor invoices and manage payment cycles for raw-material suppliers.", responsibilities: ["Process and reconcile vendor invoices", "Coordinate payment runs with finance"], requirements: ["1+ years accounts payable experience"], benefits: ["Health insurance"], openings: 1, daysAgo: 13 },
  { id: "job_demo42", employerId: "usr_emp14", title: "Business Development Executive", jobFunction: "sales", employmentType: "full-time", experienceLevel: "mid", city: "Ahmedabad", state: "Gujarat", remote: false, salaryMin: 600000, salaryMax: 950000, skills: ["B2B Sales", "Account Management"], description: "Grow our FMCG and pharma packaging client base across Gujarat.", responsibilities: ["Prospect new FMCG/pharma accounts", "Manage RFQ-to-close cycle"], requirements: ["3+ years B2B sales, packaging/FMCG preferred"], benefits: ["Travel allowance"], openings: 1, daysAgo: 22 },

  // ── usr_emp15 · ChemPure Industries (Vadodara, Chemicals) ───────────────────
  { id: "job_demo43", employerId: "usr_emp15", title: "QA Engineer", jobFunction: "engineering", employmentType: "full-time", experienceLevel: "mid", city: "Vadodara", state: "Gujarat", remote: false, salaryMin: 600000, salaryMax: 950000, skills: ["System Design"], description: "Run quality-control testing on chemical intermediates before dispatch.", responsibilities: ["Run batch QC testing per specification", "Maintain QC documentation for audits"], requirements: ["3+ years QC/QA in chemical manufacturing", "B.Sc/B.Tech Chemical preferred"], benefits: ["Health insurance"], openings: 1, daysAgo: 6 },
  { id: "job_demo44", employerId: "usr_emp15", title: "HR Manager", jobFunction: "hr", employmentType: "full-time", experienceLevel: "senior", city: "Vadodara", state: "Gujarat", remote: false, salaryMin: 1200000, salaryMax: 1700000, skills: ["Recruitment", "Labour Law Compliance", "Performance Management"], description: "Lead HR operations and statutory compliance for our Vadodara plant.", responsibilities: ["Own plant-level HR compliance", "Lead the annual performance review cycle"], requirements: ["8+ years HR, manufacturing/chemicals preferred"], benefits: ["Health insurance", "Annual bonus"], openings: 1, daysAgo: 15 },
  { id: "job_demo45", employerId: "usr_emp15", title: "Procurement Executive", jobFunction: "operations", employmentType: "contract", experienceLevel: "mid", city: "Vadodara", state: "Gujarat", remote: false, salaryMin: 500000, salaryMax: 800000, skills: ["Vendor Management", "Negotiation"], description: "Source raw-material vendors for chemical intermediates on a 12-month contract.", responsibilities: ["Negotiate raw-material supply contracts", "Track vendor compliance and delivery"], requirements: ["3+ years procurement in chemicals/process industry"], benefits: [], openings: 1, daysAgo: 23 },
];

const JOBS = JOB_SPECS.map((j) => ({
  id: j.id,
  employerId: j.employerId,
  title: j.title,
  description: j.description,
  jobFunction: j.jobFunction,
  employmentType: j.employmentType,
  experienceLevel: j.experienceLevel,
  location: { city: j.city, state: j.state, remote: j.remote },
  salaryRange: {
    min: j.salaryMin,
    max: j.salaryMax,
    currency: "INR",
    isDisclosed: j.salaryDisclosed === false ? false : true,
  },
  skills: j.skills,
  responsibilities: j.responsibilities,
  requirements: j.requirements,
  benefits: j.benefits,
  openings: j.openings,
  status: "active",
  viewCount: 0,
  applicationCount: 0,
  postedAt: daysAgoIso(j.daysAgo),
  expiresAt: null,
}));

/* ---------------------------------------------------------------- applications -- */

function statusHistoryFor(status) {
  const now = new Date().toISOString();
  const chain = ["applied", "viewed", "shortlisted", "interview"];
  const terminal = ["rejected", "hired"];
  let steps;
  if (terminal.includes(status)) {
    steps = ["applied", "shortlisted", status];
  } else {
    steps = chain.slice(0, chain.indexOf(status) + 1);
  }
  return steps.map((s) => ({ status: s, note: null, changedAt: now }));
}

const APPLICATION_SPECS = [
  { id: "app_demo1", jobId: "job_demo1", employerId: "usr_emp1", candidateId: "usr_cand1", status: "shortlisted", coverNote: "I've built exactly this kind of matching-engine API before — would love to chat." },
  { id: "app_demo2", jobId: "job_demo3", employerId: "usr_emp1", candidateId: "usr_cand1", status: "rejected", coverNote: "Design isn't my primary background, but I've led several internal tooling redesigns." },
  { id: "app_demo3", jobId: "job_demo4", employerId: "usr_emp2", candidateId: "usr_cand2", status: "applied", coverNote: "8 years running exactly this territory for a competitor brand." },
  { id: "app_demo4", jobId: "job_demo25", employerId: "usr_emp9", candidateId: "usr_cand12", status: "shortlisted", coverNote: "Shipped a similar checkout revamp at my current company last year." },
  { id: "app_demo5", jobId: "job_demo16", employerId: "usr_emp6", candidateId: "usr_cand4", status: "viewed", coverNote: "Looking to move from pure DevOps into a manufacturing-QA-adjacent infra role." },
  { id: "app_demo6", jobId: "job_demo39", employerId: "usr_emp13", candidateId: "usr_cand4", status: "interview", coverNote: "Excited about the data-pipeline challenge for mandi price forecasting." },
  { id: "app_demo7", jobId: "job_demo18", employerId: "usr_emp6", candidateId: "usr_cand5", status: "shortlisted", coverNote: "7 years running high-volume blue-collar hiring drives, a great fit for this role." },
  { id: "app_demo8", jobId: "job_demo32", employerId: "usr_emp11", candidateId: "usr_cand13", status: "applied", coverNote: "I've written exam-prep content for two other edtech platforms." },
  { id: "app_demo9", jobId: "job_demo34", employerId: "usr_emp12", candidateId: "usr_cand8", status: "shortlisted", coverNote: "Currently building portfolio-performance models at a similar-scale NBFC." },
  { id: "app_demo10", jobId: "job_demo35", employerId: "usr_emp12", candidateId: "usr_cand6", status: "interview", coverNote: "Led 0-to-1 product work on a lending product for the last 2 years." },
  { id: "app_demo11", jobId: "job_demo27", employerId: "usr_emp9", candidateId: "usr_cand9", status: "hired", coverNote: "Managed enterprise renewals for a similar-scale SaaS platform." },
  { id: "app_demo12", jobId: "job_demo19", employerId: "usr_emp7", candidateId: "usr_cand9", status: "rejected", coverNote: "Comfortable handling high-volume patient support queues." },
  { id: "app_demo13", jobId: "job_demo12", employerId: "usr_emp4", candidateId: "usr_cand10", status: "shortlisted", coverNote: "9 years running plant operations, keen to move into textiles." },
  { id: "app_demo14", jobId: "job_demo28", employerId: "usr_emp10", candidateId: "usr_cand10", status: "applied", coverNote: "Have run rolling-mill-adjacent operations before." },
  { id: "app_demo15", jobId: "job_demo14", employerId: "usr_emp5", candidateId: "usr_cand14", status: "viewed", coverNote: "Managed vendor contracts for a similar-scale procurement function." },
  { id: "app_demo16", jobId: "job_demo37", employerId: "usr_emp13", candidateId: "usr_cand14", status: "shortlisted", coverNote: "5 years planning agri-supply-chain logistics, a strong match for this role." },
  { id: "app_demo17", jobId: "job_demo22", employerId: "usr_emp8", candidateId: "usr_cand11", status: "applied", coverNote: "Currently closing B2B accounts in an adjacent industrial category." },
  { id: "app_demo18", jobId: "job_demo41", employerId: "usr_emp14", candidateId: "usr_cand8", status: "rejected", coverNote: "Open to an accounts-payable role while I build broader finance experience." },
  { id: "app_demo19", jobId: "job_demo20", employerId: "usr_emp7", candidateId: "usr_cand10", status: "applied", coverNote: "Interested in moving from manufacturing into healthcare operations." },
  { id: "app_demo20", jobId: "job_demo21", employerId: "usr_emp7", candidateId: "usr_cand3", status: "shortlisted", coverNote: "Ran a similar home-collection acquisition campaign for a wellness brand." },
  { id: "app_demo21", jobId: "job_demo26", employerId: "usr_emp9", candidateId: "usr_cand3", status: "interview", coverNote: "4 years running performance campaigns for D2C storefronts." },
  { id: "app_demo22", jobId: "job_demo7", employerId: "usr_emp3", candidateId: "usr_cand14", status: "applied", coverNote: "Have coordinated line-haul schedules in a previous supply-chain role." },
  { id: "app_demo23", jobId: "job_demo9", employerId: "usr_emp3", candidateId: "usr_cand9", status: "viewed", coverNote: "Managed a support queue of similar volume at my current company." },
  { id: "app_demo24", jobId: "job_demo33", employerId: "usr_emp11", candidateId: "usr_cand5", status: "applied", coverNote: "Would bring a structured tech-recruitment process to your hiring pipeline." },
  { id: "app_demo25", jobId: "job_demo2", employerId: "usr_emp1", candidateId: "usr_cand12", status: "applied", coverNote: "Full-stack background with strong React fundamentals — happy to focus on frontend here." },
];

const APPLICATIONS = APPLICATION_SPECS.map((a) => {
  const now = new Date().toISOString();
  return {
    id: a.id,
    jobId: a.jobId,
    employerId: a.employerId,
    candidateId: a.candidateId,
    resumeUrl: DEMO_RESUME_URL,
    coverNote: a.coverNote,
    status: a.status,
    statusHistory: statusHistoryFor(a.status),
    answers: [],
    appliedAt: now,
    updatedAt: now,
  };
});

/* -------------------------------------------------------------------- reviews -- */

const REVIEW_SPECS = [
  { id: "rev_demo1", employerId: "usr_emp1", candidateId: "usr_cand1", rating: 5, text: "Structured interview process and the team was transparent about the role from the first call.", daysAgo: 20 },
  { id: "rev_demo2", employerId: "usr_emp1", candidateId: "usr_cand12", rating: 4, text: "Good engineering culture, though the take-home assignment took longer than advertised.", daysAgo: 35 },
  { id: "rev_demo3", employerId: "usr_emp2", candidateId: "usr_cand2", rating: 4, text: "Fair compensation discussion and quick turnaround after the final round.", daysAgo: 25 },
  { id: "rev_demo4", employerId: "usr_emp2", candidateId: "usr_cand10", rating: 5, text: "HR kept me updated at every stage — one of the smoothest hiring processes I've been through.", daysAgo: 40 },
  { id: "rev_demo5", employerId: "usr_emp3", candidateId: "usr_cand14", rating: 4, text: "Practical interview focused on real warehouse scenarios rather than generic questions.", daysAgo: 18 },
  { id: "rev_demo6", employerId: "usr_emp3", candidateId: "usr_cand9", rating: 3, text: "Process was fine but there was a long gap between the first and second rounds.", daysAgo: 30 },
  { id: "rev_demo7", employerId: "usr_emp4", candidateId: "usr_cand10", rating: 4, text: "Panel was knowledgeable about textile operations and asked relevant scenario questions.", daysAgo: 22 },
  { id: "rev_demo8", employerId: "usr_emp4", candidateId: "usr_cand11", rating: 4, text: "Straightforward process, offer came within a week of the final interview.", daysAgo: 12 },
  { id: "rev_demo9", employerId: "usr_emp5", candidateId: "usr_cand14", rating: 5, text: "Very professional recruitment team, clear about project timelines and expectations.", daysAgo: 27 },
  { id: "rev_demo10", employerId: "usr_emp5", candidateId: "usr_cand6", rating: 4, text: "Good clarity on compensation bands upfront, saved everyone's time.", daysAgo: 33 },
  { id: "rev_demo11", employerId: "usr_emp6", candidateId: "usr_cand4", rating: 4, text: "Technical round was well-structured and relevant to the actual job.", daysAgo: 15 },
  { id: "rev_demo12", employerId: "usr_emp6", candidateId: "usr_cand5", rating: 5, text: "HR team was responsive and answered all my questions about the role honestly.", daysAgo: 28 },
  { id: "rev_demo13", employerId: "usr_emp7", candidateId: "usr_cand9", rating: 3, text: "Decent process, though communication slowed down after the second round.", daysAgo: 19 },
  { id: "rev_demo14", employerId: "usr_emp7", candidateId: "usr_cand3", rating: 5, text: "Loved that they shared real campaign data during the interview to gauge fit.", daysAgo: 24 },
  { id: "rev_demo15", employerId: "usr_emp8", candidateId: "usr_cand11", rating: 4, text: "Sales leadership was upfront about targets and territory expectations.", daysAgo: 16 },
  { id: "rev_demo16", employerId: "usr_emp8", candidateId: "usr_cand4", rating: 4, text: "Well-organized plant tour before the final interview, gave a real sense of the work.", daysAgo: 31 },
  { id: "rev_demo17", employerId: "usr_emp9", candidateId: "usr_cand12", rating: 5, text: "Fast-moving process — applied, interviewed and got an offer within 10 days.", daysAgo: 10 },
  { id: "rev_demo18", employerId: "usr_emp9", candidateId: "usr_cand3", rating: 4, text: "Marketing team was collaborative during the case-study round.", daysAgo: 21 },
  { id: "rev_demo19", employerId: "usr_emp10", candidateId: "usr_cand10", rating: 4, text: "Solid, no-nonsense interview focused on plant operations experience.", daysAgo: 26 },
  { id: "rev_demo20", employerId: "usr_emp10", candidateId: "usr_cand8", rating: 3, text: "Process was okay but salary negotiation felt rigid.", daysAgo: 38 },
  { id: "rev_demo21", employerId: "usr_emp11", candidateId: "usr_cand13", rating: 5, text: "Genuinely excited team, gave detailed feedback on my writing samples.", daysAgo: 14 },
  { id: "rev_demo22", employerId: "usr_emp11", candidateId: "usr_cand5", rating: 4, text: "Clear about the contract-to-full-time path during the interview.", daysAgo: 29 },
  { id: "rev_demo23", employerId: "usr_emp12", candidateId: "usr_cand6", rating: 5, text: "One of the more rigorous but fair product-interview processes I've done.", daysAgo: 17 },
  { id: "rev_demo24", employerId: "usr_emp12", candidateId: "usr_cand8", rating: 4, text: "Good technical depth in the case-study round, relevant to actual work.", daysAgo: 34 },
  { id: "rev_demo25", employerId: "usr_emp13", candidateId: "usr_cand14", rating: 4, text: "Small team, but the founder personally walked me through the roadmap.", daysAgo: 23 },
  { id: "rev_demo26", employerId: "usr_emp13", candidateId: "usr_cand4", rating: 4, text: "Interesting problem space, interview focused on real data-pipeline challenges.", daysAgo: 36 },
  { id: "rev_demo27", employerId: "usr_emp14", candidateId: "usr_cand8", rating: 3, text: "Process took a bit longer than expected but the team was courteous throughout.", daysAgo: 13 },
  { id: "rev_demo28", employerId: "usr_emp14", candidateId: "usr_cand11", rating: 4, text: "Sales manager was clear about account ownership and incentive structure.", daysAgo: 32 },
  { id: "rev_demo29", employerId: "usr_emp15", candidateId: "usr_cand4", rating: 4, text: "Good technical discussion on QC processes, plant visit was informative.", daysAgo: 11 },
  { id: "rev_demo30", employerId: "usr_emp15", candidateId: "usr_cand5", rating: 5, text: "HR manager gave a thorough, honest overview of compliance responsibilities.", daysAgo: 37 },
];

const CANDIDATE_NAME_BY_ID = new Map(CANDIDATES.map((c) => [c.id, c.name]));

const REVIEWS = REVIEW_SPECS.map((r) => ({
  id: r.id,
  targetUserId: r.employerId,
  sellerId: null,
  direction: "buyer_to_seller",
  // Scopes these to the Recruitment product so they never mix with a Directory
  // seller rating for the same user id (routes/reviews.js `context`).
  context: "recruitment",
  buyerId: r.candidateId,
  buyerName: CANDIDATE_NAME_BY_ID.get(r.candidateId) || "Anonymous",
  rating: r.rating,
  reviewText: r.text,
  status: "approved",
  createdAt: daysAgoIso(r.daysAgo),
}));

/* ---------------------------------------------------------------- ad bookings -- */

const AD_BOOKING_SPECS = [
  { id: "adb_recruit1", adSlotId: "recruitment_home", placementType: "recruitment_home", sellerId: "usr_emp1", creativeImageUrl: "/demo/industry-2.jpg", headline: "TechNova Solutions is hiring across Engineering & Design — apply directly, no recruiters.", targetUrl: "/employer/technova-solutions", priority: 10, amount: 4000 },
  { id: "adb_recruit2", adSlotId: "recruitment_home", placementType: "recruitment_home", sellerId: "usr_emp9", creativeImageUrl: "/demo/retail-3.jpg", headline: "UrbanCart Retail is growing its Delhi team — full-time & remote roles open now.", targetUrl: "/employer/urbancart-retail", priority: 9, amount: 4000 },
  { id: "adb_recruit3", adSlotId: "recruitment_home", placementType: "recruitment_home", sellerId: "usr_emp3", creativeImageUrl: "/demo/logistics-1.jpg", headline: "Vantage Logistics is expanding — Warehouse & Ops roles open in Mumbai.", targetUrl: "/employer/vantage-logistics-india", priority: 8, amount: 3500 },
  { id: "adb_recruit4", adSlotId: "recruitment_home", placementType: "recruitment_home", sellerId: "usr_emp12", creativeImageUrl: "/demo/business-1.jpg", headline: "Post your first job free this week — reach verified candidates today.", targetUrl: "/post-job", priority: 7, amount: 0 },
  { id: "adb_recruit5", adSlotId: "recruitment_search_top", placementType: "recruitment_search_top", sellerId: "usr_emp8", creativeImageUrl: "/demo/automotive-2.jpg", headline: "Zenith Auto Components is hiring Sales & QA talent in Pune.", targetUrl: "/employer/zenith-auto-components", priority: 10, amount: 3000 },
  { id: "adb_recruit6", adSlotId: "recruitment_search_top", placementType: "recruitment_search_top", sellerId: "usr_emp11", creativeImageUrl: "/demo/business-3.jpg", headline: "NextGen EdTech is remote-hiring engineers & marketers.", targetUrl: "/employer/nextgen-edtech", priority: 9, amount: 3000 },
  { id: "adb_recruit7", adSlotId: "recruitment_search_top", placementType: "recruitment_search_top", sellerId: "usr_emp12", creativeImageUrl: "/demo/business-1.jpg", headline: "FinEdge Capital Advisors is growing its Mumbai finance team — apply today.", targetUrl: "/employer/finedge-capital-advisors", priority: 8, amount: 3000 },
];

const AD_BOOKINGS = AD_BOOKING_SPECS.map((a) => ({
  id: a.id,
  adSlotId: a.adSlotId,
  sellerId: a.sellerId,
  placementType: a.placementType,
  creativeImageUrl: a.creativeImageUrl,
  targetUrl: a.targetUrl,
  headline: a.headline,
  categoryIds: [],
  startDate: null,
  endDate: null,
  priority: a.priority,
  status: "active",
  amount: a.amount,
  impressionsServed: 0,
  clicks: 0,
  slotId: a.adSlotId,
  listingId: null,
  paymentRecordId: null,
  createdAt: daysAgoIso(5),
}));

/* --------------------------------------------------------------- career guides -- */
// Employer-authored blog posts (authorType: "employer") — these power both
// /recruitment/blog and the "Career guides" strip on the Recruitment home page,
// via the existing generic GET /api/blogs?authorType=employer. Reuses blogs.json,
// no new collection (RECRUITMENT.md: "reviews/stories/blogs are already generic").

const BLOG_SPECS = [
  {
    id: "blog_recruit1",
    employerId: "usr_emp1",
    title: "Write a resume recruiters actually read",
    coverImage: "/demo/business-3.jpg",
    tags: ["Resume", "Job search"],
    daysAgo: 6,
    body:
      "Most resumes get a six-second scan before anyone decides to read properly. Make those seconds count.\n\n" +
      "## Lead with impact, not duties\n\n" +
      "Swap \"Responsible for managing the sales pipeline\" for \"Grew qualified pipeline 40% in two quarters by reworking lead scoring\". Numbers and outcomes travel; job descriptions do not.\n\n" +
      "## Cut anything older than ten years\n\n" +
      "Early-career roles can become a single line. The space is better spent on what you did recently.\n\n" +
      "## One page until it genuinely can't be\n\n" +
      "If you have fifteen years of relevant work, two pages is fine. For everyone else, one page forces you to keep only what matters.\n\n" +
      "## Match the words in the job post\n\n" +
      "If the role asks for \"stakeholder management\" and you've done exactly that, use their phrase. This isn't gaming a filter — it's making the match obvious to a busy human.",
  },
  {
    id: "blog_recruit2",
    employerId: "usr_emp12",
    title: "Answering the salary expectation question",
    coverImage: "/demo/business-1.jpg",
    tags: ["Salary", "Negotiation", "Interview"],
    daysAgo: 11,
    body:
      "The question comes early and it feels like a trap. It isn't — it's a filter for whether the conversation is worth continuing for both sides.\n\n" +
      "## Give a range, with a reason\n\n" +
      "\"Based on the scope we've discussed and market data for similar roles in this city, I'm looking at 18 to 22 lakh.\" A range shows flexibility; the reason shows you've done the work.\n\n" +
      "## Anchor to the role, not your current pay\n\n" +
      "What you earn today is about your last job. What you're asking for is about this one.\n\n" +
      "## It's fine to ask first\n\n" +
      "\"Do you have a band budgeted for this role?\" is a reasonable, professional response. Many employers will share it.",
  },
  {
    id: "blog_recruit3",
    employerId: "usr_emp11",
    title: "Acing a video interview",
    coverImage: "/demo/business-2.jpg",
    tags: ["Interview", "Remote"],
    daysAgo: 15,
    body:
      "A video interview is still an interview. The difference is a few small things that are entirely in your control.\n\n" +
      "## Fix the basics once\n\n" +
      "Camera at eye level, a light source in front of you (not behind), and a wired or strong connection. Test the actual link 10 minutes early.\n\n" +
      "## Look at the lens, not the face\n\n" +
      "It feels unnatural and it reads as eye contact. Practice for one call and it becomes automatic.\n\n" +
      "## Have two questions ready before you hang up\n\n" +
      "\"What does success in this role look like at six months?\" and \"What's the biggest challenge the team is facing right now?\" both give you real signal.",
  },
  {
    id: "blog_recruit4",
    employerId: "usr_emp3",
    title: "Following up without being pushy",
    coverImage: "/demo/logistics-1.jpg",
    tags: ["Job search", "Communication"],
    daysAgo: 20,
    body:
      "Silence after applying usually means a busy hiring team, not a no. A short, well-timed follow-up helps.\n\n" +
      "## Wait about a week after each stage\n\n" +
      "Apply, then a week later a one-line check-in. After an interview, 3 to 5 working days.\n\n" +
      "## Keep it to two sentences\n\n" +
      "\"Following up on my application for the Ops Coordinator role — still very interested and happy to share anything else that would help. Thanks for your time.\"\n\n" +
      "## Then let it go\n\n" +
      "One follow-up per stage. More than that shifts the impression in the wrong direction.",
  },
  {
    id: "blog_recruit5",
    employerId: "usr_emp8",
    title: "What a strong reference call sounds like",
    coverImage: "/demo/automotive-2.jpg",
    tags: ["References", "Hiring"],
    daysAgo: 26,
    body:
      "References are one of the most under-used steps in hiring. Done well, a 15-minute call tells you more than another interview round.\n\n" +
      "## Ask about specifics, not adjectives\n\n" +
      "\"Tell me about a time the project went sideways — what did they actually do?\" beats \"Were they a good team player?\".\n\n" +
      "## Talk to a manager, not just a peer\n\n" +
      "Peers describe what someone is like to work with. Managers can speak to judgement, ownership and growth.\n\n" +
      "## Listen for the pause\n\n" +
      "How someone answers \"Would you hire them again?\" — including how quickly — is often the most honest moment of the call.",
  },
  {
    id: "blog_recruit6",
    employerId: "usr_emp9",
    title: "Your first 30 days in a new role",
    coverImage: "/demo/retail-3.jpg",
    tags: ["Onboarding", "Career"],
    daysAgo: 33,
    body:
      "The first month sets how people see you for the next year. Spend it learning, not proving.\n\n" +
      "## Meet people before you propose changes\n\n" +
      "Book 20 minutes with everyone you'll work with. Ask what's working, what isn't, and what they wish someone would fix.\n\n" +
      "## Write down what confuses you\n\n" +
      "In three months this list is gone from your memory — and it's exactly what the next new joiner needs.\n\n" +
      "## Ship one small, visible thing\n\n" +
      "Not a reorg. A fixed report, a cleaned-up doc, a faster process. It builds trust for the bigger work later.",
  },
];

const BLOGS = BLOG_SPECS.map((b) => ({
  id: b.id,
  sellerId: b.employerId,
  authorType: "employer",
  title: b.title,
  slug: slugify(b.title),
  coverImage: b.coverImage,
  body: b.body,
  categoryId: null,
  tags: b.tags,
  status: "published",
  views: 0,
  publishedAt: daysAgoIso(b.daysAgo),
}));

/* --------------------------------------------------------------------- run -- */

(async () => {
  const counts = {
    jobFunctions: 0, jobRoles: 0, skills: 0, users: 0, jobs: 0, applications: 0, reviews: 0, blogs: 0, adBookings: 0,
  };

  for (const jf of JOB_FUNCTIONS) {
    const existing = await store.getById("job-functions.json", jf.id);
    if (existing) {
      const { id, ...patch } = jf;
      await store.update("job-functions.json", jf.id, patch);
    } else {
      await store.insert("job-functions.json", jf);
    }
    counts.jobFunctions++;
  }

  for (const role of JOB_ROLES) {
    const existing = await store.getById("job-roles.json", role.id);
    if (existing) {
      const { id, ...patch } = role;
      await store.update("job-roles.json", role.id, patch);
    } else {
      await store.insert("job-roles.json", role);
    }
    counts.jobRoles++;
  }

  for (const skill of SKILLS) {
    const existing = await store.getById("skills.json", skill.id);
    if (existing) {
      const { id, ...patch } = skill;
      await store.update("skills.json", skill.id, patch);
    } else {
      await store.insert("skills.json", skill);
    }
    counts.skills++;
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
      recruitmentRole: person.recruitmentRole,
      recruitmentRoleLockedAt: person.recruitmentRoleLockedAt,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };
    if (existing) {
      const { id, createdAt, ...patch } = record;
      await store.update("users.json", person.id, patch);
    } else {
      await store.insert("users.json", record);
    }
    counts.users++;
  }

  for (const job of JOBS) {
    // jobs.questions is JSONB NOT NULL DEFAULT '[]' — demo jobs that don't define
    // screening questions omit the field entirely, but the mapper sends a bare
    // `undefined` field as SQL NULL rather than letting the column default apply
    // (lib/db/util.js toParam), so it must be explicit here.
    if (job.questions === undefined) job.questions = [];
    const existing = await store.getById("jobs.json", job.id);
    if (existing) {
      // Preserve live counters across re-runs instead of resetting demo view/application
      // counts back to 0 every time this script is re-run.
      const { id, viewCount, applicationCount, postedAt, ...patch } = job;
      await store.update("jobs.json", job.id, patch);
    } else {
      await store.insert("jobs.json", job);
    }
    counts.jobs++;
  }

  for (const application of APPLICATIONS) {
    const existing = await store.getById("applications.json", application.id);
    if (existing) {
      const { id, appliedAt, ...patch } = application;
      await store.update("applications.json", application.id, patch);
    } else {
      await store.insert("applications.json", application);
    }
    counts.applications++;
  }

  for (const review of REVIEWS) {
    const existing = await store.getById("reviews.json", review.id);
    if (existing) {
      const { id, ...patch } = review;
      await store.update("reviews.json", review.id, patch);
    } else {
      await store.insert("reviews.json", review);
    }
    counts.reviews++;
  }

  for (const blog of BLOGS) {
    const existing = await store.getById("blogs.json", blog.id);
    if (existing) {
      const { id, ...patch } = blog;
      await store.update("blogs.json", blog.id, patch);
    } else {
      await store.insert("blogs.json", blog);
    }
    counts.blogs++;
  }

  for (const booking of AD_BOOKINGS) {
    const existing = await store.getById("ad-bookings.json", booking.id);
    if (existing) {
      const { id, createdAt, ...patch } = booking;
      await store.update("ad-bookings.json", booking.id, patch);
    } else {
      await store.insert("ad-bookings.json", booking);
    }
    counts.adBookings++;
  }

  console.log(
    `Recruitment demo data seeded: ${counts.jobFunctions} job functions, ${counts.jobRoles} job roles, ` +
    `${counts.skills} skills, ${counts.users} users (employers+candidates), ${counts.jobs} jobs, ` +
    `${counts.applications} applications, ${counts.reviews} reviews, ${counts.blogs} career-guide blogs, ${counts.adBookings} ad bookings.`
  );
})().catch((err) => {
  console.error("seed-recruitment-demo failed:", err);
  process.exitCode = 1;
});
