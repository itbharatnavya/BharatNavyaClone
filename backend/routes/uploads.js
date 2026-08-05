/**
 * uploads.js — reusable image-upload primitive (mounted at /api/uploads).
 *
 * Non-technical sellers take/pick a photo on their phone; the browser turns it into a
 * base64 data URL and POSTs it here. We validate mime + size, write it under a SAFE
 * server-generated name into frontend/public/uploads/, and return { url: "/uploads/<name>" }
 * — which Next serves as a static asset, exactly like the /demo images. No pasted URLs,
 * no trusted client filenames (so no path traversal).
 */

const express = require("express");
const fsp = require("fs/promises");
const path = require("path");
const router = express.Router();
const { authGuard } = require("../middleware/authGuard");

// A 5 MB image is ~6.7 MB once base64-encoded inside JSON, well over the app's default
// body limit — raise it at the route level so a legit photo isn't rejected before we
// can even validate it.
router.use(express.json({ limit: "8mb" }));

const MIME_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB decoded
const UPLOAD_DIR = path.resolve(__dirname, "../../frontend/public/uploads");

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
        error: "Unsupported image type (use PNG, JPEG or WebP)",
      });
    }

    const buf = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (!buf.length) {
      return res.status(400).json({ success: false, error: "Empty or invalid image data" });
    }
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ success: false, error: "Image too large (max 5 MB)" });
    }

    // Server-owned name only — never derived from client input.
    const name = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await fsp.mkdir(UPLOAD_DIR, { recursive: true });
    await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);

    return res.status(201).json({ success: true, data: { url: `/uploads/${name}` } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
