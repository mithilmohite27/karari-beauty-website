import { NextResponse } from "next/server";
import { verifyAdminMutationRequest } from "@/lib/admin/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFileName(name) {
  const fallback = "product-image";
  const [base = fallback, ...rest] = String(name || fallback).split(".");
  const extension = rest.length ? rest.pop() : "";
  const safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

function safeFolderName(value) {
  return String(value || "temp")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "temp";
}

export async function POST(request) {
  const { response } = await verifyAdminMutationRequest(request);
  if (response) return response;

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase setup required"
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const productId = formData.get("productId");
    const purpose = formData.get("purpose") || "main";

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ ok: false, error: "Image file is required." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Only JPG, PNG and WebP images are allowed." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "Image must be 5MB or smaller." }, { status: 400 });
    }

    const folder = safeFolderName(productId || "temp");
    const safeName = safeFileName(file.name);
    const timestamp = Date.now();
    const storagePath = `${folder}/${purpose === "gallery" ? "gallery" : "main"}/${timestamp}-${safeName}`;
    const buffer = await file.arrayBuffer();

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (error) {
      console.error("[admin-upload] Product image upload failed", error.message);
      return NextResponse.json({ ok: false, error: "Unable to upload product image." }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path: `${BUCKET}/${storagePath}`
    });
  } catch (error) {
    console.error("[admin-upload] Product image upload failed", error);
    return NextResponse.json({ ok: false, error: "Unable to upload product image." }, { status: 500 });
  }
}
