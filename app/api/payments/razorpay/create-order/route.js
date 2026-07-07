import { NextResponse } from "next/server";
import { CustomerAuthError, verifyCustomerRequest } from "@/lib/customerAuth";
import { createOrder } from "@/lib/data/orders";
import { getProducts } from "@/lib/data/products";
import { createRazorpayOrder, getRazorpayStatus, RazorpayConfigError } from "@/lib/razorpay";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeOrderType(value) {
  return value === "International Inquiry" ? "international" : "domestic";
}

function errorResponse(error, message, status = 400, details = "") {
  return NextResponse.json({ ok: false, error, message, details }, { status });
}

function logPaymentStartup(details = {}) {
  const razorpayStatus = getRazorpayStatus();
  console.info("[razorpay-create-order:start]", {
    hasPublicKey: razorpayStatus.hasPublicKey,
    hasServerKey: razorpayStatus.hasServerKey,
    hasServerSecret: razorpayStatus.hasServerSecret,
    keyMode: razorpayStatus.keyMode,
    finalAmount: details.finalAmount,
    amountInPaise: details.amountInPaise,
    itemCount: details.itemCount,
    hasCustomerEmail: details.hasCustomerEmail,
    hasCustomer: details.hasCustomer,
    paymentMethod: details.paymentMethod
  });
}

function logPaymentStep(step, details = {}) {
  console.info(`[razorpay-create-order:${step}]`, details);
}

function safeReceipt(value) {
  return cleanString(value).slice(0, 40) || `KB-${Date.now()}`;
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) return { error: "CART_EMPTY", message: "Cart is empty." };

  const normalized = [];
  for (const item of items) {
    const productId = cleanString(item.productId || item.id);
    const slug = cleanString(item.slug || item.productSlug);
    const quantity = Number(item.quantity);
    if ((!productId && !slug) || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: "CART_EMPTY", message: "One or more cart items are invalid." };
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
    if (!product) return { error: "CART_EMPTY", message: "One or more products are no longer available." };

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
  let startupLogDetails = {
    finalAmount: null,
    amountInPaise: null,
    itemCount: 0,
    hasCustomerEmail: false,
    hasCustomer: false,
    paymentMethod: "online"
  };

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
      return errorResponse("CUSTOMER_DETAILS_REQUIRED", "Customer details are required.", 400);
    }

    const itemResult = validateItems(body.items);
    if (itemResult.error) return errorResponse(itemResult.error, itemResult.message, 400);

    const pricedResult = await getServerPricedItems(itemResult.items);
    if (pricedResult.error) return errorResponse(pricedResult.error, pricedResult.message, 400);

    const subtotal = pricedResult.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryCharge = Math.max(0, Number(body.deliveryCharge) || 0);
    const discount = Math.max(0, Number(body.discount) || 0);
    const finalAmount = Number(body.finalAmount);
    const serverFinalAmount = Math.max(subtotal + deliveryCharge - discount, 0);
    const amount = Math.round(serverFinalAmount * 100);

    startupLogDetails = {
      finalAmount,
      amountInPaise: amount,
      itemCount: pricedResult.items.length,
      hasCustomerEmail: Boolean(email),
      hasCustomer: Boolean(fullName && phone),
      paymentMethod: "online"
    };
    logPaymentStartup(startupLogDetails);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0 || serverFinalAmount <= 0) {
      return errorResponse("INVALID_AMOUNT", "Final amount is required before payment.", 400);
    }

    if (Math.round(finalAmount * 100) !== Math.round(serverFinalAmount * 100)) {
      return errorResponse("INVALID_AMOUNT", "Final amount is required before payment.", 400);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return errorResponse("INVALID_AMOUNT", "Final amount is required before payment.", 400);
    }

    let order;
    try {
      logPaymentStep("supabase-order-insert-start", {
        finalAmount: serverFinalAmount,
        amountInPaise: amount,
        itemCount: pricedResult.items.length,
        hasCustomerEmail: Boolean(email),
        paymentMethod: "online"
      });
      order = await createOrder({
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
        deliveryCharge,
        discountAmount: discount,
        totalAmount: serverFinalAmount,
        status: "new"
      });
      logPaymentStep("supabase-order-insert-succeeded", {
        orderNumber: order.orderNumber,
        mode: order.mode || "unknown"
      });
    } catch (orderError) {
      console.error("[razorpay-create-order:supabase-order-insert-failed]", {
        message: orderError?.message || "Unknown Supabase order insert error",
        finalAmount: serverFinalAmount,
        amountInPaise: amount,
        itemCount: pricedResult.items.length,
        hasCustomerEmail: Boolean(email),
        paymentMethod: "online"
      });
      return errorResponse(
        "SUPABASE_ORDER_CREATE_FAILED",
        "Payment setup issue. Please try again or choose Pay after confirmation.",
        500,
        orderError?.message || "Unable to create draft order."
      );
    }

    let razorpayOrder;
    try {
      logPaymentStep("razorpay-order-create-started", {
        finalAmount: serverFinalAmount,
        amountInPaise: amount,
        itemCount: pricedResult.items.length,
        hasCustomerEmail: Boolean(email),
        paymentMethod: "online"
      });
      razorpayOrder = await createRazorpayOrder({
        amount,
        currency: "INR",
        receipt: safeReceipt(order.orderNumber),
        notes: {
          internal_order_id: cleanString(order.orderId),
          order_number: cleanString(order.orderNumber)
        }
      });
      logPaymentStep("razorpay-order-create-succeeded", {
        razorpayOrderCreated: Boolean(razorpayOrder?.id),
        amountInPaise: amount,
        keyMode: getRazorpayStatus().keyMode
      });
    } catch (razorpayError) {
      if (razorpayError instanceof RazorpayConfigError) throw razorpayError;
      console.error("[razorpay-create-order:api-error]", {
        message: razorpayError?.message || "Unknown Razorpay API error",
        finalAmount: serverFinalAmount,
        amountInPaise: amount,
        itemCount: pricedResult.items.length,
        hasCustomerEmail: Boolean(email)
      });
      return errorResponse(
        "RAZORPAY_ORDER_CREATE_FAILED",
        "Unable to create Razorpay order. Please try again.",
        502,
        razorpayError?.message || "Razorpay API failed."
      );
    }

    try {
      await createOrderPaymentLink(order.orderId, razorpayOrder.id);
      logPaymentStep("supabase-razorpay-link-succeeded", {
        orderNumber: order.orderNumber,
        razorpayOrderLinked: Boolean(razorpayOrder?.id)
      });
    } catch (linkError) {
      console.error("[razorpay-create-order:supabase-razorpay-link-failed]", {
        message: linkError?.message || "Unknown Supabase Razorpay link error",
        orderNumber: order.orderNumber,
        finalAmount: serverFinalAmount,
        amountInPaise: amount
      });
      return errorResponse(
        "SUPABASE_PAYMENT_LINK_FAILED",
        "Payment setup issue. Please try again or choose Pay after confirmation.",
        500,
        linkError?.message || "Unable to link Razorpay order."
      );
    }

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
    if (error instanceof CustomerAuthError) {
      return errorResponse("AUTH_REQUIRED", "Please sign in before payment.", error.status || 401);
    }
    if (error instanceof RazorpayConfigError) {
      const razorpayStatus = getRazorpayStatus();
      console.error("[razorpay-create-order:not-configured]", {
        hasPublicKey: razorpayStatus.hasPublicKey,
        hasServerKey: razorpayStatus.hasServerKey,
        hasServerSecret: razorpayStatus.hasServerSecret,
        keyMode: razorpayStatus.keyMode,
        finalAmount: startupLogDetails.finalAmount,
        amountInPaise: startupLogDetails.amountInPaise,
        itemCount: startupLogDetails.itemCount,
        hasCustomerEmail: startupLogDetails.hasCustomerEmail,
        hasCustomer: startupLogDetails.hasCustomer,
        paymentMethod: startupLogDetails.paymentMethod
      });
      return errorResponse("RAZORPAY_NOT_CONFIGURED", "Payment keys are not configured.", error.status || 503);
    }
    console.error("[razorpay-create-order:unexpected]", {
      message: error?.message || "Unknown error",
      finalAmount: startupLogDetails.finalAmount,
      amountInPaise: startupLogDetails.amountInPaise,
      itemCount: startupLogDetails.itemCount,
      hasCustomerEmail: startupLogDetails.hasCustomerEmail,
      hasCustomer: startupLogDetails.hasCustomer,
      paymentMethod: startupLogDetails.paymentMethod
    });
    return errorResponse(
      "RAZORPAY_ORDER_CREATE_FAILED",
      "Unable to create Razorpay order. Please try again.",
      500,
      error?.message || "Unexpected payment startup error."
    );
  }
}

async function createOrderPaymentLink(orderId, razorpayOrderId) {
  const supabase = createAdminSupabaseClient();
  if (!supabase || !orderId || !razorpayOrderId) return;
  const { error } = await supabase.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", orderId);
  if (error) throw new Error(`Unable to link Razorpay order: ${error.message}`);
}
