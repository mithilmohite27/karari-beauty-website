import { products as localProducts } from "@/data/products";
import { generateSlug } from "@/lib/productIdentifiers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function warnFallback(source, error) {
  console.warn(`[karari-data] ${source} Supabase read failed. Falling back to local data.`, error?.message || error);
}

function mapProduct(row) {
  return {
    id: row.id || row.slug,
    slug: row.slug,
    name: row.name,
    sku: row.sku || "",
    categoryId: row.category_id || "",
    category: row.category_name || "",
    categorySlug: row.category_slug || "",
    price: Number(row.price || 0),
    originalPrice: row.original_price === null ? undefined : Number(row.original_price || 0),
    discountLabel: row.discount_label || "",
    rating: row.rating === null ? undefined : String(row.rating),
    badge: row.badge || "",
    offer: row.offer || "",
    image: row.image_url || "",
    description: row.description || "",
    shortDescription: row.short_description || row.description || "",
    isFeatured: Boolean(row.is_featured),
    isActive: row.is_active !== false,
    stockStatus: row.stock_status || "in_stock",
    tags: row.tags || [],
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at
  };
}

const PRODUCT_STOCK_STATUSES = new Set(["in_stock", "low_stock", "out_of_stock", "made_to_order", "preorder"]);
const PRODUCT_MUTATION_FIELDS = new Set([
  "name",
  "slug",
  "sku",
  "category_id",
  "category_slug",
  "category_name",
  "description",
  "short_description",
  "price",
  "original_price",
  "discount_label",
  "rating",
  "badge",
  "offer",
  "image_url",
  "tags",
  "is_featured",
  "is_active",
  "stock_status",
  "sort_order"
]);

export class ProductAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ProductAdminError";
    this.status = status;
  }
}

function mapProductImage(row) {
  return {
    id: row.id,
    productId: row.product_id,
    imageUrl: row.image_url,
    storagePath: row.storage_path || "",
    altText: row.alt_text || "",
    isMain: Boolean(row.is_main),
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at
  };
}

function emptyToNull(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function parseOptionalNumber(value, fieldLabel) {
  const normalized = emptyToNull(value);
  if (normalized === undefined || normalized === null) return null;
  const numberValue = Number(normalized);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ProductAdminError(`${fieldLabel} must be a valid number greater than or equal to 0.`);
  }
  return numberValue;
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function normalizeAdminProductInput(input = {}, { partial = false } = {}) {
  const payload = {};

  for (const [key, value] of Object.entries(input)) {
    if (PRODUCT_MUTATION_FIELDS.has(key)) payload[key] = emptyToNull(value);
  }

  if (!partial || "name" in payload) {
    if (!payload.name) throw new ProductAdminError("Product name is required.");
    payload.name = String(payload.name).trim();
  }

  if (!partial || "slug" in payload) {
    const slug = generateSlug(payload.slug || payload.name);
    if (!slug) throw new ProductAdminError("Product slug is required.");
    payload.slug = slug;
  }

  if (!partial || "price" in payload) {
    if (payload.price === undefined || payload.price === null) throw new ProductAdminError("Product price is required.");
    payload.price = parseOptionalNumber(payload.price, "Product price");
  }

  if ("original_price" in payload) payload.original_price = parseOptionalNumber(payload.original_price, "Original price");
  if ("rating" in payload) {
    const rating = parseOptionalNumber(payload.rating, "Rating");
    if (rating !== null && rating > 5) throw new ProductAdminError("Rating must be between 0 and 5.");
    payload.rating = rating;
  }

  if ("sort_order" in payload) {
    const sortOrder = payload.sort_order === null ? 0 : Number(payload.sort_order);
    if (!Number.isFinite(sortOrder)) throw new ProductAdminError("Sort order must be a valid number.");
    payload.sort_order = Math.trunc(sortOrder);
  }

  if ("tags" in payload) payload.tags = parseTags(payload.tags);

  if ("stock_status" in payload || !partial) {
    payload.stock_status = payload.stock_status || "in_stock";
    if (!PRODUCT_STOCK_STATUSES.has(payload.stock_status)) {
      throw new ProductAdminError("Stock status is not valid.");
    }
  }

  if ("is_featured" in payload) payload.is_featured = Boolean(payload.is_featured);
  if ("is_active" in payload) payload.is_active = payload.is_active !== false;

  for (const field of ["sku", "category_id", "category_slug", "category_name", "description", "short_description", "discount_label", "badge", "offer", "image_url"]) {
    if (field in payload && typeof payload[field] === "string") payload[field] = payload[field].trim() || null;
  }

  if (payload.sku) payload.sku = String(payload.sku).toUpperCase();

  return payload;
}

async function assertCategoryIsValid(adminClient, payload) {
  if (!payload.category_id && !payload.category_slug) return payload;

  let query = adminClient.from("categories").select("id, name, slug").limit(1);
  if (payload.category_id) query = query.eq("id", payload.category_id);
  else query = query.eq("slug", payload.category_slug);

  const { data, error } = await query.maybeSingle();

  if (error) throw new ProductAdminError("Unable to validate the selected category.", 500);
  if (!data) throw new ProductAdminError("Selected category is not valid.");

  return {
    ...payload,
    category_id: data.id,
    category_slug: data.slug,
    category_name: payload.category_name || data.name
  };
}

async function assertSlugIsUnique(adminClient, slug, currentId) {
  if (!slug) return;

  const { data, error } = await adminClient.from("products").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new ProductAdminError("Unable to validate product slug.", 500);
  if (data && data.id !== currentId) throw new ProductAdminError("A product with this slug already exists.", 409);
}

async function assertSkuIsUnique(adminClient, sku, currentId) {
  if (!sku) return;

  const { data, error } = await adminClient.from("products").select("id").eq("sku", sku).maybeSingle();
  if (error) throw new ProductAdminError("Unable to validate product SKU.", 500);
  if (data && data.id !== currentId) throw new ProductAdminError("A product with this SKU already exists.", 409);
}

function getAdminClientOrThrow() {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) throw new ProductAdminError("Supabase setup required", 503);
  return adminClient;
}

async function getSupabaseProducts() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });

  if (error) {
    warnFallback("products", error);
    return null;
  }

  return data.map(mapProduct);
}

export async function getProducts() {
  return (await getSupabaseProducts()) || localProducts;
}

export async function getFeaturedProducts() {
  const products = await getProducts();
  return products.filter((product) => product.isFeatured);
}

export async function getProductsByCategorySlug(categorySlug) {
  const products = await getProducts();
  return products.filter((product) => product.categorySlug === categorySlug);
}

export async function getProductBySlug(slug) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) || null;
}

export async function getRelatedProducts(product, limit = 4) {
  if (!product) return [];

  const products = await getProducts();
  const sameCategory = products.filter((item) => item.slug !== product.slug && item.categorySlug === product.categorySlug);
  const featuredFill = products.filter((item) => item.slug !== product.slug && item.categorySlug !== product.categorySlug && item.isFeatured);

  return [...sameCategory, ...featuredFill].slice(0, limit);
}

export async function getAdminProducts() {
  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return {
      data: localProducts.map((product, index) => ({
        ...product,
        isActive: product.isActive !== false,
        stockStatus: product.stockStatus || "in_stock",
        sortOrder: product.sortOrder || index
      })),
      mode: "fallback"
    };
  }

  const { data, error } = await adminClient.from("products").select("*").order("created_at", { ascending: false });

  if (error) {
    warnFallback("admin products", error);
    return {
      data: localProducts,
      mode: "fallback"
    };
  }

  return {
    data: data.map(mapProduct),
    mode: "supabase"
  };
}

export async function getAdminProductById(id) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new ProductAdminError("Unable to load product.", 500);
  if (!data) throw new ProductAdminError("Product not found.", 404);

  return mapProduct(data);
}

export async function createAdminProduct(input) {
  const adminClient = getAdminClientOrThrow();
  let payload = normalizeAdminProductInput(input);
  payload = await assertCategoryIsValid(adminClient, payload);
  await assertSlugIsUnique(adminClient, payload.slug);
  await assertSkuIsUnique(adminClient, payload.sku);

  const { data, error } = await adminClient.from("products").insert(payload).select("*").single();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new ProductAdminError("A product with this slug already exists.", 409);
    }
    throw new ProductAdminError("Unable to create product.", 500);
  }

  return mapProduct(data);
}

export async function updateAdminProduct(id, input) {
  const adminClient = getAdminClientOrThrow();
  let payload = normalizeAdminProductInput(input, { partial: true });
  payload = await assertCategoryIsValid(adminClient, payload);
  if (payload.slug) await assertSlugIsUnique(adminClient, payload.slug, id);
  if (payload.sku) await assertSkuIsUnique(adminClient, payload.sku, id);

  const { data, error } = await adminClient.from("products").update(payload).eq("id", id).select("*").maybeSingle();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new ProductAdminError("A product with this slug already exists.", 409);
    }
    throw new ProductAdminError("Unable to update product.", 500);
  }

  if (!data) throw new ProductAdminError("Product not found.", 404);
  return mapProduct(data);
}

export async function deactivateAdminProduct(id) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient
    .from("products")
    .update({
      is_active: false,
      stock_status: "out_of_stock"
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new ProductAdminError("Unable to deactivate product.", 500);
  if (!data) throw new ProductAdminError("Product not found.", 404);

  return {
    ok: true,
    message: "Product deactivated"
  };
}

export async function getProductImages(productId) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new ProductAdminError("Unable to load product images.", 500);
  return data.map(mapProductImage);
}

export async function setMainProductImage(productId, imageUrl) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient
    .from("products")
    .update({ image_url: imageUrl || null })
    .eq("id", productId)
    .select("*")
    .maybeSingle();

  if (error) throw new ProductAdminError("Unable to update main product image.", 500);
  if (!data) throw new ProductAdminError("Product not found.", 404);

  if (imageUrl) {
    await adminClient.from("product_images").update({ is_main: false }).eq("product_id", productId);
    await adminClient.from("product_images").update({ is_main: true }).eq("product_id", productId).eq("image_url", imageUrl);
  }

  return mapProduct(data);
}

export async function addProductImage(productId, input = {}) {
  const adminClient = getAdminClientOrThrow();
  if (!input.image_url) throw new ProductAdminError("Image URL is required.");

  const payload = {
    product_id: productId,
    image_url: String(input.image_url).trim(),
    storage_path: input.storage_path ? String(input.storage_path).trim() : null,
    alt_text: input.alt_text ? String(input.alt_text).trim() : null,
    is_main: Boolean(input.is_main || input.set_as_main),
    sort_order: Number.isFinite(Number(input.sort_order)) ? Math.trunc(Number(input.sort_order)) : 0
  };

  const { data, error } = await adminClient.from("product_images").insert(payload).select("*").single();
  if (error) throw new ProductAdminError("Unable to add product image.", 500);

  if (payload.is_main || input.set_as_main) {
    await setMainProductImage(productId, payload.image_url);
  }

  return mapProductImage(data);
}

export async function updateProductImage(productId, imageId, input = {}) {
  const adminClient = getAdminClientOrThrow();
  const payload = {};

  if ("alt_text" in input) payload.alt_text = input.alt_text ? String(input.alt_text).trim() : null;
  if ("sort_order" in input) {
    const sortOrder = Number(input.sort_order);
    if (!Number.isFinite(sortOrder)) throw new ProductAdminError("Sort order must be valid.");
    payload.sort_order = Math.trunc(sortOrder);
  }
  if ("is_main" in input || "set_as_main" in input) payload.is_main = Boolean(input.is_main || input.set_as_main);

  const { data, error } = await adminClient
    .from("product_images")
    .update(payload)
    .eq("id", imageId)
    .eq("product_id", productId)
    .select("*")
    .maybeSingle();

  if (error) throw new ProductAdminError("Unable to update product image.", 500);
  if (!data) throw new ProductAdminError("Product image not found.", 404);

  if (payload.is_main) {
    await setMainProductImage(productId, data.image_url);
  }

  return mapProductImage(data);
}

function storagePathForRemoval(storagePath) {
  if (!storagePath) return "";
  return storagePath.replace(/^product-images\//, "");
}

export async function deleteProductImage(productId, imageId) {
  const adminClient = getAdminClientOrThrow();

  const { data: image, error: loadError } = await adminClient
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (loadError) throw new ProductAdminError("Unable to load product image.", 500);
  if (!image) throw new ProductAdminError("Product image not found.", 404);

  const { error } = await adminClient.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
  if (error) throw new ProductAdminError("Unable to remove product image.", 500);

  const removablePath = storagePathForRemoval(image.storage_path);
  if (removablePath) {
    const { error: storageError } = await adminClient.storage.from("product-images").remove([removablePath]);
    if (storageError) console.warn("[admin-product-images] Storage remove failed", storageError.message);
  }

  const { data: product } = await adminClient.from("products").select("image_url").eq("id", productId).maybeSingle();
  if (product?.image_url === image.image_url) {
    const { data: remaining } = await adminClient
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    await setMainProductImage(productId, remaining?.image_url || null);
  }

  return {
    ok: true,
    message: "Product image removed"
  };
}
