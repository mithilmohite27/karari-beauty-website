import { categories as localCategories } from "@/data/categories";
import { generateSlug } from "@/lib/productIdentifiers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function warnFallback(source, error) {
  console.warn(`[karari-data] ${source} Supabase read failed. Falling back to local data.`, error?.message || error);
}

function mapCategory(row) {
  return {
    id: row.id || row.slug,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    productCountLabel: row.product_count_label || "",
    href: `/collections/${row.slug}`,
    featured: Boolean(row.featured),
    image: row.image_url || "",
    isActive: row.is_active !== false,
    sortOrder: row.sort_order || 0
  };
}

const CATEGORY_MUTATION_FIELDS = new Set([
  "name",
  "slug",
  "description",
  "product_count_label",
  "image_url",
  "featured",
  "is_active",
  "sort_order"
]);

export class CategoryAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CategoryAdminError";
    this.status = status;
  }
}

function emptyToNull(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function normalizeAdminCategoryInput(input = {}, { partial = false } = {}) {
  const payload = {};

  for (const [key, value] of Object.entries(input)) {
    if (CATEGORY_MUTATION_FIELDS.has(key)) payload[key] = emptyToNull(value);
  }

  if (!partial || "name" in payload) {
    if (!payload.name) throw new CategoryAdminError("Category name is required.");
    payload.name = String(payload.name).trim();
  }

  if (!partial || "slug" in payload) {
    const slug = generateSlug(payload.slug || payload.name);
    if (!slug) throw new CategoryAdminError("Category slug is required.");
    payload.slug = slug;
  }

  for (const field of ["description", "product_count_label", "image_url"]) {
    if (field in payload && typeof payload[field] === "string") payload[field] = payload[field].trim() || null;
  }

  if ("featured" in payload) payload.featured = Boolean(payload.featured);
  if ("is_active" in payload) payload.is_active = payload.is_active !== false;

  if ("sort_order" in payload) {
    const sortOrder = payload.sort_order === null ? 0 : Number(payload.sort_order);
    if (!Number.isFinite(sortOrder)) throw new CategoryAdminError("Sort order must be a valid number.");
    payload.sort_order = Math.trunc(sortOrder);
  }

  return payload;
}

function getAdminClientOrThrow() {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) throw new CategoryAdminError("Supabase setup required", 503);
  return adminClient;
}

async function assertCategorySlugIsUnique(adminClient, slug, currentId) {
  if (!slug) return;

  const { data, error } = await adminClient.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new CategoryAdminError("Unable to validate category slug.", 500);
  if (data && data.id !== currentId) throw new CategoryAdminError("A category with this slug already exists.", 409);
}

async function getSupabaseCategories() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });

  if (error) {
    warnFallback("categories", error);
    return null;
  }

  return data.map(mapCategory);
}

export async function getCategories() {
  return (await getSupabaseCategories()) || localCategories;
}

export async function getActiveCategories() {
  const categories = await getCategories();
  return categories.filter((category) => category.isActive !== false);
}

export async function getCategoryBySlug(slug) {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) || null;
}

export async function getAdminCategories() {
  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return {
      data: localCategories.map((category, index) => ({
        ...category,
        isActive: category.isActive !== false,
        sortOrder: category.sortOrder || index
      })),
      mode: "fallback"
    };
  }

  const { data, error } = await adminClient.from("categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });

  if (error) {
    warnFallback("admin categories", error);
    return {
      data: localCategories,
      mode: "fallback"
    };
  }

  return {
    data: data.map(mapCategory),
    mode: "supabase"
  };
}

export async function getAdminCategoryById(id) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient.from("categories").select("*").eq("id", id).maybeSingle();
  if (error) throw new CategoryAdminError("Unable to load category.", 500);
  if (!data) throw new CategoryAdminError("Category not found.", 404);

  return mapCategory(data);
}

export async function createAdminCategory(input) {
  const adminClient = getAdminClientOrThrow();
  const payload = normalizeAdminCategoryInput(input);
  await assertCategorySlugIsUnique(adminClient, payload.slug);

  const { data, error } = await adminClient.from("categories").insert(payload).select("*").single();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new CategoryAdminError("A category with this slug already exists.", 409);
    }
    throw new CategoryAdminError("Unable to create category.", 500);
  }

  return mapCategory(data);
}

export async function updateAdminCategory(id, input) {
  const adminClient = getAdminClientOrThrow();
  const payload = normalizeAdminCategoryInput(input, { partial: true });
  if (payload.slug) await assertCategorySlugIsUnique(adminClient, payload.slug, id);

  const { data, error } = await adminClient.from("categories").update(payload).eq("id", id).select("*").maybeSingle();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new CategoryAdminError("A category with this slug already exists.", 409);
    }
    throw new CategoryAdminError("Unable to update category.", 500);
  }

  if (!data) throw new CategoryAdminError("Category not found.", 404);
  return mapCategory(data);
}

export async function deactivateAdminCategory(id) {
  const adminClient = getAdminClientOrThrow();
  const category = await getAdminCategoryById(id);

  const { count, error: countError } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .or(`category_id.eq.${id},category_slug.eq.${category.slug}`)
    .eq("is_active", true);

  if (countError) throw new CategoryAdminError("Unable to check category products.", 500);

  const { data, error } = await adminClient.from("categories").update({ is_active: false }).eq("id", id).select("id").maybeSingle();
  if (error) throw new CategoryAdminError("Unable to deactivate category.", 500);
  if (!data) throw new CategoryAdminError("Category not found.", 404);

  return {
    ok: true,
    message: count
      ? "Category deactivated. Existing products remain assigned but category will be hidden publicly."
      : "Category deactivated",
    productCount: count || 0
  };
}

export async function checkCategoryProductLinks(category) {
  const adminClient = getAdminClientOrThrow();
  const { count, error } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .or(`category_id.eq.${category.id},category_slug.eq.${category.slug}`);

  if (error) throw new CategoryAdminError("Unable to check category products.", 500);
  return count || 0;
}

export async function hardDeleteAdminCategory(id, adminUser = {}) {
  if (adminUser?.admin?.role !== "owner") {
    throw new CategoryAdminError("Only owner can permanently delete categories.", 403);
  }

  const adminClient = getAdminClientOrThrow();
  const category = await getAdminCategoryById(id);
  const linkedProducts = await checkCategoryProductLinks(category);

  if (linkedProducts > 0) {
    throw new CategoryAdminError("This category has products linked to it. Move or hide those products before deleting the category.", 409);
  }

  const { error } = await adminClient.from("categories").delete().eq("id", id);
  if (error) throw new CategoryAdminError("Unable to delete category.", 500);

  return {
    ok: true,
    message: "Category permanently deleted.",
    productCount: linkedProducts
  };
}
