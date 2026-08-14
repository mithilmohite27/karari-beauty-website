/**
 * One-off backfill: generate R2 image variants for the existing catalogue.
 *
 *   node scripts/migrate-images-to-r2.mjs            # report what would run
 *   node scripts/migrate-images-to-r2.mjs --write    # actually process and upload
 *
 * RUN THIS LOCALLY, NOT ON VERCEL.
 * Each image is downloaded, decoded by sharp four times and re-encoded four
 * times. Doing that for ~107 images inside a serverless function runs into the
 * memory ceiling and the execution timeout. On a laptop neither applies, and
 * the only cost of a slow run is waiting.
 *
 * Three properties make this safe to re-run:
 *
 *   1. Idempotent. It only selects rows whose variants column is still `{}`,
 *      which is exactly what the idx_*_unmigrated partial indexes cover. A run
 *      that dies halfway leaves the completed rows done and picks up the rest.
 *   2. Non-fatal per row. A 404 on one Supabase object or one corrupt JPEG is
 *      logged and skipped; it never aborts the other 106.
 *   3. It refuses to launder stock photography. Products still pointing at
 *      images.unsplash.com are skipped by design - copying a stock photo into
 *      our own CDN does not make it a photograph of our product.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");

/** Same minimal .env.local reader the other maintenance scripts use. */
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

// Must run before lib/images.mjs is imported: it reads R2 settings at call
// time, but importing after the env is populated keeps the ordering obvious.
await loadEnvLocal();

const { buildImageBase, processAndUpload, r2Enabled } = await import("../lib/images.mjs");

/**
 * Hosts whose images are placeholders rather than our own product photography.
 * Never migrated: see the header note.
 */
const PLACEHOLDER_HOSTS = ["images.unsplash.com", "images.pexels.com"];

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Set it in .env.local (see .env.example) before running.`);
    process.exit(1);
  }
  return value;
}

function isPlaceholder(url) {
  return PLACEHOLDER_HOSTS.some((host) => String(url).includes(host));
}

/**
 * Count how many distinct products each image URL is used by, across both
 * tables.
 *
 * WHY THIS EXISTS
 * Checking the hostname is not enough to recognise a placeholder. Some stock
 * photos were downloaded, re-encoded and uploaded into our own Supabase bucket,
 * so they carry a supabase.co URL and pass every host check while still being
 * stock imagery. In this catalogue two such files are each shared by six
 * different products.
 *
 * Sharing is the signal that survives re-hosting: one file standing in for six
 * distinct products at six different prices is a placeholder no matter where it
 * is served from. Real product photography is used once.
 *
 * Migrating those would write two stock images into R2 under twelve product
 * keys and present them as our own photography - the exact outcome the Unsplash
 * skip was written to prevent.
 */
async function buildSharedImageIndex(db) {
  const usage = new Map();

  const record = (url, slug) => {
    if (!url || !slug) return;
    if (!usage.has(url)) usage.set(url, new Set());
    usage.get(url).add(slug);
  };

  const { data: products, error: productError } = await db.from("products").select("slug, image_url");
  if (productError) throw new Error(`Could not read products for the shared-image index: ${productError.message}`);
  for (const row of products) record(row.image_url, row.slug);

  const { data: images, error: imageError } = await db.from("product_images").select("image_url, products(slug)");
  if (imageError) throw new Error(`Could not read product_images for the shared-image index: ${imageError.message}`);
  for (const row of images) record(row.image_url, row.products?.slug);

  const shared = new Map();
  for (const [url, slugs] of usage) {
    if (slugs.size > 1) shared.set(url, [...slugs].sort());
  }

  return shared;
}

async function main() {
  // Only --write needs credentials. The dry run is a planning tool - it should
  // work before the Cloudflare side exists, so the migration can be reviewed
  // and the counts checked ahead of time.
  if (WRITE && !r2Enabled()) {
    console.error("R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in .env.local.");
    process.exit(1);
  }

  const db = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    // Service role: bypasses RLS so the script can read and update every row.
    // Local only - this key must never reach a browser bundle or a deployment
    // that serves client code.
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  if (!WRITE) {
    console.log("DRY RUN - no images will be processed and nothing will be written.");
    console.log("Re-run with --write to perform the migration.\n");
  }

  const shared = await buildSharedImageIndex(db);

  if (shared.size > 0) {
    console.log(`\n${shared.size} image file(s) are shared across multiple products and will be skipped:`);
    for (const [url, slugs] of shared) {
      console.log(`  ${url.split("/").pop()} used by ${slugs.length}: ${slugs.join(", ")}`);
    }
    console.log("  These are placeholders regardless of where they are hosted. Each product needs its own photograph.");
  }

  const totals = { ok: 0, skipped: 0, failed: 0 };

  await migrateTable(db, totals, {
    shared,
    table: "product_images",
    column: "variants",
    select: "id, image_url, sort_order, products(slug)",
    slugOf: (row) => row.products?.slug,
    indexOf: (row) => row.sort_order ?? 0
  });

  await migrateTable(db, totals, {
    shared,
    table: "products",
    column: "image_variants",
    select: "id, slug, image_url",
    slugOf: (row) => row.slug,
    // "main", not 0: gallery rows use their sort_order, which also starts at 0.
    // See the note on buildImageBase - sharing the key would let one table's
    // upload overwrite the other's objects.
    indexOf: () => "main"
  });

  console.log(`\nTotal: ${totals.ok} migrated, ${totals.skipped} skipped, ${totals.failed} failed.`);
  if (totals.failed > 0) process.exitCode = 1;
}

async function migrateTable(db, totals, { shared, table, column, select, slugOf, indexOf }) {
  // The literal string "{}", not an object: PostgREST puts this straight into
  // the query string, and an object stringifies to "[object Object]" and comes
  // back as "invalid input syntax for type json". This predicate is what makes
  // the run idempotent, and it matches the idx_*_unmigrated partial indexes.
  const { data: rows, error } = await db.from(table).select(select).eq(column, "{}");
  if (error) {
    console.error(`Could not read ${table}:`, error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${table}: ${rows.length} row(s) awaiting migration.`);

  for (const row of rows) {
    const slug = slugOf(row);
    const label = slug || row.id;

    if (!slug) {
      console.warn(`  SKIP  ${row.id} - no product slug (orphaned row?)`);
      totals.skipped += 1;
      continue;
    }

    if (!row.image_url) {
      console.warn(`  SKIP  ${label} - no image_url`);
      totals.skipped += 1;
      continue;
    }

    if (isPlaceholder(row.image_url)) {
      console.warn(`  SKIP  ${label} - stock placeholder, needs real product photography`);
      totals.skipped += 1;
      continue;
    }

    const sharedWith = shared.get(row.image_url);
    if (sharedWith) {
      console.warn(`  SKIP  ${label} - image shared with ${sharedWith.length - 1} other product(s), needs its own photograph`);
      totals.skipped += 1;
      continue;
    }

    if (!WRITE) {
      console.log(`  WOULD ${label} -> ${buildImageBase(slug, indexOf(row))}`);
      totals.ok += 1;
      continue;
    }

    try {
      const response = await fetch(row.image_url);
      if (!response.ok) {
        console.warn(`  SKIP  ${label} - source returned HTTP ${response.status}`);
        totals.skipped += 1;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const variants = await processAndUpload(buffer, buildImageBase(slug, indexOf(row)));

      const { error: updateError } = await db.from(table).update({ [column]: variants }).eq("id", row.id);
      if (updateError) throw new Error(updateError.message);

      console.log(`  OK    ${label} -> ${variants.base}`);
      totals.ok += 1;
    } catch (rowError) {
      console.error(`  FAIL  ${label} -`, rowError?.message || rowError);
      totals.failed += 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
