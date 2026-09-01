/**
 * validateBody.js — zod request-body validation for the Recruitment routers
 * (BACKEND-AUDIT.md Phase 4c). A `.strip()` schema IS the write allowlist — it
 * replaces the hand-written `JOB_EDITABLE` Set and the chain of `if (b.x && !SET.has…)`
 * checks in routes/jobs.js / routes/applications.js.
 *
 * Deliberately NOT the shared lib/validate.js `validate()`: that emits
 * `{ error:"Validation failed", issues:[…] }`, whereas every recruitment 400 today is
 * `{ success:false, error:"<specific message>" }`. This keeps that exact shape (the
 * first issue's message) so the migration stays contract-neutral — the schemas carry
 * the same messages the inline checks used.
 */

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({ success: false, error: first ? first.message : "Invalid request body" });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
