import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export class CustomerAuthError extends Error {
  constructor(message = "Please sign in to continue.", status = 401) {
    super(message);
    this.name = "CustomerAuthError";
    this.status = status;
  }
}

export async function verifyCustomerRequest(request) {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new CustomerAuthError("Customer checkout requires Supabase setup.", 503);

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new CustomerAuthError();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new CustomerAuthError();

  return {
    supabase,
    user: data.user,
    token
  };
}
