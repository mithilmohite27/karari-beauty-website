/**
 * Compress the static assets committed under public/ and app/.
 *
 * These are the images next/image never touches: favicons, the apple touch
 * icon and the app icon are served byte-for-byte as authored, so an oversized
 * source is downloaded by every visitor. Hero art does pass through the
 * optimizer, but a multi-MB source still costs build time and repo weight.
 *
 * Formats and filenames are preserved so no component or metadata reference has
 * to change. Originals are copied to public/_original-assets/ before writing.
 *
 * Usage:
 *   node scripts/compress-static-assets.mjs          # report only
 *   node scripts/compress-static-assets.mjs --write  # apply
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Deliberately outside public/: anything under public/ is served on the open
// web and shipped in the deployment bundle.
const backupDir = path.join(projectRoot, ".original-assets");
const apply = process.argv.includes("--write");

/**
 * `width` is the largest size the asset is ever displayed at (times a 2x
 * allowance for retina). Anything above that is downloaded and thrown away.
 */
const TARGETS = [
  { file: "public/favicon.png", width: 96, note: "served raw as the browser favicon" },
  { file: "public/apple-touch-icon.png", width: 180, note: "served raw to iOS" },
  { file: "app/icon.png", width: 256, note: "served raw at /icon.png" },
  { file: "public/logo.png", width: 256, note: "rendered at up to 72px" },
  { file: "public/icons/whatsapp.png", width: 128, note: "floating action icon" },
  { file: "public/icons/instagram.png", width: 128, note: "social icon" },
  { file: "public/icons/facebook.png", width: 128, note: "social icon" },
  { file: "public/hero/raksha-bandhan-2026.png", width: 1920, note: "hero art" },
  { file: "public/hero/all-occasion-gifting.png", width: 1920, note: "hero art" }
];

function kb(bytes) {
  return Math.round(bytes / 1024);
}

async function compress(target) {
  const absolute = path.join(projectRoot, target.file);
  if (!existsSync(absolute)) return { ...target, skipped: "missing" };

  const before = (await stat(absolute)).size;
  const input = await readFile(absolute);
  const meta = await sharp(input).metadata();

  const pipeline = sharp(input).resize({
    width: Math.min(target.width, meta.width || target.width),
    withoutEnlargement: true
  });

  // Palette quantisation is what actually shrinks these; they are flat-colour
  // logos and illustrations rather than photographs.
  const output = await pipeline
    .png({ quality: 82, compressionLevel: 9, palette: true, effort: 8 })
    .toBuffer();

  if (output.length >= before) {
    return { ...target, before, after: before, skipped: "already smaller" };
  }

  if (apply) {
    const backupPath = path.join(backupDir, target.file.replace(/[\\/]/g, "__"));
    await mkdir(backupDir, { recursive: true });
    if (!existsSync(backupPath)) await copyFile(absolute, backupPath);
    await writeFile(absolute, output);
  }

  return {
    ...target,
    before,
    after: output.length,
    dimensions: `${meta.width}x${meta.height}`
  };
}

const results = [];
for (const target of TARGETS) {
  results.push(await compress(target));
}

let totalBefore = 0;
let totalAfter = 0;

console.log(apply ? "Applying compression\n" : "Dry run - pass --write to apply\n");
for (const r of results) {
  if (r.skipped) {
    console.log(`  SKIP  ${r.file} (${r.skipped})`);
    if (r.before) {
      totalBefore += r.before;
      totalAfter += r.before;
    }
    continue;
  }
  totalBefore += r.before;
  totalAfter += r.after;
  const saved = Math.round((1 - r.after / r.before) * 100);
  console.log(`  ${String(kb(r.before)).padStart(5)} KB -> ${String(kb(r.after)).padStart(5)} KB  (-${saved}%)  ${r.file}`);
}

console.log(`\n  Total: ${kb(totalBefore)} KB -> ${kb(totalAfter)} KB (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
if (apply) console.log(`  Originals backed up to .original-assets/`);
