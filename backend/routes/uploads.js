/**
 * uploads.js — reusable image/résumé-upload primitive (mounted at /api/uploads).
 *
 * Non-technical sellers take/pick a photo on their phone; the browser turns it into a
 * base64 data URL and POSTs it here. We validate mime + size and hand the decoded
 * buffer to lib/uploadStorage.js, which writes it under a SAFE server-generated name
 * (never a client-supplied one — no path traversal) — locally into
 * frontend/public/uploads/ (served as a static asset, same as the /demo images) or to
 * S3, depending on config.UPLOAD_STORAGE. Either way we return { url }.
 */

const express = require("express");
const router = express.Router();
const { authGuard } = require("../middleware/authGuard");
const uploadStorage = require("../lib/uploadStorage");

// A 5 MB image is ~6.7 MB once base64-encoded inside JSON, well over the app's default
// body limit — raise it at the route level so a legit photo isn't rejected before we
// can even validate it. A 10 MB résumé PDF (MAX_BYTES_PDF below) is ~13.3 MB
// base64-encoded, so this needs to clear that too.
router.use(express.json({ limit: "14mb" }));

const MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  // Recruitment (RECRUITMENT.md §2/§7): résumé upload reuses this same primitive —
  // added application/pdf rather than building a parallel upload route.
  "application/pdf": "pdf",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB decoded
// Résumés run larger than a compressed photo; a bit more headroom for PDFs specifically.
const MAX_BYTES_PDF = 10 * 1024 * 1024; // 10 MB decoded

// POST /api/uploads — { dataUrl: "data:image/<png|jpeg|webp>;base64,..." }
router.post("/", authGuard, async (req, res, next) => {
  try {
    const { dataUrl } = req.body || {};
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res
        .status(400)
        .json({ success: false, error: "A base64 image dataUrl is required" });
    }

    const match = /^data:([a-z0-9/+.-]+);base64,(.+)$/is.exec(dataUrl);
    if (!match) {
      return res.status(400).json({ success: false, error: "Malformed data URL" });
    }

    const mime = match[1].toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext) {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type (use PNG, JPEG, WebP or PDF)",
      });
    }
    const isPdf = mime === "application/pdf";
    const maxBytes = isPdf ? MAX_BYTES_PDF : MAX_BYTES;

    const buf = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (!buf.length) {
      return res.status(400).json({ success: false, error: "Empty or invalid file data" });
    }
    if (buf.length > maxBytes) {
      return res.status(413).json({
        success: false,
        error: isPdf ? "PDF too large (max 10 MB)" : "Image too large (max 5 MB)",
      });
    }

    const url = await uploadStorage.saveFile(buf, ext, mime);
    return res.status(201).json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
