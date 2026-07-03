import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/api";
import { CustomerAdminError, getAdminCustomerById } from "@/lib/data/customers";

export async function GET(request, { params }) {
  const { response } = await verifyAdminRequest(request);
  if (response) return response;

  try {
    const { id } = await params;
    const customer = await getAdminCustomerById(id);
    return NextResponse.json({ ok: true, data: customer });
  } catch (error) {
    if (error instanceof CustomerAdminError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }

    console.error("[admin-customer-api] Failed to load customer", error);
    return NextResponse.json({ ok: false, error: "Unable to load customer." }, { status: 500 });
  }
}
