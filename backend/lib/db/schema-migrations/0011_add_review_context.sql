-- reviews.context scopes each review to one product ('directory' | 'recruitment').
-- The same user id can be a Directory seller AND a Recruitment employer; without a
-- scope their reviews (and derived ratings) would mix. Legacy rows are NULL and are
-- treated as 'directory' everywhere in code (routes/reviews.js, lib/sellerRating.js).
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS context TEXT;

-- Backfill the recruitment demo reviews: a company review has no seller_id and
-- targets a user that has an employer profile.
UPDATE reviews r
   SET context = 'recruitment'
 WHERE r.context IS NULL
   AND r.seller_id IS NULL
   AND EXISTS (SELECT 1 FROM employer_profiles ep WHERE ep.user_id = r.target_user_id);
