-- 0014 — DB-level backstop for BACKEND-AUDIT.md S2 (self-review).
--
-- routes/reviews.js POST already 403s when targetUserId === req.user.id (Phase 1b),
-- and that path runs recomputeSellerRating on the target — so a self-review is a
-- self-inflated rating. This CHECK makes such a row impossible to persist even via a
-- future code path that forgets the guard. NULL-tolerant: buyer_id / target_user_id
-- are ON DELETE SET NULL, so a legitimate row can legally have either side NULL.
--
-- DO block for idempotency: a fresh install already carries this constraint from
-- schema.sql's CREATE TABLE, so a plain ADD CONSTRAINT would fail on --fresh.

DO $$ BEGIN
  ALTER TABLE reviews
    ADD CONSTRAINT reviews_no_self_review
    CHECK (buyer_id IS NULL OR target_user_id IS NULL OR buyer_id <> target_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
