import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MAX_BYTES = 300 * 1024; // 300 KB
const ALLOWED_EXT = ['.webp'];

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

// Ensure origin/main is available (CI checkout may already have it)
try {
  run('git rev-parse --verify origin/main');
} catch (e) {
  try {
    console.log('Fetching origin/main...');
    run('git fetch origin main');
  } catch (err) {
    console.warn('Could not fetch origin/main (non-fatal).');
  }
}

let diff = '';
try {
  diff = run('git diff --name-only origin/main...HEAD');
} catch (e) {
  try {
    // fallback: compare with main branch ref
    diff = run('git diff --name-only origin/main..HEAD');
  } catch (err) {
    console.log('git diff failed, falling back to listing staged/modified files');
    try {
      diff = run('git status --porcelain | awk "{print $2}"');
    } catch (e2) {
      console.error('Unable to determine changed files.');
      process.exit(1);
    }
  }
}

const files = diff.split(/\r?\n/).filter(Boolean);
const imageFiles = files.filter(f => /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f));

if (imageFiles.length === 0) {
  console.log('No image files changed in this PR.');
  process.exit(0);
}

const violations = [];
for (const rel of imageFiles) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) {
    // deleted or renamed
    continue;
  }
  const ext = path.extname(p).toLowerCase();
  const size = fs.statSync(p).size;

  if (!ALLOWED_EXT.includes(ext)) {
    violations.push({ file: rel, reason: `unsupported extension ${ext}` });
    continue;
  }

  if (size > MAX_BYTES) {
    violations.push({ file: rel, reason: `size ${Math.round(size/1024)} KB > ${Math.round(MAX_BYTES/1024)} KB` });
  }
}

if (violations.length > 0) {
  console.error('\nImage optimization check failed. The following new/modified image files violate the project policy:');
  for (const v of violations) {
    console.error(` - ${v.file}: ${v.reason}`);
  }
  console.error('\nPolicy: only .webp images are allowed in PRs and each must be <= 300 KB.');
  console.error('Run `node scripts/compress-static-assets.mjs` or use the admin upload path which auto-compresses to WebP before committing.');
  process.exit(1);
}

console.log('All changed images are optimized (webp, <= 300 KB).');
process.exit(0);
