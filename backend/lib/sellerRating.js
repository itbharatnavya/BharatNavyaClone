/**
 * sellerRating.js — recompute + persist a seller's public rating/reviewCount
 * from ALL their currently-approved reviews (message or star-only — both
 * count toward the seller's overall standing; only the public review LIST
 * hides star-only ones, see routes/reviews.js). sellerProfile.rating/
 * reviewCount are static persisted fields, not computed on every read (like
 * trustScore.js is), so anything that can change which reviews count as
 * "approved" for a seller — moderation approve/hide/delete, or a buyer
 * editing a review back to "pending" — must call this afterward.
 */

const store = require("./store");

async function recomputeSellerRating(targetUserId) {
  if (!targetUserId) return;
  const [reviews, seller] = await Promise.all([
    store.all("reviews.json"),
    store.getById("users.json", targetUserId),
  ]);
  if (!seller || !seller.sellerProfile) return;
  const mine = reviews.filter(
    (r) =>
      r.status === "approved" &&
      (r.targetUserId === targetUserId || r.sellerId === targetUserId)
  );
  const reviewCount = mine.length;
  const rating = reviewCount
    ? Math.round(
        (mine.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviewCount) * 10
      ) / 10
    : 0;
  await store.update("users.json", targetUserId, {
    sellerProfile: { ...seller.sellerProfile, rating, reviewCount },
  });
}

module.exports = { recomputeSellerRating };
