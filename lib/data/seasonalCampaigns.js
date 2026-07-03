import { seasonalCampaign as localSeasonalCampaign } from "@/data/seasonalCampaign";
import { generateSlug } from "@/lib/productIdentifiers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function warnFallback(source, error) {
  console.warn(`[karari-data] ${source} Supabase read failed. Falling back to local data.`, error?.message || error);
}

function mapCampaign(row) {
  return {
    id: row.id || row.slug,
    name: row.name,
    slug: row.slug,
    active: Boolean(row.is_active),
    isActive: Boolean(row.is_active),
    startDate: row.start_date,
    endDate: row.end_date,
    theme: row.theme || "",
    heroTitle: row.hero_title || "",
    heroSubtitle: row.hero_subtitle || "",
    offer: row.offer_label || "",
    offerLabel: row.offer_label || "",
    featuredCategories: row.featured_category_slugs || [],
    featuredCategorySlugs: row.featured_category_slugs || [],
    config: row.config || {},
    createdAt: row.created_at
  };
}

const CAMPAIGN_MUTATION_FIELDS = new Set([
  "name",
  "slug",
  "theme",
  "is_active",
  "start_date",
  "end_date",
  "hero_title",
  "hero_subtitle",
  "offer_label",
  "featured_category_slugs",
  "config"
]);

export class CampaignAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CampaignAdminError";
    this.status = status;
  }
}

function emptyToNull(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function normalizeDate(value, label) {
  const normalized = emptyToNull(value);
  if (normalized === undefined || normalized === null) return null;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new CampaignAdminError(`${label} must be a valid date.`);
  return String(normalized).slice(0, 10);
}

function normalizeConfig(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new CampaignAdminError("Advanced visual settings must be valid JSON.");
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) throw new CampaignAdminError("Advanced visual settings must be a JSON object.");
  return value;
}

function normalizeFeaturedCategories(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((item) => generateSlug(item)).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => generateSlug(item)).filter(Boolean);
  return [];
}

function normalizeAdminCampaignInput(input = {}, { partial = false } = {}) {
  const payload = {};

  for (const [key, value] of Object.entries(input)) {
    if (CAMPAIGN_MUTATION_FIELDS.has(key)) payload[key] = emptyToNull(value);
  }

  if (!partial || "name" in payload) {
    if (!payload.name) throw new CampaignAdminError("Campaign name is required.");
    payload.name = String(payload.name).trim();
  }

  if (!partial || "slug" in payload) {
    const slug = generateSlug(payload.slug || payload.name);
    if (!slug) throw new CampaignAdminError("Campaign slug is required.");
    payload.slug = slug;
  }

  for (const field of ["theme", "hero_title", "hero_subtitle", "offer_label"]) {
    if (field in payload && typeof payload[field] === "string") payload[field] = payload[field].trim() || null;
  }

  if ("is_active" in payload) payload.is_active = Boolean(payload.is_active);
  if ("start_date" in payload) payload.start_date = normalizeDate(payload.start_date, "Start date");
  if ("end_date" in payload) payload.end_date = normalizeDate(payload.end_date, "End date");
  if (payload.start_date && payload.end_date && new Date(payload.end_date) < new Date(payload.start_date)) {
    throw new CampaignAdminError("End date must be after or equal to start date.");
  }
  if ("featured_category_slugs" in payload) payload.featured_category_slugs = normalizeFeaturedCategories(payload.featured_category_slugs);
  if ("config" in payload) payload.config = normalizeConfig(payload.config);

  return payload;
}

function getAdminClientOrThrow() {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) throw new CampaignAdminError("Supabase setup required", 503);
  return adminClient;
}

async function assertCampaignSlugIsUnique(adminClient, slug, currentId) {
  if (!slug) return;

  const { data, error } = await adminClient.from("seasonal_campaigns").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new CampaignAdminError("Unable to validate campaign slug.", 500);
  if (data && data.id !== currentId) throw new CampaignAdminError("A campaign with this slug already exists.", 409);
}

async function assertFeaturedCategoriesAreValid(adminClient, slugs) {
  if (!slugs?.length) return;

  const { data, error } = await adminClient.from("categories").select("slug").in("slug", slugs);
  if (error) throw new CampaignAdminError("Unable to validate featured categories.", 500);

  const valid = new Set((data || []).map((category) => category.slug));
  const invalid = slugs.filter((slug) => !valid.has(slug));
  if (invalid.length) throw new CampaignAdminError("One or more featured categories are not valid.");
}

async function enforceSingleActiveCampaign(adminClient, campaignId) {
  const { error } = await adminClient.from("seasonal_campaigns").update({ is_active: false }).neq("id", campaignId);
  if (error) throw new CampaignAdminError("Unable to update active campaign state.", 500);
}

export function isCampaignActive(campaign) {
  if (!campaign?.active) return false;

  const today = new Date();
  const start = campaign.startDate ? new Date(campaign.startDate) : null;
  const end = campaign.endDate ? new Date(campaign.endDate) : null;

  if (start && today < start) return false;
  if (end && today > end) return false;

  return true;
}

export async function getActiveSeasonalCampaign() {
  const supabase = createServerSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("seasonal_campaigns")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      warnFallback("seasonal campaigns", error);
    } else if (data) {
      const campaign = mapCampaign(data);
      return isCampaignActive(campaign) ? campaign : null;
    }
  }

  return isCampaignActive(localSeasonalCampaign) ? localSeasonalCampaign : null;
}

export async function getAdminCampaigns() {
  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return {
      data: [
        {
          ...localSeasonalCampaign,
          slug: "raksha-bandhan-2026",
          active: Boolean(localSeasonalCampaign.active),
          offerLabel: localSeasonalCampaign.offer,
          featuredCategorySlugs: localSeasonalCampaign.featuredCategories || []
        }
      ],
      mode: "fallback"
    };
  }

  const { data, error } = await adminClient.from("seasonal_campaigns").select("*").order("created_at", { ascending: false });

  if (error) {
    warnFallback("admin campaigns", error);
    return {
      data: [localSeasonalCampaign],
      mode: "fallback"
    };
  }

  return {
    data: data.map(mapCampaign),
    mode: "supabase"
  };
}

export async function getAdminCampaignById(id) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient.from("seasonal_campaigns").select("*").eq("id", id).maybeSingle();
  if (error) throw new CampaignAdminError("Unable to load campaign.", 500);
  if (!data) throw new CampaignAdminError("Campaign not found.", 404);

  return mapCampaign(data);
}

export async function createAdminCampaign(input) {
  const adminClient = getAdminClientOrThrow();
  const payload = normalizeAdminCampaignInput(input);
  const shouldActivate = Boolean(payload.is_active);
  await assertCampaignSlugIsUnique(adminClient, payload.slug);
  await assertFeaturedCategoriesAreValid(adminClient, payload.featured_category_slugs);

  const { data, error } = await adminClient.from("seasonal_campaigns").insert({ ...payload, is_active: false }).select("*").single();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new CampaignAdminError("A campaign with this slug already exists.", 409);
    }
    throw new CampaignAdminError("Unable to create campaign.", 500);
  }

  if (shouldActivate) return activateAdminCampaign(data.id);

  return mapCampaign(data);
}

export async function updateAdminCampaign(id, input) {
  const adminClient = getAdminClientOrThrow();
  const payload = normalizeAdminCampaignInput(input, { partial: true });
  if (payload.slug) await assertCampaignSlugIsUnique(adminClient, payload.slug, id);
  if (payload.featured_category_slugs) await assertFeaturedCategoriesAreValid(adminClient, payload.featured_category_slugs);

  if (payload.is_active) await enforceSingleActiveCampaign(adminClient, id);

  const { data, error } = await adminClient.from("seasonal_campaigns").update(payload).eq("id", id).select("*").maybeSingle();

  if (error) {
    if (error.code === "23505" || String(error.message || "").toLowerCase().includes("slug")) {
      throw new CampaignAdminError("A campaign with this slug already exists.", 409);
    }
    throw new CampaignAdminError("Unable to update campaign.", 500);
  }
  if (!data) throw new CampaignAdminError("Campaign not found.", 404);

  return mapCampaign(data);
}

export async function activateAdminCampaign(id) {
  const adminClient = getAdminClientOrThrow();
  await enforceSingleActiveCampaign(adminClient, id);

  const { data, error } = await adminClient.from("seasonal_campaigns").update({ is_active: true }).eq("id", id).select("*").maybeSingle();
  if (error) throw new CampaignAdminError("Unable to activate campaign.", 500);
  if (!data) throw new CampaignAdminError("Campaign not found.", 404);

  return mapCampaign(data);
}

export async function deactivateAdminCampaign(id) {
  const adminClient = getAdminClientOrThrow();

  const { data, error } = await adminClient.from("seasonal_campaigns").update({ is_active: false }).eq("id", id).select("id").maybeSingle();
  if (error) throw new CampaignAdminError("Unable to deactivate campaign.", 500);
  if (!data) throw new CampaignAdminError("Campaign not found.", 404);

  return {
    ok: true,
    message: "Campaign deactivated"
  };
}
