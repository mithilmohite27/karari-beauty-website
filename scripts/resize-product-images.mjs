/**
 * Re-encode product images at the size they are actually displayed.
 *
 * THE TENSION THIS HAS TO RESOLVE
 * next.config.mjs sets images.unoptimized, so one stored file serves every
 * context. Product images are used at two very different sizes:
 *
 *   - grid card:      ~326-413px wide (homepage, collections)
 *   - product detail:  up to ~720px wide on desktop (sizes="50vw")
 *
 * Shrinking to grid size would visibly soften the detail page, which is the
 * page that actually sells the item. So width is capped generously enough for
 * the detail view, and the saving is taken from encoding quality instead -
 * Lighthouse specifically reported "increasing the image compression factor"
 * as available headroom on these files, separate from the dimension warning.
 *
 * Covers both products.image_url and the product_images gallery table.
 *
 * Usage:
 *   node scripts/optimize-product-images.mjs                    # report
 *   node scripts/optimize-product-images.mjs --write            # apply
 *   node scripts/optimize-product-images.mjs --width=800 --quality=70
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--write");
const argValue = (name, fallback) => {
  const raw = (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const BUCKET = "product-images";
const PREFIX = "optimized";
// Wide enough for the detail page at 2x on a typical laptop, without carrying
// the 3-4000px originals a phone camera produces.
const MAX_WIDTH = argValue("width", 1000);
/**
 * 78, not lower, and the reason matters.
 *
 * The stored images are already 900x1200 - under MAX_WIDTH - so nothing is
 * resized and the entire saving comes from re-encoding already-lossy WebP.
 * That is generation loss, and it lands hardest on fine detail, which for this
 * catalogue means jewellery.
 *
 * Measured across all 94 images: q78 = -42%, q75 = -48%, q72 = -50%. Dropping
 * to 72 buys 8 further points for a disproportionate amount of additional
 * degradation, so this stops at the knee of that curve.
 */
const WEBP_QUALITY = argValue("quality", 78);

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: products, error } = await supabase
  .from("products")
  .select("id, slug, image_url")
  .eq("is_active", true)
  .order("sort_order");

if (error) {
  console.error(`Could not read products: ${error.message}`);
  process.exit(1);
}

const { data: gallery } = await supabase.from("product_images").select("id, image_url");

// One image can be referenced by several rows; encode each distinct URL once.
const targets = new Map();
for (const p of products) {
  if (p.image_url) targets.set(p.image_url, { productIds: [p.id], galleryIds: [] });
}
for (const g of gallery || []) {
  if (!g.image_url) continue;
  const entry = targets.get(g.image_url) || { productIds: [], galleryIds: [] };
  entry.galleryIds.push(g.id);
  targets.set(g.image_url, entry);
}

console.log(`${apply ? "Applying" : "Dry run"} - ${targets.size} distinct images, max ${MAX_WIDTH}px, quality ${WEBP_QUALITY}\n`);

let before = 0;
let after = 0;
let changed = 0;
let skipped = 0;

for (const [url, refs] of targets) {
  let original;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) { skipped++; continue; }
    original = Buffer.from(await response.arrayBuffer());
  } catch { skipped++; continue; }

  const meta = await sharp(original).metadata();
  const optimized = await sharp(original)
    .resize({ width: Math.min(MAX_WIDTH, meta.width || MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // Re-encoding can grow a file that is already smaller than the target.
  // Leaving it alone also avoids a pointless round of generation loss.
  if (optimized.length >= original.length * 0.95) {
    skipped++;
    continue;
  }

  before += original.length;
  after += optimized.length;
  changed++;

  const label = url.split("/").pop().slice(0, 44);
  const line = `${String(Math.round(original.length / 1024)).padStart(4)} KB -> ${String(Math.round(optimized.length / 1024)).padStart(3)} KB  ${meta.width}x${meta.height}  ${label}`;

  if (!apply) { console.log(`  WOULD  ${line}`); continue; }

  const objectPath = `${PREFIX}/p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });
  if (uploadError) { console.error(`  FAILED upload ${label}: ${uploadError.message}`); continue; }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  if (refs.productIds.length) {
    await supabase.from("products").update({ image_url: pub.publicUrl }).in("id", refs.productIds);
  }
  if (refs.galleryIds.length) {
    await supabase.from("product_images").update({ image_url: pub.publicUrl }).in("id", refs.galleryIds);
  }

  console.log(`  DONE   ${line}`);
}

console.log(`\n  images ${apply ? "updated" : "to update"}: ${changed}   skipped (already small enough or unreachable): ${skipped}`);
if (before) {
  console.log(`  ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB  (-${Math.round((1 - after / before) * 100)}%)`);
}
if (!apply) console.log("\n  Nothing changed. Re-run with --write to apply.");
else console.log("\n  Originals left in place. Rollback = restore the previous image_url values.");
