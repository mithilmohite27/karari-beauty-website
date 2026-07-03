import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isSupabasePublicConfigured } from "@/lib/supabase/browser";

const ADMIN_ROLES = new Set(["owner", "admin"]);

export function isAdminConfigured() {
  return isSupabasePublicConfigured() && isSupabaseAdminConfigured();
}

export async function getAdminProfile(userId) {
  const adminClient = createAdminSupabaseClient();
  if (!adminClient || !userId) return null;

  const { data, error } = await adminClient
    .from("admin_profiles")
    .select("id, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.is_active || !ADMIN_ROLES.has(data.role)) return null;

  return data;
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

  const profile = await getAdminProfile(data.user.id);

  return {
    configured: true,
    admin: profile,
    user: data.user
  };
}

export async function requireAdmin(accessToken) {
  const currentAdmin = await getCurrentAdmin(accessToken);
  if (!currentAdmin.configured || !currentAdmin.admin) {
    return null;
  }

  return currentAdmin;
}
