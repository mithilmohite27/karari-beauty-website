import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

async function getTableCount(supabase, table, buildQuery = (query) => query) {
  const query = buildQuery(supabase.from(table).select("id", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function GET(request) {
  const currentAdmin = await getCurrentAdmin(getBearerToken(request));

  if (!currentAdmin.configured) {
    return NextResponse.json({ configured: false, ok: false, reason: "setup_required" });
  }

  if (!currentAdmin.user) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        reason: "not_authenticated",
        error: "Admin sign-in required."
      },
      { status: 401 }
    );
  }

  if (!currentAdmin.admin) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        reason: currentAdmin.adminDeniedReason === "inactive" ? "inactive" : "not_authorized",
        error: currentAdmin.adminDeniedReason === "inactive" ? "Admin account inactive." : "Not authorized."
      },
      { status: 403 }
    );
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ configured: false, ok: false, reason: "setup_required" }, { status: 503 });
  }

  try {
    const [totalProducts, activeCategories, featuredProducts, recentOrders] = await Promise.all([
      getTableCount(supabase, "products"),
      getTableCount(supabase, "categories", (query) => query.eq("is_active", true)),
      getTableCount(supabase, "products", (query) => query.eq("is_featured", true)),
      getTableCount(supabase, "orders")
    ]);

    return NextResponse.json({
      configured: true,
      ok: true,
      stats: {
        totalProducts,
        activeCategories,
        featuredProducts,
        recentOrders
      }
    });
  } catch (error) {
    console.error("[admin-dashboard-api] Failed to load dashboard stats", error?.message || error);
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        error: "Unable to load dashboard stats."
      },
      { status: 500 }
    );
  }
}
