import { NextResponse } from "next/server";
import { getRazorpayStatus } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getRazorpayStatus());
}
