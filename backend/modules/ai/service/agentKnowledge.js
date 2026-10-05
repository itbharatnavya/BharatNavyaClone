/**
 * agentKnowledge.js — the Ask Navya agent's curated "how Bharat Navya works" facts.
 *
 * Every entry is a fact verified against CLAUDE.md / DIRECTORY.md / RECRUITMENT.md —
 * the agent may ONLY state platform rules from here (or from live DB retrieval), never
 * from the model's general knowledge. When a platform rule changes, change it HERE.
 *
 * Entries are retrieved per question by keyword overlap (see retrieveKnowledge), so the
 * prompt only carries the few that matter. `links` are internal paths only; the
 * recruitment entries are built per-request because that product sits behind a go-live flag.
 */

const RAW = [
  {
    id: "about",
    title: "What Bharat Navya is",
    keywords: ["bharat navya", "bharatsource", "platform", "who are you", "what do you do", "what is bharat navya", "what is bharatsource", "about us", "suite", "mediator"],
    text:
      "Bharat Navya is a suite of business products for India under one account: Directory (live), Recruitment, Credit Card (coming soon) and Mutual (coming soon). " +
      "It is a mediator and lead platform: it connects buyers with sellers and employers with candidates, but never processes payments, holds inventory, or runs a cart/checkout. " +
      "Buyers and sellers talk and negotiate directly. One account works across all products.",
    links: [{ label: "About Bharat Navya", href: "/about" }],
  },
  {
    id: "directory",
    title: "Directory (products and services marketplace)",
    keywords: ["directory", "marketplace", "browse", "category", "categories", "supplier", "vendor", "manufacturer", "buy", "brand", "compare", "shortlist", "collection", "follow"],
    text:
      "Directory (/directory) is the live B2B/B2C marketplace. Buyers browse by category, search by keyword, or ask in plain language; filter by city and price; open a listing; " +
      "see other sellers offering the same product; compare up to 3 listings; shortlist; follow sellers; browse brands and curated collections. " +
      "Listings are either products or services. It is lead-based: there is no cart or checkout, buyers send an enquiry or contact the seller.",
    links: [{ label: "Browse Directory", href: "/directory" }, { label: "All categories", href: "/categories" }, { label: "Brands", href: "/brands" }],
  },
  {
    id: "rfq",
    title: "Posting a requirement (RFQ)",
    keywords: ["rfq", "requirement", "quote", "quotes", "quotation", "enquiry", "inquiry", "bulk", "multiple sellers", "post a requirement", "price quote"],
    text:
      "A buyer can post a requirement (RFQ) at /rfq by describing what they need in plain words; the platform drafts a structured requirement and it is sent to several matching sellers, who reply with quotes. " +
      "Posting is free and the page is public; login is only needed at the moment of submitting. Quotes appear in the buyer's dashboard under My RFQs.",
    links: [{ label: "Post a requirement (RFQ)", href: "/rfq" }],
  },
  {
    id: "contact-seller",
    title: "Contacting a seller (Call, WhatsApp, Chat)",
    keywords: ["contact", "call", "phone", "number", "whatsapp", "chat", "message", "talk to seller", "reach", "mobile", "email"],
    text:
      "On a listing page or seller profile there are three ways to reach a seller: Call, WhatsApp and Chat. All three require being logged in; logged-out visitors get a quick login/register prompt " +
      "and seller phone numbers are never shown to guests. Chat opens in a pop-up, is tagged to the product it was started from, and replies land in the dashboard Inbox. " +
      "Sellers do not see these buttons on their own listings.",
    links: [{ label: "Log in", href: "/login" }, { label: "Create an account", href: "/register" }],
  },
  {
    id: "register",
    title: "Creating an account and logging in",
    keywords: ["register", "sign up", "signup", "account", "login", "log in", "sign in", "password", "otp", "google", "create account", "profile"],
    text:
      "Registering is free and takes under a minute: name, phone or email, and password (or log in by OTP, or Continue with Google). Registering creates a basic personal account only and collects no business details. " +
      "Business details are a separate, later step (becoming a seller or an employer). The same login works for every product. Personal settings live on the Profile page (/profile).",
    links: [{ label: "Create an account", href: "/register" }, { label: "Log in", href: "/login" }, { label: "My profile", href: "/profile" }],
  },
  {
    id: "sell",
    title: "Selling: listing a product or service",
    keywords: ["sell", "selling", "list my", "listing", "add product", "add a product", "become a seller", "register my business", "post listing", "bulk upload", "photos", "become seller", "list a product", "list my product"],
    text:
      "To sell: create an account, then add business details (company name, GST, location) from the Directory dashboard's Profile tab, which turns the account into a seller account. " +
      "The first listing at /sell can also create a minimal seller profile automatically. A listing needs a type (product or service), a category, a title, a description and a location (a city, PAN India, or service cities). " +
      "Photos, price and keywords are optional but bring far more responses. Sellers can also bulk-upload listings, work from several locations, and use the dashboard (listings, leads and RFQs, analytics, reviews, blogs, stories). " +
      "Listing is lead-based: no payment is needed to list, and paid plans or boosts are optional visibility upgrades. New sellers are approved by the Bharat Navya team before their listings appear publicly.",
    links: [{ label: "Add a product or service", href: "/sell" }, { label: "Seller dashboard", href: "/dashboard" }],
  },
  {
    id: "verification",
    title: "Verified sellers and trust",
    keywords: ["verified", "verification", "trust", "badge", "trusted", "genuine", "fraud", "safe", "scam", "reliable", "rating", "reviews", "review"],
    text:
      "Sellers can apply for verification from their dashboard Profile tab; the Bharat Navya team reviews the request and, when approved, the seller carries a Verified badge. " +
      "Seller pages show ratings and reviews from buyers, and a trust score. Buyers can leave reviews on a seller's page. " +
      "As a mediator Bharat Navya does not guarantee a deal, so buyers should check verification, reviews and ask for samples or references before paying anyone.",
    links: [],
  },
  {
    id: "promote",
    title: "Boosts, ads and visibility for sellers",
    keywords: ["boost", "promote", "advertise", "ads", "ad", "featured", "visibility", "rank", "top of search", "sponsored", "advertising"],
    text:
      "Sellers can request a boost (featured placement) from the dashboard Promote tab, which the admin team approves, and can book advertising from the Advertise tab. " +
      "These are optional paid visibility upgrades; they are not required to list.",
    links: [{ label: "Seller dashboard", href: "/dashboard" }],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    keywords: ["dashboard", "my listings", "leads", "inbox", "analytics", "my rfqs", "orders", "applications", "referral"],
    text:
      "The dashboard (/dashboard) is where you manage your activity: buyers see their RFQs and quotes; sellers also get Overview, Analytics, Listings, Leads and RFQs, Inbox (chat), Promote, Advertise, Subscription, Referral, Reviews, Blogs, Stories and Profile tabs. " +
      "The seller tabs unlock once business details have been added.",
    links: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    id: "stories-blog",
    title: "Stories and blog",
    keywords: ["story", "stories", "blog", "article", "news", "content", "highlights"],
    text:
      "Sellers and employers can publish short 24-hour stories (with saved highlights) and blog posts from their dashboards; stories show on the seller's public profile. The Navya Blog (/blog) holds published articles.",
    links: [{ label: "Navya Blog", href: "/blog" }],
  },
  {
    id: "credit-card",
    title: "Credit Card product",
    keywords: ["credit card", "creditcard", "card", "business card"],
    text: "Credit Card (/credit-card) is a planned product for business credit cards. It is coming soon and not usable yet.",
    links: [{ label: "Credit Card (coming soon)", href: "/credit-card" }],
  },
  {
    id: "mutual",
    title: "Mutual product",
    keywords: ["mutual", "mutual fund", "mutual funds", "sip", "invest", "investment", "investing"],
    text: "Mutual (/mutual) is a planned product for curated mutual funds. It is coming soon and not usable yet; Bharat Navya does not offer investment advice or hold money today.",
    links: [{ label: "Mutual (coming soon)", href: "/mutual" }],
  },
  {
    id: "payments",
    title: "Payments, fees and cost",
    keywords: ["payment", "pay", "paid", "fee", "fees", "cost", "charge", "charges", "free", "price", "pricing", "plan", "plans", "subscription", "commission", "money", "checkout", "cart", "refund", "invoice"],
    text:
      "Bharat Navya never processes payments for purchases: there is no cart, checkout or escrow, and buyers and sellers settle directly with each other. " +
      "Creating an account, browsing, posting an RFQ and listing are free. Sellers can optionally subscribe to plans (see Pricing) for more listings, lead quota, verified badge and analytics.",
    links: [{ label: "Pricing", href: "/pricing" }],
  },
  {
    id: "privacy",
    title: "Data and privacy basics",
    keywords: ["privacy", "data", "secure", "security", "personal", "information", "delete account", "gdpr"],
    text:
      "Seller phone numbers and emails are only shown to logged-in members, never to guests. Bharat Navya does not publish your contact details publicly. " +
      "For account deletion or data requests I do not have a self-serve process to describe; the Bharat Navya team handles those.",
    links: [{ label: "About Bharat Navya", href: "/about" }],
  },
];

function recruitmentEntries(live) {
  const post = {
    id: "recruitment-employer",
    title: "Recruitment for employers: posting a job",
    keywords: ["post a job", "post job", "hire", "hiring", "employer", "recruit", "recruitment", "vacancy", "job posting", "candidates", "applicants", "company profile"],
    text: live
      ? "Employers post roles at /post-job. The company profile must be complete before a job can be posted (the form shows a checklist of what is missing). From the Recruitment dashboard employers manage jobs, review applications through a pipeline (applied, viewed, shortlisted, interview, hired, rejected), and manage the company profile, story, blog and reviews."
      : "Recruitment (post roles and connect with vetted candidates) is built but is COMING SOON: it is not open to the public yet, so jobs cannot be posted or browsed right now.",
    links: [live ? { label: "Post a job", href: "/post-job" } : { label: "Recruitment (coming soon)", href: "/recruitment" }],
  };
  const apply = {
    id: "recruitment-candidate",
    title: "Recruitment for candidates: finding and applying to jobs",
    keywords: ["job", "jobs", "apply", "application", "candidate", "career", "resume", "cv", "role", "vacancy", "work", "salary", "remote", "fresher", "internship"],
    text: live
      ? "Candidates browse and filter jobs at /recruitment/jobs (role or keyword, company, city, remote, employment type, experience level, salary). Applying needs login and a complete candidate profile (including a resume); the apply flow may include a few questions from the employer. Applications are tracked under My Applications in the Recruitment dashboard."
      : "Recruitment is COMING SOON, so job browsing and applying are not open to the public yet.",
    links: [live ? { label: "Browse jobs", href: "/recruitment/jobs" } : { label: "Recruitment (coming soon)", href: "/recruitment" }],
  };
  return [post, apply];
}

function knowledgeBase(recruitmentLive) {
  return [...RAW, ...recruitmentEntries(recruitmentLive)];
}

const STOP = new Set([
  "a", "an", "the", "i", "im", "is", "are", "am", "to", "in", "on", "at", "of", "for", "and", "or", "my", "me", "we", "our", "you", "your",
  "do", "does", "can", "how", "what", "which", "who", "when", "where", "why", "it", "this", "that", "with", "from", "about", "please", "tell",
  "want", "need", "know", "any", "some", "there", "be", "have", "has", "will", "would", "could", "should", "get", "use", "using",
]);

function tokens(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length >= 2 && !STOP.has(w)))];
}

/** Keyword/phrase score of one KB entry against a message. Multi-word keyword hits count more. */
function scoreEntry(entry, padded, tokSet) {
  let score = 0;
  for (const kw of entry.keywords) {
    if (kw.includes(" ")) {
      if (padded.includes(` ${kw} `)) score += 3;
    } else if (tokSet.has(kw)) {
      score += 1;
    }
  }
  return score;
}

/** Top-N KB entries relevant to the message (score > 0), best first. */
function retrieveKnowledge(message, recruitmentLive, limit = 4) {
  const toks = tokens(message);
  const tokSet = new Set(toks);
  // light plural folding so "listings"/"jobs"/"sellers" hit singular keywords and vice-versa
  for (const t of toks) {
    if (t.endsWith("s")) tokSet.add(t.slice(0, -1));
    else tokSet.add(`${t}s`);
  }
  const padded = ` ${String(message || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ")} `;
  return knowledgeBase(recruitmentLive)
    .map((e) => ({ entry: e, score: scoreEntry(e, padded, tokSet) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.entry);
}

module.exports = { knowledgeBase, retrieveKnowledge, tokens, STOP };
