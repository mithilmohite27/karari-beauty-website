import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

export async function uploadMediaFile({ file, storagePath, errorMessage = "Unable to upload image." }) {
  const supabase = getAdminClientOrThrow();
  validateMediaImageFile(file);

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new MediaAdminError(errorMessage, 500);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  return {
    id: encodeURIComponent(storagePath),
    name: storagePath.split("/").pop(),
    storagePath,
    publicUrl: data.publicUrl,
    createdAt: new Date().toISOString(),
    size: file.size,
    contentType: file.type
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
