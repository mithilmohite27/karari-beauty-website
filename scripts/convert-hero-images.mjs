/**
 * Convert the local hero and logo art to WebP.
 *
 * WHY
 * next.config.mjs sets images.unoptimized = true, so /_next/image is bypassed
 * entirely and whatever sits in public/ is what the browser downloads. That was
 * the right call to stop the metered-transform 402s, but it means nothing
 * resizes or re-encodes these any more.
 *
 * Lighthouse on Slow 4G measured the consequence: the hero is the LCP element
 * and ships as a 617 KiB PNG, with 514 KiB of that recoverable purely by using
 * a modern format. The logo ships at 256x256 to fill a 74x74 box.
 *
 * Writes .webp alongside the originals; the originals are left in place so a
 * revert is a one-line change back in the source reference.
 *
 * Usage:
 *   node scripts/convert-hero-images.mjs           # report
 *   node scripts/convert-hero-images.mjs --write   # apply
 */

import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--write");

/**
 * `width` is the largest the asset is ever displayed at, doubled for retina.
 * The heroes span the full viewport; the logo occupies 74px.
 */
const TARGETS = [
  { file: "public/hero/raksha-bandhan-2026.png", width: 1600, quality: 78, note: "LCP element" },
  { file: "public/hero/all-occasion-gifting.png", width: 1600, quality: 78, note: "second slide" },
  { file: "public/logo.png", width: 160, quality: 86, note: "displayed at 74px" }
];

const kb = (bytes) => Math.round(bytes / 1024);

let before = 0;
let after = 0;

console.log(apply ? "Converting\n" : "Dry run - pass --write to apply\n");

for (const target of TARGETS) {
  const absolute = path.join(projectRoot, target.file);
  if (!existsSync(absolute)) {
    console.log(`  SKIP  ${target.file} (missing)`);
    continue;
  }

  const originalSize = (await stat(absolute)).size;
  const input = await readFile(absolute);
  const meta = await sharp(input).metadata();

  const output = await sharp(input)
    .resize({ width: Math.min(target.width, meta.width || target.width), withoutEnlargement: true })
    .webp({ quality: target.quality })
    .toBuffer();

  before += originalSize;
  after += output.length;

  const webpPath = absolute.replace(/\.[^.]+$/, ".webp");
  if (apply) await writeFile(webpPath, output);

  const saved = Math.round((1 - output.length / originalSize) * 100);
  console.log(
    `  ${String(kb(originalSize)).padStart(4)} KB -> ${String(kb(output.length)).padStart(3)} KB  (-${saved}%)  ` +
    `${meta.width}x${meta.height}  ${target.file}  [${target.note}]`
  );
}

console.log(`\n  Total: ${kb(before)} KB -> ${kb(after)} KB (-${Math.round((1 - after / before) * 100)}%)`);
if (apply) console.log("  Originals kept. Update the source references to the .webp paths.");
