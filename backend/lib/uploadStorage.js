/**
 * uploadStorage.js — pluggable file-storage backend for uploaded files (résumés,
 * photos, ad creatives, logos — anything that goes through routes/uploads.js).
 *
 * Local (default, dev): writes into frontend/public/uploads/, served by Next as a
 * static asset — zero setup, works out of the box.
 *
 * S3 (production-ready): uploads to an S3 bucket instead. Switching is a single env
 * var (config.UPLOAD_STORAGE=s3) plus AWS_REGION/AWS_S3_BUCKET — no code change, no
 * redeploy of app logic. See HANDOVER.md "File storage" for the full checklist
 * (bucket creation, public-read access or a CloudFront distribution in front of it,
 * IAM permissions).
 *
 * Callers only ever see `saveFile(buffer, ext, mime) -> Promise<url>` — which backend
 * is active is invisible above this module.
 */

const fsp = require("fs/promises");
const path = require("path");
const config = require("./config");

const LOCAL_UPLOAD_DIR = path.resolve(__dirname, "..", "..", "frontend", "public", "uploads");

async function saveLocal(buffer, name) {
  await fsp.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fsp.writeFile(path.join(LOCAL_UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

// Lazily required so `npm install` in local-only dev environments never needs the AWS
// SDK, and a misconfigured UPLOAD_STORAGE=s3 fails with a clear message rather than a
// startup-time crash for everyone.
let s3ClientPromise = null;
function getS3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      let S3Client;
      try {
        ({ S3Client } = require("@aws-sdk/client-s3"));
      } catch {
        throw new Error(
          "UPLOAD_STORAGE=s3 but @aws-sdk/client-s3 isn't installed — run `npm install` in backend/."
        );
      }
      const clientConfig = { region: config.AWS_REGION || undefined };
      // Omit credentials entirely to use the SDK's default chain (IAM role) — the
      // recommended production setup. Only pass explicit keys when both are set
      // (local testing against a real bucket).
      if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        };
      }
      return new S3Client(clientConfig);
    })();
  }
  return s3ClientPromise;
}

async function saveS3(buffer, name, mime) {
  if (!config.AWS_S3_BUCKET) {
    throw new Error("UPLOAD_STORAGE=s3 but AWS_S3_BUCKET is not set (see backend/.env)");
  }
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const client = await getS3Client();
  const key = `uploads/${name}`;
  // Deliberately no ACL param — modern buckets (S3 Object Ownership "Bucket owner
  // enforced", the current default for new buckets) reject PutObject requests that set
  // one. Public read must instead come from the bucket policy, or from a CloudFront
  // distribution in front of a private bucket (point S3_PUBLIC_BASE_URL at it) — see
  // HANDOVER.md.
  await client.send(
    new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );
  const base =
    config.S3_PUBLIC_BASE_URL ||
    `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION || "us-east-1"}.amazonaws.com`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/**
 * Store a decoded file buffer under a server-generated name and return its public URL.
 * `ext` is the file extension (no dot, e.g. "pdf"), `mime` the content type.
 */
async function saveFile(buffer, ext, mime) {
  const name = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (config.UPLOAD_STORAGE === "s3") {
    return saveS3(buffer, name, mime);
  }
  return saveLocal(buffer, name);
}

module.exports = { saveFile };
