import { categories as localCategories } from "@/data/categories";
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
