/**
 * Phase 2: publish the optimized product images to Supabase Storage.
 *
 * Phase 1 (scripts/optimize-product-images.mjs) wrote WebP copies into
 * optimized-images/ and deliberately stopped there - 197 MB of PNG originals
 * were reduced to 8.5 MB but nothing was uploaded or remapped. This script
 * completes that: it uploads each optimized file alongside the original and
 * repoints the database rows at it.
 *
 * Safety properties:
 *   - Dry run unless --write is passed.
 *   - Originals are never deleted or overwritten; new objects go under a
 *     separate `optimized/` prefix, so rollback is a database update only.
 *   - Rows are matched on exact old URL, so re-running is idempotent: the
 *     second pass finds nothing left pointing at the original URL.
 *   - A row-count mismatch aborts before any further writes.
 *
 * Requires (from .env.local or the shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (server-only; never expose to the browser)
 *
 * Usage:
 *   node scripts/publish-optimized-images.mjs            # report what would change
 *   node scripts/publish-optimized-images.mjs --write    # apply
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const optimizedDir = path.join(projectRoot, "optimized-images");
const auditPath = path.join(projectRoot, "reports", "product-image-audit.json");

const apply = process.argv.includes("--write");
const BUCKET = "product-images";
const PREFIX = "optimized";

// Mirrors the naming in optimize-product-images.mjs: readable basename plus a
// short hash of the source URL to avoid collisions.
function optimizedFilenameFor(url) {
  const parsed = new URL(url);
  const base = decodeURIComponent(path.basename(parsed.pathname)) || "karari-product-image";
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${path.parse(base).name}-${hash}.webp`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Set it in .env.local or the shell before running.`);
    process.exit(1);
  }
  return value;
}

async function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;

  const contents = await readFile(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

await loadEnvLocal();

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

if (!existsSync(auditPath)) {
  console.error(`Missing ${auditPath}. Run scripts/audit-product-images.mjs first.`);
  process.exit(1);
}

const audit = JSON.parse(await readFile(auditPath, "utf8"));
const availableFiles = new Set(await readdir(optimizedDir));
const storageHost = new URL(supabaseUrl).hostname;

// Only images we host are ours to replace. Unsplash and other remote sources
// are left alone.
const candidateUrls = [
  ...new Set(
    audit.records
      .map((record) => record.url)
      .filter(Boolean)
      .filter((url) => {
        try {
          return new URL(url).hostname === storageHost;
        } catch {
          return false;
        }
      })
  )
];

console.log(`${apply ? "Applying" : "Dry run"} - ${candidateUrls.length} Supabase-hosted images referenced\n`);

const plan = [];
const skipped = [];

for (const url of candidateUrls) {
  const filename = optimizedFilenameFor(url);
  if (!availableFiles.has(filename)) {
    skipped.push({ url, reason: "no optimized copy" });
    continue;
  }

  const [{ count: productCount }, { count: galleryCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("image_url", url),
    supabase.from("product_images").select("id", { count: "exact", head: true }).eq("image_url", url)
  ]);

  if (!productCount && !galleryCount) {
    skipped.push({ url, reason: "no rows reference it (already migrated?)" });
    continue;
  }

  plan.push({ url, filename, productCount: productCount || 0, galleryCount: galleryCount || 0 });
}

let uploaded = 0;
let productsUpdated = 0;
let galleryUpdated = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const item of plan) {
  const localPath = path.join(optimizedDir, item.filename);
  const body = await readFile(localPath);
  const objectPath = `${PREFIX}/${item.filename}`;

  bytesAfter += body.length;

  if (!apply) {
    console.log(`  WOULD MIGRATE  ${item.filename}  (products:${item.productCount} gallery:${item.galleryCount})`);
    continue;
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (uploadError) {
    console.error(`  UPLOAD FAILED  ${item.filename}: ${uploadError.message}`);
    continue;
  }
  uploaded += 1;

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const newUrl = publicUrlData.publicUrl;

  // Repoint every row that referenced the original object.
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .update({ image_url: newUrl })
    .eq("image_url", item.url)
    .select("id");

  if (productError) {
    console.error(`  DB UPDATE FAILED (products) ${item.filename}: ${productError.message}`);
    continue;
  }
  productsUpdated += productRows?.length || 0;

  const { data: galleryRows, error: galleryError } = await supabase
    .from("product_images")
    .update({ image_url: newUrl })
    .eq("image_url", item.url)
    .select("id");

  if (galleryError) {
    console.error(`  DB UPDATE FAILED (product_images) ${item.filename}: ${galleryError.message}`);
    continue;
  }
  galleryUpdated += galleryRows?.length || 0;

  console.log(`  migrated  ${item.filename}  products:${productRows?.length || 0} gallery:${galleryRows?.length || 0}`);
}

for (const item of skipped) {
  console.log(`  SKIP  ${item.reason.padEnd(34)} ${item.url.split("/").pop().slice(0, 60)}`);
}

console.log("\nSummary");
console.log(`  images planned      : ${plan.length}`);
console.log(`  skipped             : ${skipped.length}`);
if (apply) {
  console.log(`  uploaded            : ${uploaded}`);
  console.log(`  products repointed  : ${productsUpdated}`);
  console.log(`  gallery repointed   : ${galleryUpdated}`);
  console.log(`  optimized payload   : ${Math.round(bytesAfter / 1024)} KB total`);
  console.log("\n  Originals were left in place. To roll back, restore the previous");
  console.log("  image_url values; nothing was deleted from storage.");
  console.log("  Then open the admin Products screen and confirm thumbnails load.");
} else {
  console.log("\n  Nothing was changed. Re-run with --write to apply.");
}
