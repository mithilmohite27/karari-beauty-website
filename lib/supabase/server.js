import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./browser";

export function createServerSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
