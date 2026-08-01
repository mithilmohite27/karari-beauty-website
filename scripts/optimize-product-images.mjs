import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const auditPath = path.join(rootDir, "reports", "product-image-audit.json");
const reportPath = path.join(rootDir, "reports", "image-optimization-report.md");
const outputDir = path.join(rootDir, "optimized-images");

const maxLongestEdge = 1200;
const jpegQuality = 80;
const webpQuality = 80;
const meaningfulWebpReduction = 0.05;
const requestTimeoutMs = 20000;

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return "Unknown";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function percentReduction(before, after) {
  if (!before || !after) return 0;
  return ((before - after) / before) * 100;
}

function safeFileName(name, fallback = "karari-product-image") {
  const parsed = path.parse(String(name || fallback));
  const base = (parsed.name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${base}${ext}`;
}

function getSourceFileName(url) {
  if (!url) return "karari-product-image";

  try {
    const pathname = url.startsWith("/") ? url : new URL(url).pathname;
    return decodeURIComponent(path.basename(pathname)) || "karari-product-image";
  } catch {
    return "karari-product-image";
  }
}

function uniqueOutputName(url, originalFileName, outputExt) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  const safe = safeFileName(originalFileName);
  const parsed = path.parse(safe);
  return `${parsed.name}-${hash}.${outputExt}`;
}

function isLocalPublicUrl(url) {
  return typeof url === "string" && url.startsWith("/");
}

async function readSourceBuffer(url) {
  if (isLocalPublicUrl(url)) {
    const localPath = path.join(rootDir, "public", url.replace(/^\/+/, ""));
    return fs.readFile(localPath);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "KarariBeautyLocalImageOptimizer/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

function resizeOptions(metadata) {
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  const longest = Math.max(width, height);

  if (!longest || longest <= maxLongestEdge) return {};
  if (width >= height) return { width: maxLongestEdge, withoutEnlargement: true };
  return { height: maxLongestEdge, withoutEnlargement: true };
}

function getOutputPlan(metadata) {
  const format = String(metadata.format || "").toLowerCase();
  const hasTransparency = Boolean(metadata.hasAlpha);

  if (["jpeg", "jpg"].includes(format)) {
    return {
      outputFormat: "webp",
      reason: "JPEG converted to WebP quality 80.",
      shouldOptimize: true,
      options: { quality: jpegQuality }
    };
  }

  if (format === "png") {
    return {
      outputFormat: "webp",
      reason: hasTransparency
        ? "PNG converted to WebP while preserving alpha transparency."
        : "PNG converted to WebP quality 80.",
      shouldOptimize: true,
      options: { quality: webpQuality, alphaQuality: 90 }
    };
  }

  if (format === "webp") {
    return {
      outputFormat: "webp",
      reason: "WebP recompressed only if reduction is meaningful.",
      shouldOptimize: true,
      options: { quality: webpQuality, alphaQuality: hasTransparency ? 90 : undefined }
    };
  }

  return {
    outputFormat: "",
    reason: `Unsupported source format: ${format || "unknown"}.`,
    shouldOptimize: false,
    options: {}
  };
}

function validateOptimizedImage(originalMetadata, optimizedMetadata) {
  const issues = [];
  const originalRatio = Number(originalMetadata.width || 0) / Number(originalMetadata.height || 1);
  const optimizedRatio = Number(optimizedMetadata.width || 0) / Number(optimizedMetadata.height || 1);

  if (Math.abs(originalRatio - optimizedRatio) > 0.01) {
    issues.push("Aspect ratio changed.");
  }

  if (originalMetadata.hasAlpha && !optimizedMetadata.hasAlpha) {
    issues.push("Transparency was not preserved.");
  }

  if (Number(optimizedMetadata.width || 0) > Number(originalMetadata.width || 0) || Number(optimizedMetadata.height || 0) > Number(originalMetadata.height || 0)) {
    issues.push("Image was upscaled.");
  }

  return issues;
}

function dedupeOversizedRecords(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    if (!record?.isOversized || !record.url || seen.has(record.url)) return false;
    seen.add(record.url);
    return true;
  });
}

async function optimizeOne(record) {
  const originalFileName = getSourceFileName(record.url);
  const extension = String(record.extension || path.extname(originalFileName).replace(".", "")).toLowerCase();

  try {
    const inputBuffer = await readSourceBuffer(record.url);
    const originalMetadata = await sharp(inputBuffer).metadata();
    const plan = getOutputPlan(originalMetadata);
    const originalSize = inputBuffer.length;

    if (!plan.shouldOptimize) {
      return {
        ...record,
        originalFileName,
        originalFormat: originalMetadata.format || extension || "unknown",
        originalSize,
        optimizedFileName: "",
        optimizedFormat: "",
        optimizedSize: 0,
        originalDimensions: `${originalMetadata.width || "?"}x${originalMetadata.height || "?"}`,
        optimizedDimensions: "",
        transparency: originalMetadata.hasAlpha ? "Yes" : "No",
        reductionPercent: 0,
        status: "Skipped",
        reason: plan.reason,
        manualReview: "No"
      };
    }

    const outputFileName = uniqueOutputName(record.url, originalFileName, plan.outputFormat);
    const outputPath = path.join(outputDir, outputFileName);

    try {
      await fs.access(outputPath);
      const existing = await fs.readFile(outputPath);
      const optimizedMetadata = await sharp(existing).metadata();
      const validationIssues = validateOptimizedImage(originalMetadata, optimizedMetadata);

      return {
        ...record,
        originalFileName,
        originalFormat: originalMetadata.format || extension || "unknown",
        originalSize,
        optimizedFileName: outputFileName,
        optimizedFormat: optimizedMetadata.format || plan.outputFormat,
        optimizedSize: existing.length,
        originalDimensions: `${originalMetadata.width || "?"}x${originalMetadata.height || "?"}`,
        optimizedDimensions: `${optimizedMetadata.width || "?"}x${optimizedMetadata.height || "?"}`,
        transparency: originalMetadata.hasAlpha ? "Yes" : "No",
        reductionPercent: percentReduction(originalSize, existing.length),
        status: validationIssues.length ? "Manual review" : "Already exists",
        reason: validationIssues.join(" ") || "Optimized copy already exists; original was not overwritten.",
        manualReview: validationIssues.length ? "Yes" : "No"
      };
    } catch {
      // No existing optimized copy. Continue and write a new local output.
    }

    let pipeline = sharp(inputBuffer, { animated: false }).rotate();
    const resize = resizeOptions(originalMetadata);
    if (Object.keys(resize).length) pipeline = pipeline.resize(resize);
    pipeline = pipeline.webp(plan.options);

    const optimizedBuffer = await pipeline.toBuffer();
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();

    if (originalMetadata.format === "webp") {
      const reduction = percentReduction(originalSize, optimizedBuffer.length) / 100;
      if (reduction < meaningfulWebpReduction) {
        return {
          ...record,
          originalFileName,
          originalFormat: originalMetadata.format || "webp",
          originalSize,
          optimizedFileName: "",
          optimizedFormat: "",
          optimizedSize: 0,
          originalDimensions: `${originalMetadata.width || "?"}x${originalMetadata.height || "?"}`,
          optimizedDimensions: "",
          transparency: originalMetadata.hasAlpha ? "Yes" : "No",
          reductionPercent: 0,
          status: "Skipped",
          reason: `WebP reduction was below ${Math.round(meaningfulWebpReduction * 100)}%.`,
          manualReview: "No"
        };
      }
    }

    const validationIssues = validateOptimizedImage(originalMetadata, optimizedMetadata);
    await fs.writeFile(outputPath, optimizedBuffer, { flag: "wx" });

    return {
      ...record,
      originalFileName,
      originalFormat: originalMetadata.format || extension || "unknown",
      originalSize,
      optimizedFileName: outputFileName,
      optimizedFormat: optimizedMetadata.format || plan.outputFormat,
      optimizedSize: optimizedBuffer.length,
      originalDimensions: `${originalMetadata.width || "?"}x${originalMetadata.height || "?"}`,
      optimizedDimensions: `${optimizedMetadata.width || "?"}x${optimizedMetadata.height || "?"}`,
      transparency: originalMetadata.hasAlpha ? "Yes" : "No",
      reductionPercent: percentReduction(originalSize, optimizedBuffer.length),
      status: validationIssues.length ? "Manual review" : "Optimized",
      reason: validationIssues.join(" ") || plan.reason,
      manualReview: validationIssues.length ? "Yes" : "No"
    };
  } catch (error) {
    return {
      ...record,
      originalFileName,
      originalFormat: extension || "unknown",
      originalSize: Number(record.contentLength) || 0,
      optimizedFileName: "",
      optimizedFormat: "",
      optimizedSize: 0,
      originalDimensions: `${record.width || "?"}x${record.height || "?"}`,
      optimizedDimensions: "",
      transparency: "Unknown",
      reductionPercent: 0,
      status: "Skipped",
      reason: error?.message || String(error),
      manualReview: "Yes"
    };
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function markdownTableRow(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")} |`;
}

function buildReport(results, summary) {
  const rows = results.map((item) => markdownTableRow([
    item.originalFileName,
    item.originalFormat,
    formatBytes(item.originalSize),
    item.optimizedFormat || "-",
    item.optimizedSize ? formatBytes(item.optimizedSize) : "-",
    item.optimizedSize ? `${item.reductionPercent.toFixed(1)}%` : "-",
    item.originalDimensions,
    item.optimizedDimensions || "-",
    item.transparency,
    item.status,
    item.reason
  ]));

  return [
    "# Image Optimization Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This report contains local optimized copies only. No Supabase files, product records, production URLs, frontend components, checkout, authentication, SEO, or database schema were changed.",
    "",
    "## Summary",
    "",
    `- Total oversized unique images reviewed: ${summary.totalReviewed}`,
    `- Total images optimized: ${summary.optimizedCount}`,
    `- Total images skipped: ${summary.skippedCount}`,
    `- Total size before: ${formatBytes(summary.totalBefore)}`,
    `- Total size after: ${formatBytes(summary.totalAfter)}`,
    `- Average reduction: ${summary.averageReduction.toFixed(1)}%`,
    `- Largest reduction: ${summary.largestReduction.toFixed(1)}%`,
    `- Smallest reduction: ${summary.smallestReduction.toFixed(1)}%`,
    `- Images needing manual review: ${summary.manualReviewCount}`,
    "",
    "## Output",
    "",
    "- Optimized copies are saved under `optimized-images/`.",
    "- Original filenames are preserved in readable form with a short URL hash suffix to avoid collisions.",
    "- All optimized outputs are review copies and should not be uploaded or mapped to products without Phase 2 approval.",
    "",
    "## Image Details",
    "",
    markdownTableRow([
      "Original Filename",
      "Original Format",
      "Original Filesize",
      "Optimized Format",
      "Optimized Filesize",
      "Reduction",
      "Original Dimensions",
      "Optimized Dimensions",
      "Transparency",
      "Status",
      "Reason"
    ]),
    markdownTableRow([
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---",
      "---"
    ]),
    ...rows
  ].join("\n") + "\n";
}

async function main() {
  const audit = JSON.parse(await fs.readFile(auditPath, "utf8"));
  const oversizedRecords = dedupeOversizedRecords(audit.records || []);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });

  const results = await mapWithConcurrency(oversizedRecords, 3, optimizeOne);
  const optimized = results.filter((item) => ["Optimized", "Already exists", "Manual review"].includes(item.status) && item.optimizedSize > 0);
  const skipped = results.filter((item) => item.optimizedSize <= 0);
  const reductions = optimized.map((item) => item.reductionPercent);
  const totalBefore = results.reduce((total, item) => total + (Number(item.originalSize) || 0), 0);
  const totalAfter = optimized.reduce((total, item) => total + (Number(item.optimizedSize) || 0), 0);
  const totalOptimizedBefore = optimized.reduce((total, item) => total + (Number(item.originalSize) || 0), 0);

  const summary = {
    totalReviewed: results.length,
    optimizedCount: optimized.length,
    skippedCount: skipped.length,
    totalBefore,
    totalAfter,
    averageReduction: reductions.length ? reductions.reduce((total, value) => total + value, 0) / reductions.length : 0,
    largestReduction: reductions.length ? Math.max(...reductions) : 0,
    smallestReduction: reductions.length ? Math.min(...reductions) : 0,
    manualReviewCount: results.filter((item) => item.manualReview === "Yes").length,
    totalOptimizedBefore
  };

  await fs.writeFile(reportPath, buildReport(results, summary));

  console.log(JSON.stringify({
    totalReviewed: summary.totalReviewed,
    optimized: summary.optimizedCount,
    skipped: summary.skippedCount,
    totalSizeBefore: formatBytes(summary.totalBefore),
    totalOptimizedSizeBefore: formatBytes(summary.totalOptimizedBefore),
    totalSizeAfter: formatBytes(summary.totalAfter),
    averageReduction: `${summary.averageReduction.toFixed(1)}%`,
    largestReduction: `${summary.largestReduction.toFixed(1)}%`,
    smallestReduction: `${summary.smallestReduction.toFixed(1)}%`,
    manualReview: summary.manualReviewCount,
    outputDir: "optimized-images/",
    report: "reports/image-optimization-report.md"
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
