/**
 * validate.js — request validation via zod.
 *
 * `validate(schema)` returns middleware that parses a request part (body by default),
 * replaces it with the parsed/normalized value, and returns a 400 with field-level
 * issues on failure. Entity schemas grow per phase; core auth schemas live here now.
 */

const { z } = require("zod");

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req[source] = result.data;
    next();
  };
}

const mobile = z.string().regex(/^\d{10}$/, "mobile must be 10 digits");

const schemas = {
  register: z.object({
    name: z.string().min(1, "name is required"),
    mobile,
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }),
  sendOtp: z.object({ mobile }),
  verifyOtp: z.object({ mobile, otp: z.string().regex(/^\d{6}$/, "otp must be 6 digits") }),
  passwordLogin: z.object({
    email: z.string().email(),
    password: z.string().min(1, "password is required"),
  }),
  // POST /api/inquiries (buyer RFQ/enquiry submission). buyerId is intentionally
  // NOT accepted here — the route derives it only from the authenticated req.user,
  // never from the client, to close an identity-spoofing hole (see WORKFLOW.md).
  postInquiry: z.object({
    productName: z.string().trim().min(1, "productName is required").max(200),
    message: z.string().max(4000).optional(),
    buyerName: z.string().max(120).optional(),
    // Client sends "" for a not-yet-set profile field — accept that alongside a
    // properly formatted value rather than rejecting the whole submission for it.
    buyerMobile: z.union([mobile, z.literal("")]).optional(),
    buyerEmail: z.union([z.string().email().max(200), z.literal("")]).optional(),
    quantity: z.string().max(100).optional(),
    listingId: z.string().max(100).optional().nullable(),
    categoryId: z.string().max(100).optional().nullable(),
    intent: z.string().max(100).optional().nullable(),
  }),
};

module.exports = { z, validate, schemas };
