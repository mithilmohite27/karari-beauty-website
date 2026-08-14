import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { tryProcessAndUpload } from "@/lib/images.mjs";

export const MEDIA_BUCKET = "product-images";
export const MEDIA_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MEDIA_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class MediaAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "MediaAdminError";
    this.status = status;
  }
}

function getAdminClientOrThrow() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new MediaAdminError("Supabase setup required", 503);
  return supabase;
}

export function createSafeMediaFileName(name, fallback = "karari-image") {
  const parts = String(name || fallback).split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const base = parts.join(".") || fallback;
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

function normalizeStoragePath(path) {
  return String(path || "").replace(/^product-images\//, "").replace(/^\/+/, "");
}

export function validateMediaImageFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new MediaAdminError("Image file is required.");
  }

  if (!MEDIA_ALLOWED_TYPES.has(file.type)) {
    throw new MediaAdminError("Only JPG, PNG and WebP images are allowed.");
  }

  if (file.size > MEDIA_MAX_FILE_SIZE) {
    throw new MediaAdminError("Image must be 5MB or smaller.");
  }
}

function mapFile(supabase, path, file) {
  const storagePath = `${path ? `${path}/` : ""}${file.name}`;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  return {
    id: encodeURIComponent(storagePath),
    name: file.name,
    storagePath,
    publicUrl: data.publicUrl,
    createdAt: file.created_at || file.updated_at || "",
    updatedAt: file.updated_at || "",
    size: file.metadata?.size || 0,
    contentType: file.metadata?.mimetype || file.metadata?.mimeType || ""
  };
}

async function listFolder(supabase, path = "") {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(path, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "updated_at", order: "desc" }
  });

  if (error) throw new MediaAdminError("Unable to load media library.", 500);

  const files = [];

  for (const item of data || []) {
    const itemPath = path ? `${path}/${item.name}` : item.name;
    const isFolder = !item.metadata || item.metadata.size === undefined;

    if (isFolder) {
      files.push(...await listFolder(supabase, itemPath));
    } else {
      files.push(mapFile(supabase, path, item));
    }
  }

  return files;
}

export async function getAdminMedia(options = {}) {
  const supabase = getAdminClientOrThrow();
  const search = String(options.search || "").trim().toLowerCase();
  const sort = String(options.sort || "newest");
  let files = await listFolder(supabase);

  if (search) {
    files = files.filter((file) => [file.name, file.storagePath].join(" ").toLowerCase().includes(search));
  }

  files.sort((a, b) => {
    if (sort === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return {
    data: files,
    mode: "supabase"
  };
}

export async function uploadAdminMedia(file) {
  const storagePath = `karari-products/${Date.now()}-${createSafeMediaFileName(file.name)}`;
  return uploadMediaFile({ file, storagePath });
}

/**
 * Widest a stored image ever needs to be.
 *
 * Product and category art is displayed at 1200px at most, so 1600 covers a 2x
 * display with headroom. Camera and phone originals arrive at 3000-4000px, and
 * every one of those pixels is downloaded and thrown away by the browser.
 */
const MAX_STORED_IMAGE_WIDTH = 1600;
const STORED_IMAGE_QUALITY = 82;

/**
 * Compress an upload before it reaches storage.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 * Uploads were stored byte-for-byte as the client selected them - 2-3 MB PNGs
 * straight from a phone. Every render then depended on a Vercel image
 * transformation to become deliverable, and that allowance is metered. When it
 * ran out the optimizer returned HTTP 402 and images across the site rendered
 * blank.
 *
 * Compressing here removes the dependency entirely: a stored image is already
 * the size it will be displayed at, so it can be served straight from
 * Supabase's CDN and consumes no transformations. The quota stops being
 * something that can take the catalogue down.
 *
 * Failure is non-fatal. If sharp cannot read the file - an exotic format, a
 * corrupt upload - the original is stored unchanged. A slightly heavy image is
 * a much better outcome than an admin who cannot add a product.
 */
async function compressForStorage(file) {
  const original = Buffer.from(await file.arrayBuffer());

  try {
    const { default: sharp } = await import("sharp");
    const image = sharp(original);
    const meta = await image.metadata();

    const optimized = await image
      // Phone photos carry orientation in EXIF; without this they store rotated.
      .rotate()
      .resize({
        width: Math.min(MAX_STORED_IMAGE_WIDTH, meta.width || MAX_STORED_IMAGE_WIDTH),
        withoutEnlargement: true
      })
      .webp({ quality: STORED_IMAGE_QUALITY })
      .toBuffer();

    // Only take the compressed version if it actually helped. An already-small
    // WebP can come out larger after a re-encode.
    if (optimized.length >= original.length) {
      return { buffer: original, contentType: file.type, extension: null };
    }

    return { buffer: optimized, contentType: "image/webp", extension: "webp" };
  } catch (error) {
    console.warn("[karari-media] Could not compress upload, storing original.", error?.message || error);
    return { buffer: original, contentType: file.type, extension: null };
  }
}

export async function uploadMediaFile({ file, storagePath, errorMessage = "Unable to upload image." }) {
  const supabase = getAdminClientOrThrow();
  validateMediaImageFile(file);

  const { buffer, contentType, extension } = await compressForStorage(file);
  const finalPath = extension ? storagePath.replace(/\.[^./]+$/, "") + `.${extension}` : storagePath;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(finalPath, buffer, {
    contentType,
    // Immutable: filenames are timestamp-prefixed, so a stored object is never
    // replaced. Lets the CDN hold it indefinitely.
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw new MediaAdminError(errorMessage, 500);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(finalPath);

  // Generate the responsive R2 variants from the same buffer we just stored.
  //
  // Order matters: Supabase is written first and is the source of truth. If R2
  // is unconfigured or fails, tryProcessAndUpload returns null, the upload
  // still succeeds, and the image renders from its Supabase URL exactly as it
  // does today. The backfill script can generate the variants later.
  const variants = await tryProcessAndUpload(buffer, `media/${finalPath.replace(/\.[^./]+$/, "")}`);

  return {
    id: encodeURIComponent(finalPath),
    name: finalPath.split("/").pop(),
    storagePath: finalPath,
    publicUrl: data.publicUrl,
    createdAt: new Date().toISOString(),
    size: buffer.length,
    contentType,
    variants: variants || {}
  };
}

export async function deleteAdminMedia(path) {
  const supabase = getAdminClientOrThrow();
  const storagePath = normalizeStoragePath(path);

  if (!storagePath) throw new MediaAdminError("Image path is required.");

  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
  if (error) throw new MediaAdminError("Unable to delete image.", 500);

  return {
    ok: true,
    message: "Image deleted"
  };
}
