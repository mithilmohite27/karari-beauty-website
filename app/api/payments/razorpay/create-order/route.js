import { NextResponse } from "next/server";
import { CustomerAuthError, verifyCustomerRequest } from "@/lib/customerAuth";
import { createOrder } from "@/lib/data/orders";
import { getProducts } from "@/lib/data/products";
import { createRazorpayOrder, RazorpayConfigError } from "@/lib/razorpay";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeOrderType(value) {
  return value === "International Inquiry" ? "international" : "domestic";
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) return { error: "Your cart is empty." };

  const normalized = [];
  for (const item of items) {
    const productId = cleanString(item.productId || item.id);
    const slug = cleanString(item.slug || item.productSlug);
    const quantity = Number(item.quantity);
    if ((!productId && !slug) || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: "One or more cart items are invalid." };
    }
    normalized.push({ productId, slug, quantity });
  }

  return { items: normalized };
}

async function getServerPricedItems(items) {
  const products = await getProducts();
  const normalized = [];

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId || entry.slug === item.slug);
    if (!product) return { error: "One or more products are no longer available." };

    normalized.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price || 0),
      quantity: item.quantity,
      image: product.image,
      categorySlug: product.categorySlug
    });
  }

  return { items: normalized };
}

export async function POST(request) {
  try {
    await verifyCustomerRequest(request);
    const body = await request.json();
    const customer = body.customer || {};
    const delivery = body.delivery || {};
    const fullName = cleanString(customer.fullName || body.customerName);
    const phone = cleanString(customer.mobile || customer.phone || body.customerPhone);
    const email = cleanString(customer.email || body.customerEmail);
    const country = cleanString(delivery.country || body.deliveryCountry);
    const city = cleanString(delivery.city || body.deliveryCity);
    const address = cleanString(delivery.address || body.deliveryAddress);

    if (!fullName || !phone || !country || !city || !address) {
      return NextResponse.json({ ok: false, error: "Please complete delivery details before payment." }, { status: 400 });
    }

    const itemResult = validateItems(body.items);
    if (itemResult.error) return NextResponse.json({ ok: false, error: itemResult.error }, { status: 400 });

    const pricedResult = await getServerPricedItems(itemResult.items);
    if (pricedResult.error) return NextResponse.json({ ok: false, error: pricedResult.error }, { status: 400 });

    const subtotal = pricedResult.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const amount = Math.round(subtotal * 100);

    const order = await createOrder({
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      deliveryCountry: country,
      deliveryCity: city,
      deliveryAddress: address,
      orderType: normalizeOrderType(body.orderType),
      paymentGateway: "razorpay",
      paymentMethod: "online",
      paymentPreference: "Online Payment via Razorpay",
      paymentStatus: "pending",
      notes: cleanString(delivery.note || body.notes),
      items: pricedResult.items,
      subtotal,
      totalAmount: subtotal,
      status: "new"
    });

    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        internal_order_id: order.orderId,
        order_number: order.orderNumber
      }
    });

    await createOrderPaymentLink(order.orderId, razorpayOrder.id);

    return NextResponse.json({
      ok: true,
      keyId: razorpayOrder.keyId,
      internalOrderId: order.orderId,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: "INR"
    });
  } catch (error) {
    if (error instanceof CustomerAuthError || error instanceof RazorpayConfigError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status || 503 });
    }
    console.error("[razorpay-create-order]", error);
    return NextResponse.json({ ok: false, error: "Unable to start secure payment." }, { status: 500 });
  }
}

async function createOrderPaymentLink(orderId, razorpayOrderId) {
  const supabase = createAdminSupabaseClient();
  if (!supabase || !orderId || !razorpayOrderId) return;
  await supabase.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", orderId);
}
