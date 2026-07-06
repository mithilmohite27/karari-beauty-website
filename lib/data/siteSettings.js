import "server-only";

import { businessSettings } from "@/data/businessSettings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const SETTINGS_KEY = "business";

export class SiteSettingsAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "SiteSettingsAdminError";
    this.status = status;
  }
}

export const defaultSiteSettings = {
  business: {
    name: businessSettings.name,
    tagline: businessSettings.tagline,
    shortDescription: businessSettings.shortDescription,
    logoUrl: businessSettings.logoUrl,
    faviconUrl: businessSettings.faviconUrl
  },
  contact: {
    whatsappNumber: businessSettings.whatsappNumber,
    phoneNumber: businessSettings.phoneNumber,
    email: businessSettings.email,
    address: businessSettings.address,
    city: businessSettings.city,
    state: businessSettings.state,
    country: businessSettings.country,
    mapsUrl: businessSettings.mapsUrl,
    timings: businessSettings.timings
  },
  social: {
    instagramUrl: businessSettings.instagramUrl,
    facebookUrl: businessSettings.facebookUrl,
    youtubeUrl: businessSettings.youtubeUrl
  },
  website: {
    defaultCountry: businessSettings.defaultCountry,
    defaultCurrency: businessSettings.defaultCurrency,
    announcementLine: businessSettings.announcementLine,
    internationalInquiryMessage: businessSettings.internationalMessage
  },
  ordering: {
    checkoutEnabled: businessSettings.checkoutEnabled,
    whatsappSupportEnabled: businessSettings.whatsappSupportEnabled,
    upiDisplayText: businessSettings.payment.note,
    upiQrImageUrl: businessSettings.payment.upiQrImageUrl,
    upiId: businessSettings.payment.upiId
  },
  seo: {
    siteTitle: businessSettings.siteTitle,
    metaDescription: businessSettings.metaDescription,
    ogImageUrl: businessSettings.ogImageUrl
  }
};

function mergeSettings(value = {}) {
  return {
    business: { ...defaultSiteSettings.business, ...(value.business || {}) },
    contact: { ...defaultSiteSettings.contact, ...(value.contact || {}) },
    social: { ...defaultSiteSettings.social, ...(value.social || {}) },
    website: { ...defaultSiteSettings.website, ...(value.website || {}) },
    ordering: { ...defaultSiteSettings.ordering, ...(value.ordering || {}) },
    seo: { ...defaultSiteSettings.seo, ...(value.seo || {}) }
  };
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalUrl(value, label) {
  const url = cleanString(value);
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid");
    return url;
  } catch {
    throw new SiteSettingsAdminError(`${label} must be a valid website link.`);
  }
}

function optionalEmail(value) {
  const email = cleanString(value);
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SiteSettingsAdminError("Email must be valid.");
  }
  return email;
}

function optionalPhone(value, label) {
  const phone = cleanString(value);
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new SiteSettingsAdminError(`${label} must be a valid phone number.`);
  }
  return phone;
}

function normalizeSettings(input = {}) {
  const merged = mergeSettings(input);

  return {
    business: {
      name: cleanString(merged.business.name) || defaultSiteSettings.business.name,
      tagline: cleanString(merged.business.tagline),
      shortDescription: cleanString(merged.business.shortDescription),
      logoUrl: optionalUrl(merged.business.logoUrl, "Logo URL"),
      faviconUrl: optionalUrl(merged.business.faviconUrl, "Favicon URL")
    },
    contact: {
      whatsappNumber: optionalPhone(merged.contact.whatsappNumber, "WhatsApp number"),
      phoneNumber: optionalPhone(merged.contact.phoneNumber, "Phone number"),
      email: optionalEmail(merged.contact.email),
      address: cleanString(merged.contact.address),
      city: cleanString(merged.contact.city),
      state: cleanString(merged.contact.state),
      country: cleanString(merged.contact.country) || "India",
      mapsUrl: optionalUrl(merged.contact.mapsUrl, "Google Maps URL"),
      timings: cleanString(merged.contact.timings)
    },
    social: {
      instagramUrl: optionalUrl(merged.social.instagramUrl, "Instagram URL"),
      facebookUrl: optionalUrl(merged.social.facebookUrl, "Facebook URL"),
      youtubeUrl: optionalUrl(merged.social.youtubeUrl, "YouTube URL")
    },
    website: {
      defaultCountry: cleanString(merged.website.defaultCountry) || "India",
      defaultCurrency: cleanString(merged.website.defaultCurrency) || "INR",
      announcementLine: cleanString(merged.website.announcementLine),
      internationalInquiryMessage: cleanString(merged.website.internationalInquiryMessage)
    },
    ordering: {
      checkoutEnabled: Boolean(merged.ordering.checkoutEnabled),
      whatsappSupportEnabled: Boolean(merged.ordering.whatsappSupportEnabled),
      upiDisplayText: cleanString(merged.ordering.upiDisplayText),
      upiQrImageUrl: optionalUrl(merged.ordering.upiQrImageUrl, "UPI QR image URL"),
      upiId: cleanString(merged.ordering.upiId)
    },
    seo: {
      siteTitle: cleanString(merged.seo.siteTitle),
      metaDescription: cleanString(merged.seo.metaDescription),
      ogImageUrl: optionalUrl(merged.seo.ogImageUrl, "Open Graph image URL")
    }
  };
}

function getAdminClientOrThrow() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new SiteSettingsAdminError("Supabase setup required", 503);
  return supabase;
}

async function readSettingsFromSupabase() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error) {
    console.warn("[karari-data] site settings Supabase read failed. Falling back to local settings.", error.message);
    return null;
  }

  return data?.value ? mergeSettings(data.value) : null;
}

export async function getSiteSettings() {
  return (await readSettingsFromSupabase()) || defaultSiteSettings;
}

export async function getAdminSiteSettings() {
  const supabase = getAdminClientOrThrow();

  const { data, error } = await supabase.from("site_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error) throw new SiteSettingsAdminError("Unable to load settings.", 500);

  return {
    data: mergeSettings(data?.value || {}),
    mode: "supabase"
  };
}

export async function updateAdminSiteSettings(payload) {
  const supabase = getAdminClientOrThrow();
  const value = normalizeSettings(payload);

  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ key: SETTINGS_KEY, value }, { onConflict: "key" })
    .select("value")
    .single();

  if (error) throw new SiteSettingsAdminError("Unable to save settings.", 500);

  return {
    data: mergeSettings(data.value),
    mode: "supabase"
  };
}
