import { NextResponse } from "next/server";
import { createOrder } from "@/lib/data/orders";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeOrderType(value) {
  return value === "International Inquiry" ? "international" : "domestic";
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return { error: "Your cart is empty." };
  }

  const normalized = [];

  for (const item of items) {
    const productId = cleanString(item.productId || item.id);
    const name = cleanString(item.name || item.productName);
    const price = Number(item.price ?? item.unitPrice);
    const quantity = Number(item.quantity);

    if (!productId || !name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: "One or more cart items are invalid." };
    }

    normalized.push({
      productId,
      slug: cleanString(item.slug || item.productSlug),
      name,
      price,
      quantity,
      image: cleanString(item.image || item.productImage),
      categorySlug: cleanString(item.categorySlug)
    });
  }

  return { items: normalized };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const customer = body.customer || {};
    const delivery = body.delivery || {};
    const fullName = cleanString(customer.fullName || body.customerName);
    const phone = cleanString(customer.mobile || customer.phone || body.customerPhone);
    const email = cleanString(customer.email || body.customerEmail);
    const country = cleanString(delivery.country || body.deliveryCountry);
    const city = cleanString(delivery.city || body.deliveryCity);
    const address = cleanString(delivery.address || body.deliveryAddress);

    if (!fullName) {
      return NextResponse.json({ ok: false, error: "Customer name is required." }, { status: 400 });
    }

    if (!phone && !email) {
      return NextResponse.json({ ok: false, error: "Phone or email is required." }, { status: 400 });
    }

    if (!country || !city || !address) {
      return NextResponse.json({ ok: false, error: "Delivery country, city and address are required." }, { status: 400 });
    }

    const itemResult = validateItems(body.items);
    if (itemResult.error) {
      return NextResponse.json({ ok: false, error: itemResult.error }, { status: 400 });
    }

    const subtotal = itemResult.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await createOrder({
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      deliveryCountry: country,
      deliveryCity: city,
      deliveryAddress: address,
      orderType: normalizeOrderType(body.orderType),
      paymentPreference: cleanString(body.paymentPreference),
      notes: cleanString(delivery.note || body.notes),
      items: itemResult.items,
      subtotal,
      totalAmount: subtotal
    });

    return NextResponse.json({
      ok: true,
      order: {
        orderNumber: order.orderNumber,
        mode: order.mode,
        orderId: order.orderId || order.orderNumber
      }
    });
  } catch (error) {
    console.error("[orders-api] Failed to create order", error);
    return NextResponse.json({ ok: false, error: "Unable to submit order request. Please try again." }, { status: 500 });
  }
}
