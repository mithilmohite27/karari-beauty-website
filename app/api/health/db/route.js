import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabasePublicConfigured } from "@/lib/supabase/browser";

export async function GET() {
  const configured = isSupabasePublicConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      ok: false
    });
  }

  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase.from("categories").select("id").limit(1);

    return NextResponse.json({
      configured: true,
      ok: !error
    });
  } catch {
    return NextResponse.json({
      configured: true,
      ok: false
    });
  }
}
