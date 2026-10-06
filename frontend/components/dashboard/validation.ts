// Client-side validation for the seller-dashboard forms (Directory): Profile
// (seller details + Get-verified), Blogs editor, and Advertise campaign builder.
// Pure functions — no React. Each returns { fieldKey: message }; empty == valid.
// The tabs render these inline (Input/Textarea/Select take an `error` prop) and
// block submit while any are present.

export type Errors = Record<string, string>;

export const isBlank = (s: string | undefined | null) => !s || !s.trim();

// http(s):// URL, or a site-relative path ("/seller/foo", "/uploads/x.jpg").
const URL_RE = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;
export const isUrlish = (s: string) => URL_RE.test(s.trim());
// Strict absolute URL (no relative paths) — for the seller "Website" field.
export const isHttpUrl = (s: string) => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(s.trim());

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// Indian mobile: 10 digits starting 6-9, tolerating +91 / 0 / spaces / dashes.
export const isMobileIN = (s: string) => {
  const d = s.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
  return /^[6-9]\d{9}$/.test(d);
};

// GSTIN: 15 chars — 2 state digits, 5 letters (PAN block), 4 digits, 1 letter,
// 1 entity digit/letter, 'Z', 1 checksum digit/letter.
export const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
// PAN: 5 letters, 4 digits, 1 letter.
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const CURRENT_YEAR = new Date().getFullYear();
const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Profile — seller profile section (saveSeller / becomeSeller)
// ---------------------------------------------------------------------------
export function validateSellerProfile(v: {
  companyName: string;
  gstNumber: string;
  yearEstablished: string;
  website: string;
  employeeCount: string;
  contactMobile: string;
  contactEmail: string;
  about: string;
}): Errors {
  const e: Errors = {};

  const name = v.companyName.trim();
  if (!name) e.companyName = "Company name is required.";
  else if (name.length < 2) e.companyName = "Company name is too short.";
  else if (name.length > 120) e.companyName = "Keep the company name under 120 characters.";

  if (!isBlank(v.gstNumber) && !GST_RE.test(v.gstNumber.trim().toUpperCase()))
    e.gstNumber = "That doesn't look like a valid 15-character GSTIN.";

  if (!isBlank(v.yearEstablished)) {
    const y = Number(v.yearEstablished);
    if (!Number.isInteger(y) || y < 1850 || y > CURRENT_YEAR)
      e.yearEstablished = `Enter a year between 1850 and ${CURRENT_YEAR}.`;
  }

  if (!isBlank(v.website) && !isHttpUrl(v.website))
    e.website = "Enter a full website URL, e.g. https://example.com";

  if (v.employeeCount.trim().length > 24)
    e.employeeCount = "Keep this short, e.g. 11-50.";

  if (!isBlank(v.contactMobile) && !isMobileIN(v.contactMobile))
    e.contactMobile = "Enter a valid 10-digit Indian mobile number.";

  if (!isBlank(v.contactEmail) && !isEmail(v.contactEmail))
    e.contactEmail = "Enter a valid email address.";

  if (v.about.trim().length > 2000)
    e.about = "About is too long — keep it under 2000 characters.";

  return e;
}

// ---------------------------------------------------------------------------
// Profile — Get verified (submitVerification)
// ---------------------------------------------------------------------------
export function validateVerification(v: {
  gst: string;
  pan: string;
  note: string;
}): Errors {
  const e: Errors = {};
  if (isBlank(v.gst) && isBlank(v.pan)) {
    e.vGst = "Enter your GST or PAN number.";
    return e;
  }
  if (!isBlank(v.gst) && !GST_RE.test(v.gst.trim().toUpperCase()))
    e.vGst = "That doesn't look like a valid 15-character GSTIN.";
  if (!isBlank(v.pan) && !PAN_RE.test(v.pan.trim().toUpperCase()))
    e.vPan = "That doesn't look like a valid PAN (e.g. AAAAA0000A).";
  if (v.note.trim().length > 1000)
    e.vNote = "Note is too long — keep it under 1000 characters.";
  return e;
}

// ---------------------------------------------------------------------------
// Blogs editor (save)
// ---------------------------------------------------------------------------
export function validateBlog(v: {
  title: string;
  excerpt: string;
  body: string;
  tags: string; // comma-separated
  coverImage: string;
  status: string; // "draft" | "published"
}): Errors {
  const e: Errors = {};

  const title = v.title.trim();
  if (!title) e.title = "Add a title.";
  else if (title.length < 4) e.title = "Title is too short.";
  else if (title.length > 140) e.title = "Keep the title under 140 characters.";

  if (v.excerpt.trim().length > 300)
    e.excerpt = "Excerpt is too long — keep it under 300 characters.";

  const body = v.body.trim();
  if (!body) e.body = "Write the post body.";
  else if (body.length > 50000) e.body = "This post is too long.";
  else if (v.status === "published" && body.length < 50)
    e.body = "Add more content before publishing (at least 50 characters).";

  const tags = v.tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 15) e.tags = "Too many tags — 15 max.";
  else if (tags.some((t) => t.length > 30)) e.tags = "Each tag must be under 30 characters.";

  if (!isBlank(v.coverImage) && !isUrlish(v.coverImage))
    e.coverImage = "Enter a valid image URL, or leave it blank.";

  return e;
}

// ---------------------------------------------------------------------------
// Advertise campaign builder (submit)
// ---------------------------------------------------------------------------
export function validateAd(v: {
  source: "listing" | "custom";
  listingId: string;
  creativeImageUrl: string;
  headline: string;
  targetUrl: string;
  startDate: string;
  endDate: string;
}): Errors {
  const e: Errors = {};

  if (v.source === "listing" && !v.listingId)
    e.listingId = "Pick one of your listings, or switch to a custom image.";

  if (isBlank(v.creativeImageUrl))
    e.creativeImageUrl =
      v.source === "listing"
        ? "Pick a listing that has a photo, or use a custom image."
        : "Upload a campaign image.";
  else if (!isUrlish(v.creativeImageUrl))
    e.creativeImageUrl = "That image link doesn't look valid.";

  const headline = v.headline.trim();
  if (!headline) e.headline = "Add a headline.";
  else if (headline.length < 3) e.headline = "Headline is too short.";
  else if (headline.length > 80) e.headline = "Keep the headline under 80 characters.";

  // A listing ad links to its own page automatically; a custom image needs an explicit link,
  // because an ad with no link is never shown.
  if (isBlank(v.targetUrl)) {
    if (v.source === "custom") e.targetUrl = "Add the link buyers should go to when they tap the ad.";
  } else if (!isUrlish(v.targetUrl)) e.targetUrl = "Enter a full URL or a site path starting with /.";

  if (v.startDate && v.endDate && v.endDate < v.startDate)
    e.endDate = "End date must be on or after the start date.";
  if (v.endDate && v.endDate < todayISO())
    e.endDate = "End date is in the past.";

  return e;
}
