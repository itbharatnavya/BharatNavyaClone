/**
 * listingVerification.js — AI-assisted listing verification (products & services).
 *
 * A new listing is never published blind: it's scored by (1) fast deterministic
 * checks (title/description/category/images/pricing present and well-formed) and,
 * when available, (2) a semantic review from the local `claude` CLI (lib/claudeCli —
 * NO ANTHROPIC_API_KEY, same mechanism as routes/ai.js and routes/assistant.js).
 *
 * verifyListing(listing) returns { status, score, aiRan, deterministic, ai, summary }:
 *   - status "auto_approved" — score >= AUTO_APPROVE_THRESHOLD AND the AI ran and
 *     didn't flag the content. The caller lists it immediately (status "active").
 *   - status "needs_review"  — everything else (low score, AI flagged it, or the AI
 *     CLI wasn't available to give a second opinion). The caller keeps it unlisted
 *     (status "pending") until an admin approves it from the Control Center.
 *
 * Never throws — a broken/unavailable AI CLI degrades to deterministic-only scoring
 * and a manual-review outcome, never a blocked submission (CLAUDE.md "never-blank").
 */

const config = require("./config");
const claudeCli = require("./claudeCli");

const AUTO_APPROVE_THRESHOLD = 70;

/** A listing image is "valid" only if it's a local asset — external hot-links are
 * against this app's design rule (CLAUDE.md "Local images only") and, practically,
 * can't be trusted the way an uploaded/demo photo can. */
function isLocalImagePath(url) {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("data:image/")) return true;
  if (u.startsWith("/")) return true;
  return false;
}

/** Fast, synchronous structural checks — always run, regardless of AI availability. */
function deterministicChecks(listing) {
  const checks = [];
  let points = 0;

  const title = String((listing && listing.title) || "").trim();
  const titleOk = title.length >= 8 && title.length <= 140 && /[a-zA-Z]/.test(title);
  checks.push({
    key: "title",
    pass: titleOk,
    detail: titleOk ? "Title is descriptive" : "Title is missing or too short",
  });
  if (titleOk) points += 20;

  const description = String((listing && listing.description) || "").trim();
  const descriptionOk = description.length >= 20;
  checks.push({
    key: "description",
    pass: descriptionOk,
    detail: descriptionOk ? "Description has enough detail" : "Description is missing or too short",
  });
  if (descriptionOk) points += 20;

  const categoryOk = !!(
    (listing && listing.categoryId) ||
    (listing && Array.isArray(listing.categoryPath) && listing.categoryPath.length)
  );
  checks.push({
    key: "category",
    pass: categoryOk,
    detail: categoryOk ? "Category selected" : "No category selected",
  });
  if (categoryOk) points += 15;

  const media = Array.isArray(listing && listing.media) ? listing.media : [];
  const images = media.filter((m) => m && (!m.type || m.type === "image") && m.url);
  const validImages = images.filter((m) => isLocalImagePath(m.url));
  const imagesOk = images.length > 0 && validImages.length === images.length;
  let imageDetail;
  if (images.length === 0) imageDetail = "No photos added";
  else if (validImages.length < images.length)
    imageDetail = `${images.length - validImages.length} photo URL(s) look external/invalid — use uploaded or /demo images`;
  else imageDetail = `${validImages.length} photo(s) look valid`;
  checks.push({ key: "images", pass: imagesOk, detail: imageDetail });
  if (images.length > 0) points += Math.round(25 * (validImages.length / images.length));

  let pricingOk;
  let pricingDetail;
  if (listing && listing.type === "service") {
    const svc = listing.service || {};
    pricingOk = (Array.isArray(svc.rateCard) && svc.rateCard.length > 0) || svc.pricingModel === "quote";
    pricingDetail = pricingOk ? "Pricing info provided" : "No rate card or pricing model set";
  } else {
    const price = listing && listing.product && listing.product.price;
    pricingOk = typeof price === "number" && price > 0;
    pricingDetail = pricingOk ? "Price is set" : "Price is missing or invalid";
  }
  checks.push({ key: "pricing", pass: pricingOk, detail: pricingDetail });
  if (pricingOk) points += 20;

  return {
    score: Math.max(0, Math.min(100, points)),
    checks,
    imageCount: images.length,
    validImageCount: validImages.length,
  };
}

/** Ask the local Claude CLI to semantically review the listing. Returns null on any failure. */
async function askAIReview(listing) {
  const media = Array.isArray(listing && listing.media) ? listing.media : [];
  const imageList = media.map((m) => m && m.url).filter(Boolean).join(", ") || "(none)";
  const pricing =
    listing.type === "service"
      ? JSON.stringify((listing.service && listing.service.rateCard) || [])
      : String((listing.product && listing.product.price) ?? "unknown");
  const category =
    listing.legacyCategory ||
    (Array.isArray(listing.categoryPath) ? listing.categoryPath.join(" > ") : "") ||
    "unknown";

  const prompt = `You are a content moderator for BharatSource, an Indian B2B/B2C marketplace. A seller just submitted a new ${listing.type} listing. Decide if it looks genuine and safe enough to publish automatically.

Title: ${title(listing)}
Description: ${String(listing.description || "").slice(0, 800)}
Category: ${category}
Pricing: ${pricing}
Image file paths (${media.length}), you cannot see the actual images so judge only plausibility from the paths/filenames: ${imageList}

Check for: spam or gibberish text, prohibited/illegal items (weapons, drugs, counterfeit goods), misleading claims, and whether the image paths look like real product/service photos rather than placeholders or unrelated files.

Respond with ONLY minified JSON: {"score": <0-100 overall confidence it is a genuine, safe, well-formed listing>, "contentOk": <boolean>, "imagePlausible": <boolean>, "flags": [<short strings, empty if none>], "reason": "<one short sentence>"}`;

  const out = await claudeCli.askClaudeJSON(prompt, { timeoutMs: 15000 });
  if (!out || typeof out.score !== "number") return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(out.score))),
    contentOk: out.contentOk !== false,
    imagePlausible: out.imagePlausible !== false,
    flags: Array.isArray(out.flags) ? out.flags.filter((f) => typeof f === "string").slice(0, 10) : [],
    reason: typeof out.reason === "string" ? out.reason.slice(0, 300) : "",
  };
}

function title(listing) {
  return String((listing && listing.title) || "").slice(0, 200);
}

/**
 * Run the full verification pipeline for a draft listing (not yet persisted — id is
 * not required). Never throws.
 */
async function verifyListing(listing) {
  const deterministic = deterministicChecks(listing);
  const aiAvailable = config.AI_CLI_ENABLED && claudeCli.isClaudeAvailable();

  let ai = null;
  if (aiAvailable) {
    try {
      ai = await askAIReview(listing);
    } catch {
      ai = null;
    }
  }

  const aiRan = !!ai;
  const score = aiRan ? Math.round(deterministic.score * 0.4 + ai.score * 0.6) : deterministic.score;
  const autoApproved = aiRan && score >= AUTO_APPROVE_THRESHOLD && ai.contentOk && ai.imagePlausible;

  const summary = aiRan
    ? ai.reason || (autoApproved ? "Looks genuine — verified automatically." : "Needs a manual look.")
    : "AI reviewer unavailable right now — sent for manual admin review.";

  return {
    status: autoApproved ? "auto_approved" : "needs_review",
    score,
    aiRan,
    deterministic,
    ai,
    summary,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = { verifyListing, deterministicChecks, isLocalImagePath, AUTO_APPROVE_THRESHOLD };
