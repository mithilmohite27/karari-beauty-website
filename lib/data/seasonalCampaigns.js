import { seasonalCampaign as localSeasonalCampaign } from "@/data/seasonalCampaign";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function warnFallback(source, error) {
  console.warn(`[karari-data] ${source} Supabase read failed. Falling back to local data.`, error?.message || error);
}

function mapCampaign(row) {
  return {
    id: row.slug || row.id,
    name: row.name,
    slug: row.slug,
    active: Boolean(row.is_active),
    startDate: row.start_date,
    endDate: row.end_date,
    theme: row.theme || "",
    heroTitle: row.hero_title || "",
    heroSubtitle: row.hero_subtitle || "",
    offer: row.offer_label || "",
    featuredCategories: row.featured_category_slugs || [],
    config: row.config || {}
  };
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
