import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/auth";
import { getActiveCategories } from "@/lib/data/categories";
import { getAdminOrders } from "@/lib/data/orders";
import { getProducts } from "@/lib/data/products";

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function GET(request) {
  const currentAdmin = await getCurrentAdmin(getBearerToken(request));

  if (!currentAdmin.configured) {
    return NextResponse.json({ configured: false, ok: false, reason: "setup_required" });
  }

  if (!currentAdmin.admin) {
    return NextResponse.json({ configured: true, ok: false, reason: "not_authorized" }, { status: 401 });
  }

  const [categories, products, ordersResult] = await Promise.all([
    getActiveCategories(),
    getProducts(),
    getAdminOrders().catch(() => ({ data: [] }))
  ]);

  return NextResponse.json({
    configured: true,
    ok: true,
    stats: {
      totalProducts: products.length,
      activeCategories: categories.length,
      featuredProducts: products.filter((product) => product.isFeatured).length,
      recentOrders: ordersResult.data.length
    }
  });
}
