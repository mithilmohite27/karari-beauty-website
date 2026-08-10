/**
 * Optimize category hero images in place.
 *
 * WHY
 * The product migration (publish-optimized-images.mjs) only covered products.
 * Category heroes were left as uploaded - the Fancy Items hero is a 2.5 MB PNG.
 * That mattered little while the Next.js image optimizer was absorbing it, but
 * once the Vercel image-transformation allowance was exhausted the optimizer
 * began returning HTTP 402 and those heroes rendered blank.
 *
 * Anything living under the `optimized/` prefix is served straight from
 * Supabase's CDN by components/ProductImage.jsx, bypassing the optimizer
 * entirely. Moving category heroes there fixes them regardless of quota, and
 * stops them consuming transformations at all.
 *
 * SAFETY
 * - Dry run unless --write is passed.
 * - Originals are never deleted or overwritten; new objects take a new path, so
 *   rollback is restoring the previous image_url.
 * - Re-runnable: images already under `optimized/` are skipped.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *
 * Usage:
 *   node scripts/optimize-category-images.mjs           # report
 *   node scripts/optimize-category-images.mjs --write   # apply
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--write");
// --slug=fancy-items limits the run to one category. Without it every category
// is processed.
const onlySlug = (process.argv.find((arg) => arg.startsWith("--slug=")) || "").split("=")[1] || "";

const BUCKET = "product-images";
const PREFIX = "optimized";
// Category heroes render at roughly half viewport width; 1600px covers desktop
// at 2x without paying for pixels nobody sees.
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { data: categories, error } = await supabase
  .from("categories")
  .select("id, slug, name, image_url")
  .order("sort_order");

if (error) {
  console.error(`Could not read categories: ${error.message}`);
  console.error("Check SUPABASE_SERVICE_ROLE_KEY is the long service_role JWT, not the project ref.");
  process.exit(1);
}

console.log(`${apply ? "Applying" : "Dry run"} - ${categories.length} categories\n`);

let changed = 0;
let bytesBefore = 0;
let bytesAfter = 0;

for (const category of categories) {
  if (onlySlug && category.slug !== onlySlug) continue;

  const url = category.image_url;

  if (!url) {
    console.log(`  SKIP   ${category.slug.padEnd(18)} no image set`);
    continue;
  }
  if (url.includes(`/${PREFIX}/`)) {
    console.log(`  SKIP   ${category.slug.padEnd(18)} already optimized`);
    continue;
  }

  let original;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.log(`  SKIP   ${category.slug.padEnd(18)} source returned HTTP ${response.status}`);
      continue;
    }
    original = Buffer.from(await response.arrayBuffer());
  } catch (fetchError) {
    console.log(`  SKIP   ${category.slug.padEnd(18)} unreachable: ${fetchError.message.slice(0, 40)}`);
    continue;
  }

  const meta = await sharp(original).metadata();
  const optimized = await sharp(original)
    .resize({ width: Math.min(MAX_WIDTH, meta.width || MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  bytesBefore += original.length;
  bytesAfter += optimized.length;

  const beforeKb = Math.round(original.length / 1024);
  const afterKb = Math.round(optimized.length / 1024);
  const saved = Math.round((1 - optimized.length / original.length) * 100);

  if (!apply) {
    console.log(`  WOULD  ${category.slug.padEnd(18)} ${String(beforeKb).padStart(5)} KB -> ${String(afterKb).padStart(4)} KB  (-${saved}%)`);
    changed += 1;
    continue;
  }

  const filename = `category-${category.slug}-${Date.now()}.webp`;
  const objectPath = `${PREFIX}/${filename}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, optimized, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (uploadError) {
    console.error(`  FAILED ${category.slug.padEnd(18)} upload: ${uploadError.message}`);
    continue;
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  const { error: updateError } = await supabase
    .from("categories")
    .update({ image_url: publicUrlData.publicUrl })
    .eq("id", category.id);

  if (updateError) {
    console.error(`  FAILED ${category.slug.padEnd(18)} db update: ${updateError.message}`);
    continue;
  }

  changed += 1;
  console.log(`  DONE   ${category.slug.padEnd(18)} ${String(beforeKb).padStart(5)} KB -> ${String(afterKb).padStart(4)} KB  (-${saved}%)`);
}

console.log(`\n  categories ${apply ? "updated" : "to update"}: ${changed}`);
if (bytesBefore) {
  console.log(`  ${Math.round(bytesBefore / 1024)} KB -> ${Math.round(bytesAfter / 1024)} KB total`);
}
if (!apply) console.log("\n  Nothing changed. Re-run with --write to apply.");
else console.log("\n  Originals left in place. Rollback = restore the previous image_url.");
