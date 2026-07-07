"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function getCustomerSession() {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return { supabase: null, session: null, user: null };

  const { data } = await supabase.auth.getSession();
  return {
    supabase,
    session: data.session || null,
    user: data.session?.user || null
  };
}

export function getCustomerDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || "Karari customer";
}

export async function signOutCustomer() {
  const { supabase } = await getCustomerSession();
  if (!supabase) return;
  await supabase.auth.signOut();
  window.dispatchEvent(new Event("customerAuth:updated"));
}

export async function goToCheckout({ mode } = {}) {
  const { session } = await getCustomerSession();
  const checkoutPath = mode === "buy-now" ? "/checkout?mode=buy-now" : "/checkout";

  if (session) {
    window.location.assign(checkoutPath);
    return;
  }

  window.location.assign(`/sign-in?redirect=${encodeURIComponent(checkoutPath)}`);
}
