import "server-only";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/auth";

export function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function verifyAdminRequest(request) {
  const currentAdmin = await getCurrentAdmin(getBearerToken(request));

  if (!currentAdmin.configured) {
    return {
      response: NextResponse.json({
        ok: false,
        error: "Admin setup required.",
        meta: {
          total: 0,
          mode: "setup-required"
        }
      })
    };
  }

  if (!currentAdmin.user) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Admin sign-in required."
        },
        { status: 401 }
      )
    };
  }

  if (!currentAdmin.admin) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: currentAdmin.adminDeniedReason === "inactive" ? "Admin account inactive." : "Not authorized."
        },
        { status: 403 }
      )
    };
  }

  return {
    currentAdmin
  };
}

export async function verifyAdminMutationRequest(request) {
  const currentAdmin = await getCurrentAdmin(getBearerToken(request));

  if (!currentAdmin.configured) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Supabase setup required",
          meta: {
            total: 0,
            mode: "setup-required"
          }
        },
        { status: 503 }
      )
    };
  }

  if (!currentAdmin.user) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Admin sign-in required."
        },
        { status: 401 }
      )
    };
  }

  if (!currentAdmin.admin || !["owner", "admin"].includes(currentAdmin.admin.role)) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: currentAdmin.adminDeniedReason === "inactive" ? "Admin account inactive." : "Not authorized."
        },
        { status: 403 }
      )
    };
  }

  return {
    currentAdmin
  };
}

export function adminDataResponse(data, mode) {
  return NextResponse.json({
    ok: true,
    data,
    meta: {
      total: data.length,
      mode
    }
  });
}

export function adminErrorResponse(message = "Unable to load admin data.") {
  return NextResponse.json(
    {
      ok: false,
      error: message
    },
    { status: 500 }
  );
}
