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
};

module.exports = { z, validate, schemas };
