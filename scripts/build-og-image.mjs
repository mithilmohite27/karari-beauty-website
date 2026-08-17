/**
 * Build the Open Graph share image from the square brand artwork.
 *
 * WHY A CROP RATHER THAN THE SQUARE
 * Facebook, LinkedIn, WhatsApp and X all render link previews at roughly
 * 1.91:1. Handed a square, they centre-crop it themselves - which on this
 * artwork would cut the products off the bottom and the lanterns off the top,
 * leaving an arbitrary band chosen by someone else's algorithm.
 *
 * Cropping deliberately keeps the parts that carry the brand: the KB monogram,
 * the wordmark, the category line and the top of the product arrangement.
 *
 * JPEG, not WebP. og:image is fetched by crawlers rather than browsers, and
 * WebP support across them is still patchy - a preview that some platforms
 * cannot render is worse than one a few KB larger.
 *
 * Usage:
 *   node scripts/build-og-image.mjs <source-image> [--top=170]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/build-og-image.mjs <source-image> [--top=170]");
  process.exit(1);
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
// Vertical offset of the crop within the squared-up artwork. Default keeps the
// monogram at the top and the product row just entering at the bottom.
const topArg = Number((process.argv.find((a) => a.startsWith("--top=")) || "").split("=")[1]);
const TOP = Number.isFinite(topArg) ? topArg : 170;

const input = await readFile(source);
const meta = await sharp(input).metadata();

// Square the artwork to OG width first so the crop offset is predictable
// regardless of what the source resolution happens to be.
const squared = await sharp(input).resize({ width: OG_WIDTH }).toBuffer();
const squaredMeta = await sharp(squared).metadata();

const maxTop = Math.max(0, (squaredMeta.height || OG_WIDTH) - OG_HEIGHT);
const top = Math.min(TOP, maxTop);

const output = await sharp(squared)
  .extract({ left: 0, top, width: OG_WIDTH, height: OG_HEIGHT })
  .jpeg({ quality: 86, progressive: true, mozjpeg: true })
  .toBuffer();

const destination = path.join(projectRoot, "public", "og-image.jpg");
await writeFile(destination, output);

console.log(`source     ${meta.width}x${meta.height}  ${Math.round(input.length / 1024)} KB`);
console.log(`squared    ${squaredMeta.width}x${squaredMeta.height}`);
console.log(`crop top   ${top} (max ${maxTop})`);
console.log(`written    ${OG_WIDTH}x${OG_HEIGHT}  ${Math.round(output.length / 1024)} KB  public/og-image.jpg`);
