/**
 * Image processing and upload to Cloudflare R2.
 *
 * Server-side and Node-script only: it reads R2 secrets and depends on sharp's
 * native binaries. Never import this from a client component.
 *
 * It is a .mjs file so that the Next.js runtime and the standalone backfill
 * script (scripts/migrate-images-to-r2.mjs) can share one implementation. The
 * package has no "type": "module", so a .js file here would be interpreted as
 * CommonJS by Node and could not be imported from the .mjs scripts.
 */

import { CDN_WIDTHS } from "./imageVariants.mjs";

/**
 * Per-width WebP quality.
 *
 * Small variants are viewed at or near their native size where compression
 * artefacts are most visible relative to the detail present, so they get a
 * slightly lower quality budget without a perceptible cost; the 1600px variant
 * carries the zoomed product-page view and gets the most.
 */
const QUALITY_BY_WIDTH = { 400: 78, 800: 80, 1600: 82 };

/**
 * Blur placeholder width.
 *
 * 24px encodes to roughly 300 bytes of base64. This string is inlined into the
 * HTML of every page that renders the image, so the size matters more than it
 * looks - at 100px wide the same placeholder is about 4KB per image, which on a
 * 24-product grid is ~96KB of blocking HTML to avoid a brief grey box.
 */
const BLUR_WIDTH = 24;

/** Cache for a year and never revalidate: object keys are content-addressed by name and never overwritten. */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export class ImagePipelineError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImagePipelineError";
  }
}

/** Every R2 setting this module needs, or null when the pipeline is not configured. */
export function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

/** True when R2 credentials are present. Callers use this to stay on the old path when they are not. */
export function r2Enabled() {
  return r2Config() !== null;
}

let clientPromise = null;

async function getClient() {
  const config = r2Config();
  if (!config) throw new ImagePipelineError("R2 is not configured (need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).");

  if (!clientPromise) {
    clientPromise = import("@aws-sdk/client-s3").then(({ S3Client }) => new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    }));
  }

  return clientPromise;
}

/**
 * Normalise an arbitrary string into a safe R2 key segment.
 *
 * Keys end up in URLs, so anything outside [a-z0-9-] is collapsed to a hyphen.
 */
export function safeKeySegment(value, fallback = "image") {
  const safe = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || fallback;
}

/**
 * Build the shared key prefix for one image of one product.
 *
 *   buildImageBase("Rose Gold Bangle", 2)        -> products/rose-gold-bangle/rose-gold-bangle-2
 *   buildImageBase("Rose Gold Bangle", "main")   -> products/rose-gold-bangle/rose-gold-bangle-main
 *
 * The suffix accepts a string as well as an index because products.image_url
 * and product_images live in separate tables but share this key space. A
 * gallery row at sort_order 0 and its product's main image would otherwise both
 * claim "-0", and whichever ran second would overwrite the other's objects
 * while both database rows kept pointing at the same base - two different
 * products' rows silently rendering one picture. Giving the main image the
 * reserved "main" suffix makes the two namespaces disjoint by construction.
 */
export function buildImageBase(productSlug, suffix = 0) {
  const slug = safeKeySegment(productSlug, "product");
  const part = typeof suffix === "string" && !/^\d+$/.test(suffix)
    ? safeKeySegment(suffix, "0")
    : Math.max(0, Math.trunc(Number(suffix) || 0));
  return `products/${slug}/${slug}-${part}`;
}

async function putObject(key, body, contentType) {
  const config = r2Config();
  const client = await getClient();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");

  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: CACHE_CONTROL
  }));
}

/**
 * Resize one source image into every configured width, upload each to R2, and
 * return the variant record to persist alongside the row.
 *
 * `base` is passed explicitly rather than derived here so that callers with
 * different key conventions - product images keyed by slug, media-library
 * uploads keyed by storage path - can share this function.
 *
 * Uploads run sequentially. With three widths per image and 107 images the
 * total is trivial either way, and sequential keeps peak memory to one decoded
 * bitmap rather than three.
 */
export async function processAndUpload(sourceBuffer, base) {
  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length === 0) {
    throw new ImagePipelineError("Source image buffer is empty.");
  }

  const { default: sharp } = await import("sharp");
  const key = String(base).replace(/^\/+/, "");
  const widths = [];

  for (const width of CDN_WIDTHS) {
    const data = await sharp(sourceBuffer)
      // Phone originals carry orientation in EXIF only; without this they
      // upload rotated and there is no way to fix it after the fact.
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY_BY_WIDTH[width] ?? 80 })
      .toBuffer();

    await putObject(`${key}-${width}.webp`, data, "image/webp");
    widths.push(width);
  }

  const blurBuffer = await sharp(sourceBuffer)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    base: key,
    widths,
    blur: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Best-effort variant generation.
 *
 * Used on the admin upload path, where the image has already been stored in
 * Supabase successfully. A failure here means the product renders from the
 * original URL exactly as it does today - strictly worse performance, but the
 * admin's upload still succeeded, and the backfill can pick it up later.
 */
export async function tryProcessAndUpload(sourceBuffer, base) {
  if (!r2Enabled()) return null;

  try {
    return await processAndUpload(sourceBuffer, base);
  } catch (error) {
    console.warn("[karari-images] R2 variant generation failed, keeping original only.", error?.message || error);
    return null;
  }
}
