import { NextResponse } from "next/server";
import { CustomerAuthError, verifyCustomerRequest } from "@/lib/customerAuth";
import { createOrder } from "@/lib/data/orders";
import { getProducts } from "@/lib/data/products";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeOrderType(value) {
  return value === "International Inquiry" ? "international" : "domestic";
}

function normalizePaymentMethod(value, preference) {
  const method = cleanString(value).toLowerCase();
  if (method === "cod") return "cod";
  if (method === "pending_confirmation") return "pending_confirmation";
  if (method === "online") return "online";
  if (cleanString(preference).toLowerCase().includes("cash on delivery")) return "cod";
  if (cleanString(preference).toLowerCase().includes("confirmation")) return "pending_confirmation";
  return "online";
}

function getPaymentLabel(method, preference) {
  const selected = cleanString(preference);
  if (selected) return selected;
  if (method === "pending_confirmation") return "Pay after confirmation";
  return method === "cod" ? "Cash on Delivery" : "Pay securely online";
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

async function getServerPricedItems(items) {
  const products = await getProducts();
  const normalized = [];

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId || entry.slug === item.slug);
    if (!product) return { error: "One or more products are no longer available." };

    normalized.push({
      ...item,
      price: Number(product.price || 0),
      name: product.name,
      slug: product.slug,
      image: product.image,
      categorySlug: product.categorySlug,
      codAvailable: Boolean(product.codAvailable)
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
    const pricedResult = await getServerPricedItems(itemResult.items);
    if (pricedResult.error) {
      return NextResponse.json({ ok: false, error: pricedResult.error }, { status: 400 });
    }

    const paymentMethod = normalizePaymentMethod(body.paymentMethod, body.paymentPreference);
    if (!["cod", "pending_confirmation"].includes(paymentMethod)) {
      return NextResponse.json({ ok: false, error: "Online payments must use Razorpay checkout." }, { status: 400 });
    }

    const totalQuantity = pricedResult.items.reduce((sum, item) => sum + item.quantity, 0);
    const codEligible = totalQuantity >= 10 && pricedResult.items.every((item) => item.codAvailable);
    if (paymentMethod === "cod" && !codEligible) {
      return NextResponse.json({ ok: false, error: "Cash on Delivery is available only for eligible products and orders with 10 or more items." }, { status: 400 });
    }

    const subtotal = pricedResult.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryCharge = Math.max(0, Number(body.deliveryCharge) || 0);
    const discount = Math.max(0, Number(body.discount) || 0);
    const finalAmount = Math.max(subtotal + deliveryCharge - discount, 0);
    const order = await createOrder({
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      deliveryCountry: country,
      deliveryCity: city,
      deliveryAddress: address,
      orderType: normalizeOrderType(body.orderType),
      paymentMethod,
      paymentPreference: getPaymentLabel(paymentMethod, body.paymentPreference),
      paymentStatus: paymentMethod === "cod" ? "cod_pending" : "pending_confirmation",
      paymentGateway: paymentMethod === "cod" ? "cod" : "manual_confirmation",
      codSelected: paymentMethod === "cod",
      codEligible,
      notes: cleanString(delivery.note || body.notes),
      items: pricedResult.items,
      subtotal,
      totalAmount: finalAmount
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
    if (error instanceof CustomerAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[orders-api] Failed to create order", error);
    return NextResponse.json({ ok: false, error: "Unable to submit order request. Please try again." }, { status: 500 });
  }
}
