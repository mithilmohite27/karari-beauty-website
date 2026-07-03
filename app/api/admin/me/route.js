import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/auth";

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function GET(request) {
  const token = getBearerToken(request);
  const currentAdmin = await getCurrentAdmin(token);

  if (!currentAdmin.configured) {
    return NextResponse.json({
      configured: false,
      ok: false,
      reason: "setup_required"
    });
  }

  if (!currentAdmin.user) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        reason: "not_authenticated"
      },
      { status: 401 }
    );
  }

  if (!currentAdmin.admin) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        reason: "access_denied"
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    configured: true,
    ok: true,
    admin: {
      id: currentAdmin.admin.id,
      fullName: currentAdmin.admin.full_name,
      role: currentAdmin.admin.role,
      email: currentAdmin.user.email
    }
  });
}
