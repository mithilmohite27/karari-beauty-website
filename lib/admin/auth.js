import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isSupabasePublicConfigured } from "@/lib/supabase/browser";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export function isAdminConfigured() {
  return isSupabasePublicConfigured() && isSupabaseAdminConfigured();
}

async function getAdminProfileAccess(userId) {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient || !userId) {
    return {
      profile: null,
      reason: "not_authorized"
    };
  }

  const { data, error } = await adminClient
    .from("admin_profiles")
    .select("id, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      profile: null,
      reason: "not_authorized"
    };
  }

  if (!data.is_active) {
    return {
      profile: null,
      reason: "inactive"
    };
  }

  if (!ADMIN_ROLES.has(data.role)) {
    return {
      profile: null,
      reason: "not_authorized"
    };
  }

  return {
    profile: data,
    reason: ""
  };
}

export async function getAdminProfile(userId) {
  const { profile } = await getAdminProfileAccess(userId);
  return profile;
}

export async function getCurrentAdmin(accessToken) {
  if (!isAdminConfigured()) {
    return {
      configured: false,
      admin: null,
      user: null
    };
  }

  if (!accessToken) {
    return {
      configured: true,
      admin: null,
      user: null
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      configured: false,
      admin: null,
      user: null
    };
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return {
      configured: true,
      admin: null,
      user: null
    };
  }

  const { profile, reason } = await getAdminProfileAccess(data.user.id);

  return {
    configured: true,
    admin: profile,
    user: data.user,
    adminDeniedReason: profile ? "" : reason
  };
}

export async function requireAdmin(accessToken) {
  const currentAdmin = await getCurrentAdmin(accessToken);
  if (!currentAdmin.configured || !currentAdmin.admin) {
    return null;
  }

  return currentAdmin;
}
