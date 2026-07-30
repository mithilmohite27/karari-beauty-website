import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { products as localProducts } from "../data/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const reportsDir = path.join(rootDir, "reports");
const fallbackImage = "/images/fallbacks/karari-product-fallback.svg";
const slowWarningMs = 1500;
const severeSlowMs = 3000;
const oversizedBytes = 500 * 1024;
const severeOversizedBytes = 1.5 * 1024 * 1024;
const excessiveDimension = 2000;
const requestTimeoutMs = 12000;

function parseEnvFile(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const rawValue = rest.join("=").trim();
    env[key.trim()] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function loadLocalEnv() {
  const candidates = [".env.local", ".env"];
  const merged = {};

  for (const fileName of candidates) {
    try {
      const content = await fs.readFile(path.join(rootDir, fileName), "utf8");
      Object.assign(merged, parseEnvFile(content));
    } catch {
      // Optional local files are intentionally ignored for this audit.
    }
  }

  return {
    ...merged,
    ...process.env
  };
}

function isValidImageUrl(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || ["undefined", "null", "false"].includes(trimmed.toLowerCase())) return false;
  return trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function getImageValue(candidate) {
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate.trim();
  return String(candidate.image || candidate.imageUrl || candidate.image_url || candidate.url || candidate.thumbnail || "").trim();
}

function getExtension(url) {
  try {
    const pathname = url.startsWith("/") ? url : new URL(url).pathname;
    return path.extname(pathname).replace(".", "").toLowerCase();
  } catch {
    return "";
  }
}

function parseUrlDetails(url) {
  if (!url) {
    return {
      malformed: true,
      hostname: "",
      objectPath: ""
    };
  }

  if (url.startsWith("/")) {
    return {
      malformed: false,
      hostname: "local",
      objectPath: url
    };
  }

  try {
    const parsed = new URL(url);
    return {
      malformed: false,
      hostname: parsed.hostname,
      objectPath: decodeURIComponent(parsed.pathname)
    };
  } catch {
    return {
      malformed: true,
      hostname: "",
      objectPath: ""
    };
  }
}

function normalizeGallery(row, productImage) {
  const sourceImages = Array.isArray(row.product_images)
    ? row.product_images
    : Array.isArray(row.galleryImages)
      ? row.galleryImages
      : Array.isArray(row.images)
        ? row.images
        : [];

  const mappedImages = sourceImages
    .map((image, index) => {
      const imageUrl = getImageValue(image);
      if (!imageUrl) return null;
      return {
        id: image.id || `${row.id || row.slug || "product"}-image-${index}`,
        imageUrl,
        sourceField: Array.isArray(row.product_images) ? `product_images[${index}].image_url` : Array.isArray(row.galleryImages) ? `galleryImages[${index}].imageUrl` : `images[${index}]`,
        altText: image.alt_text || image.altText || row.name || "Product image",
        isMain: Boolean(image.is_main ?? image.isMain),
        sortOrder: Number(image.sort_order ?? image.sortOrder ?? index),
        createdAt: image.created_at || image.createdAt || ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder || String(a.createdAt).localeCompare(String(b.createdAt)));

  const gallery = [];
  const seenUrls = new Set();
  const addImage = (image) => {
    const normalizedUrl = String(image?.imageUrl || "").trim();
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) return;
    seenUrls.add(normalizedUrl);
    gallery.push(image);
  };

  const selectedMain = mappedImages.find((image) => image.isMain && image.imageUrl === productImage)
    || mappedImages.find((image) => image.imageUrl === productImage)
    || mappedImages.find((image) => image.isMain);

  if (selectedMain) addImage({ ...selectedMain, isMain: true });
  if (productImage) {
    addImage({
      id: `${row.id || row.slug || "product"}-main`,
      imageUrl: productImage,
      sourceField: row.image_url ? "image_url" : row.image ? "image" : "primary",
      altText: row.name || "Product image",
      isMain: true,
      sortOrder: -1,
      createdAt: ""
    });
  }
  mappedImages.forEach(addImage);

  return gallery;
}

function mapSupabaseProduct(row) {
  const productImage = row.image_url || row.image || "";
  const galleryImages = normalizeGallery(row, productImage);
  const mainImage = galleryImages[0]?.imageUrl || productImage;

  return {
    id: row.id || row.slug,
    slug: row.slug,
    sku: row.sku || "",
    name: row.name,
    image: mainImage,
    imageUrl: row.image_url || "",
    thumbnail: row.thumbnail || "",
    galleryImages,
    rawSource: "supabase"
  };
}

async function loadProducts(env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      mode: "local",
      products: localProducts.map((product) => ({ ...product, rawSource: "local" }))
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, sku, name, image_url, category_slug, is_active, product_images(id, image_url, storage_path, alt_text, is_main, sort_order, created_at)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return {
      mode: "supabase",
      products: (data || []).map(mapSupabaseProduct)
    };
  } catch (error) {
    return {
      mode: "local-fallback",
      loadError: error?.message || String(error),
      products: localProducts.map((product) => ({ ...product, rawSource: "local" }))
    };
  }
}

function collectImageCandidates(product) {
  const candidates = [
    { sourceField: "mainImage", url: product.mainImage },
    { sourceField: "image", url: product.image },
    { sourceField: "imageUrl", url: product.imageUrl },
    { sourceField: "thumbnail", url: product.thumbnail }
  ];

  if (Array.isArray(product.images)) {
    product.images.forEach((image, index) => {
      candidates.push({ sourceField: `images[${index}]`, url: getImageValue(image) });
    });
  }

  if (Array.isArray(product.galleryImages)) {
    product.galleryImages.forEach((image, index) => {
      candidates.push({ sourceField: image.sourceField || `galleryImages[${index}].imageUrl`, url: getImageValue(image) });
    });
  }

  const seen = new Set();
  return candidates
    .map((candidate) => ({ ...candidate, url: String(candidate.url || "").trim() }))
    .filter((candidate) => {
      if (!candidate.url || seen.has(`${candidate.sourceField}:${candidate.url}`)) return false;
      seen.add(`${candidate.sourceField}:${candidate.url}`);
      return true;
    });
}

function toFetchableUrl(url) {
  if (!url || !url.startsWith("/")) return url;
  return `file://${path.join(rootDir, "public", url).replaceAll("\\", "/")}`;
}

async function readLocalImage(localUrl) {
  const localPath = path.join(rootDir, "public", localUrl.replace(/^\/+/, ""));
  const start = performance.now();
  const buffer = await fs.readFile(localPath);
  const durationMs = Math.round(performance.now() - start);
  let metadata = {};
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    metadata = {};
  }
  return {
    httpStatus: 200,
    contentType: metadata.format ? `image/${metadata.format}` : "",
    contentLength: buffer.length,
    durationMs,
    width: metadata.width || null,
    height: metadata.height || null,
    cacheControl: "",
    error: ""
  };
}

async function fetchRemoteImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const start = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "KarariBeautyImageAudit/1.0"
      }
    });
    const durationMs = Math.round(performance.now() - start);
    const contentType = response.headers.get("content-type") || "";
    const contentLengthHeader = response.headers.get("content-length");
    const cacheControl = response.headers.get("cache-control") || "";
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    let width = null;
    let height = null;

    if (response.ok && contentType.startsWith("image/")) {
      try {
        const buffer = Buffer.from(await response.arrayBuffer());
        width = (await sharp(buffer).metadata()).width || null;
        height = (await sharp(buffer).metadata()).height || null;
        return {
          httpStatus: response.status,
          contentType,
          contentLength: contentLength || buffer.length,
          durationMs,
          width,
          height,
          cacheControl,
          error: ""
        };
      } catch (error) {
        return {
          httpStatus: response.status,
          contentType,
          contentLength,
          durationMs,
          width,
          height,
          cacheControl,
          error: `metadata_failed:${error?.message || error}`
        };
      }
    }

    return {
      httpStatus: response.status,
      contentType,
      contentLength,
      durationMs,
      width,
      height,
      cacheControl,
      error: response.ok ? "" : `HTTP_${response.status}`
    };
  } catch (error) {
    return {
      httpStatus: null,
      contentType: "",
      contentLength: null,
      durationMs: Math.round(performance.now() - start),
      width: null,
      height: null,
      cacheControl: "",
      error: error?.name === "AbortError" ? "TIMEOUT" : error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeUrl(url) {
  if (!isValidImageUrl(url)) {
    return {
      httpStatus: null,
      contentType: "",
      contentLength: null,
      durationMs: null,
      width: null,
      height: null,
      cacheControl: "",
      error: "MALFORMED_URL"
    };
  }

  if (url.startsWith("/")) {
    try {
      return await readLocalImage(url);
    } catch (error) {
      return {
        httpStatus: null,
        contentType: "",
        contentLength: null,
        durationMs: null,
        width: null,
        height: null,
        cacheControl: "",
        error: error?.code === "ENOENT" ? "LOCAL_FILE_MISSING" : error?.message || String(error)
      };
    }
  }

  return fetchRemoteImage(url);
}

function toCsvValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "unknown";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function summarize(records, products, mode, loadError) {
  const uniqueUrls = new Set(records.map((record) => record.url).filter(Boolean));
  const uniqueCount = (items) => new Set(items.map((item) => item.url).filter(Boolean)).size;
  const urlCounts = records.reduce((counts, record) => {
    if (!record.url) return counts;
    counts[record.url] = (counts[record.url] || 0) + 1;
    return counts;
  }, {});
  const duplicateUrls = Object.entries(urlCounts).filter(([, count]) => count > 1);
  const broken = records.filter((record) => record.isBroken);
  const slow = records.filter((record) => record.isSlow);
  const severeSlow = records.filter((record) => record.isSevereSlow);
  const oversized = records.filter((record) => record.isOversized);
  const severeOversized = records.filter((record) => record.isSevereOversized);
  const excessiveDimensions = records.filter((record) => record.hasExcessiveDimensions);
  const tempPath = records.filter((record) => record.isTempPath);
  const malformed = records.filter((record) => record.isMalformed);
  const missingPrimary = products.filter((product) => !isValidImageUrl(product.image));
  const supabaseRecords = records.filter((record) => record.hostname.endsWith(".supabase.co"));

  return {
    generatedAt: new Date().toISOString(),
    dataMode: mode,
    dataLoadError: loadError || "",
    thresholds: {
      slowWarningMs,
      severeSlowMs,
      oversizedBytes,
      severeOversizedBytes,
      excessiveDimension
    },
    totals: {
      products: products.length,
      imageUrls: records.length,
      uniqueImageUrls: uniqueUrls.size,
      brokenUrls: broken.length,
      uniqueBrokenUrls: uniqueCount(broken),
      slowUrls: slow.length,
      uniqueSlowUrls: uniqueCount(slow),
      severeSlowUrls: severeSlow.length,
      uniqueSevereSlowUrls: uniqueCount(severeSlow),
      oversizedImages: oversized.length,
      uniqueOversizedImages: uniqueCount(oversized),
      severeOversizedImages: severeOversized.length,
      uniqueSevereOversizedImages: uniqueCount(severeOversized),
      excessiveDimensionImages: excessiveDimensions.length,
      uniqueExcessiveDimensionImages: uniqueCount(excessiveDimensions),
      tempPathImages: tempPath.length,
      uniqueTempPathImages: uniqueCount(tempPath),
      duplicateUrlGroups: duplicateUrls.length,
      duplicateUrlUses: duplicateUrls.reduce((total, [, count]) => total + count, 0),
      missingPrimaryImages: missingPrimary.length,
      malformedUrls: malformed.length,
      supabaseUrls: supabaseRecords.length
    },
    duplicateUrls: duplicateUrls.map(([url, count]) => ({ url, count })),
    brokenUrls: broken.map(({ productId, slug, sku, name, sourceField, url, httpStatus, error }) => ({ productId, slug, sku, name, sourceField, url, httpStatus, error })),
    tempPathUrls: tempPath.map(({ productId, slug, sku, name, sourceField, url, objectPath }) => ({ productId, slug, sku, name, sourceField, url, objectPath })),
    slowUrls: slow.map(({ productId, slug, sku, name, sourceField, url, durationMs }) => ({ productId, slug, sku, name, sourceField, url, durationMs })),
    oversizedUrls: oversized.map(({ productId, slug, sku, name, sourceField, url, contentLength, width, height }) => ({ productId, slug, sku, name, sourceField, url, contentLength, width, height })),
    missingPrimaryImages: missingPrimary.map(({ id, slug, sku, name }) => ({ productId: id, slug, sku, name }))
  };
}

function buildMarkdown(summary) {
  const lines = [
    "# Product Image Audit Summary",
    "",
    `Generated: ${summary.generatedAt}`,
    `Data source: ${summary.dataMode}`,
    summary.dataLoadError ? `Data source warning: ${summary.dataLoadError}` : "",
    "",
    "## Totals",
    "",
    `- Total products: ${summary.totals.products}`,
    `- Total image URLs: ${summary.totals.imageUrls}`,
    `- Unique image URLs: ${summary.totals.uniqueImageUrls}`,
    `- Broken URLs: ${summary.totals.brokenUrls}`,
    `- Unique broken URLs: ${summary.totals.uniqueBrokenUrls}`,
    `- Slow URLs over ${slowWarningMs}ms: ${summary.totals.slowUrls}`,
    `- Unique slow URLs over ${slowWarningMs}ms: ${summary.totals.uniqueSlowUrls}`,
    `- Severe slow URLs over ${severeSlowMs}ms: ${summary.totals.severeSlowUrls}`,
    `- Oversized images over ${formatBytes(oversizedBytes)}: ${summary.totals.oversizedImages}`,
    `- Unique oversized images over ${formatBytes(oversizedBytes)}: ${summary.totals.uniqueOversizedImages}`,
    `- Severe oversized images over ${formatBytes(severeOversizedBytes)}: ${summary.totals.severeOversizedImages}`,
    `- Excessive dimensions over ${excessiveDimension}px: ${summary.totals.excessiveDimensionImages}`,
    `- Temp-path images: ${summary.totals.tempPathImages}`,
    `- Unique temp-path images: ${summary.totals.uniqueTempPathImages}`,
    `- Duplicate URL groups: ${summary.totals.duplicateUrlGroups}`,
    `- Missing primary images: ${summary.totals.missingPrimaryImages}`,
    `- Malformed URLs: ${summary.totals.malformedUrls}`,
    `- Supabase URLs: ${summary.totals.supabaseUrls}`,
    "",
    "## Broken URLs",
    "",
    summary.brokenUrls.length
      ? summary.brokenUrls.map((item) => `- ${item.name} (${item.sourceField}): ${item.httpStatus || item.error} - ${item.url}`).join("\n")
      : "- None",
    "",
    "## Slow URLs",
    "",
    summary.slowUrls.length
      ? summary.slowUrls.map((item) => `- ${item.durationMs}ms - ${item.name} (${item.sourceField}): ${item.url}`).join("\n")
      : "- None",
    "",
    "## Oversized URLs",
    "",
    summary.oversizedUrls.length
      ? summary.oversizedUrls.map((item) => `- ${formatBytes(item.contentLength)} ${item.width || "?"}x${item.height || "?"} - ${item.name} (${item.sourceField}): ${item.url}`).join("\n")
      : "- None",
    "",
    "## Temp Path URLs",
    "",
    summary.tempPathUrls.length
      ? summary.tempPathUrls.map((item) => `- ${item.name} (${item.sourceField}): ${item.objectPath}`).join("\n")
      : "- None",
    "",
    "## Recommendations",
    "",
    "- Keep Supabase-hosted product images bypassing Next.js optimization until a thumbnail/variant pipeline exists.",
    "- Move any `product-images/temp/` records into stable product folders before deleting temporary objects.",
    "- Standardize product image resolution through one shared helper before adding currency or larger storefront changes.",
    "- Add upload-time WebP conversion and card/detail thumbnails to reduce direct image payload size."
  ].filter(Boolean);

  return `${lines.join("\n")}\n`;
}

async function main() {
  await fs.mkdir(reportsDir, { recursive: true });
  const env = await loadLocalEnv();
  const { products, mode, loadError } = await loadProducts(env);
  const records = [];
  const probeCache = new Map();

  for (const product of products) {
    const candidates = collectImageCandidates(product);

    if (!candidates.length) {
      const details = parseUrlDetails("");
      records.push({
        productId: product.id || "",
        slug: product.slug || "",
        sku: product.sku || "",
        name: product.name || "",
        sourceField: "missing",
        url: "",
        fetchableUrl: "",
        hostname: details.hostname,
        objectPath: details.objectPath,
        extension: "",
        isTempPath: false,
        isMalformed: true,
        isDuplicate: false,
        httpStatus: null,
        contentType: "",
        contentLength: null,
        durationMs: null,
        width: null,
        height: null,
        cacheControl: "",
        isBroken: true,
        isSlow: false,
        isSevereSlow: false,
        isOversized: false,
        isSevereOversized: false,
        hasExcessiveDimensions: false,
        error: "MISSING_IMAGE"
      });
      continue;
    }

    for (const candidate of candidates) {
      const url = candidate.url;
      const details = parseUrlDetails(url);
      const fetchableUrl = toFetchableUrl(url);
      const probe = probeCache.has(url) ? probeCache.get(url) : await probeUrl(url);
      probeCache.set(url, probe);

      records.push({
        productId: product.id || "",
        slug: product.slug || "",
        sku: product.sku || "",
        name: product.name || "",
        sourceField: candidate.sourceField,
        url,
        fetchableUrl,
        hostname: details.hostname,
        objectPath: details.objectPath,
        extension: getExtension(url),
        isTempPath: /\/temp\//i.test(details.objectPath),
        isMalformed: details.malformed || !isValidImageUrl(url),
        httpStatus: probe.httpStatus,
        contentType: probe.contentType,
        contentLength: probe.contentLength,
        durationMs: probe.durationMs,
        width: probe.width,
        height: probe.height,
        cacheControl: probe.cacheControl,
        isBroken: Boolean(probe.error && !probe.error.startsWith("metadata_failed")) || (probe.httpStatus !== 200 && probe.httpStatus !== null),
        isSlow: Number(probe.durationMs) > slowWarningMs,
        isSevereSlow: Number(probe.durationMs) > severeSlowMs,
        isOversized: Number(probe.contentLength) > oversizedBytes,
        isSevereOversized: Number(probe.contentLength) > severeOversizedBytes,
        hasExcessiveDimensions: Number(probe.width) > excessiveDimension || Number(probe.height) > excessiveDimension,
        error: probe.error
      });
    }
  }

  const urlCounts = records.reduce((counts, record) => {
    if (!record.url) return counts;
    counts[record.url] = (counts[record.url] || 0) + 1;
    return counts;
  }, {});

  records.forEach((record) => {
    record.isDuplicate = Boolean(record.url && urlCounts[record.url] > 1);
  });

  const summary = summarize(records, products, mode, loadError);
  const csvColumns = [
    "productId",
    "slug",
    "sku",
    "name",
    "sourceField",
    "url",
    "hostname",
    "objectPath",
    "extension",
    "isTempPath",
    "isMalformed",
    "isDuplicate",
    "httpStatus",
    "contentType",
    "contentLength",
    "durationMs",
    "width",
    "height",
    "cacheControl",
    "isBroken",
    "isSlow",
    "isSevereSlow",
    "isOversized",
    "isSevereOversized",
    "hasExcessiveDimensions",
    "error"
  ];
  const csv = [
    csvColumns.join(","),
    ...records.map((record) => csvColumns.map((column) => toCsvValue(record[column])).join(","))
  ].join("\n");

  await fs.writeFile(path.join(reportsDir, "product-image-audit.json"), JSON.stringify({ summary, records }, null, 2));
  await fs.writeFile(path.join(reportsDir, "product-image-audit.csv"), `${csv}\n`);
  await fs.writeFile(path.join(reportsDir, "product-image-audit-summary.md"), buildMarkdown(summary));

  console.log(JSON.stringify(summary.totals, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
