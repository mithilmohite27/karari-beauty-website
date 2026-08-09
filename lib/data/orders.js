import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const ORDER_STATUSES = ["new", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"];
const ORDER_STATUS_SET = new Set(ORDER_STATUSES);
export const PAYMENT_STATUSES = ["pending", "pending_confirmation", "submitted", "verified", "paid", "failed", "cod_pending", "refunded"];
const PAYMENT_STATUS_SET = new Set(PAYMENT_STATUSES);

export class OrderAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "OrderAdminError";
    this.status = status;
  }
}

function makeOrderNumber() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KB-${timestamp}-${suffix}`;
}

function getAdminClientOrThrow() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new OrderAdminError("Supabase setup required", 503);
  return supabase;
}

function getAdminDisplayName(adminUser = {}) {
  return adminUser.admin?.full_name || adminUser.user?.user_metadata?.full_name || adminUser.user?.email || "Karari Admin";
}

function normalizeOrderStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!ORDER_STATUS_SET.has(normalized)) throw new OrderAdminError("Please choose a valid order status.");
  return normalized;
}

function normalizePaymentStatus(status) {
  const normalized = String(status || "pending").trim().toLowerCase();
  if (!PAYMENT_STATUS_SET.has(normalized)) throw new OrderAdminError("Please choose a valid payment status.");
  return normalized;
}

function cleanNote(note) {
  return String(note || "").trim();
}

function appendNote(existingNotes, note, adminUser) {
  const nextNote = cleanNote(note);
  if (!nextNote) return existingNotes || null;

  const timestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const entry = `[${timestamp}] ${getAdminDisplayName(adminUser)}: ${nextNote}`;
  return [existingNotes, entry].filter(Boolean).join("\n");
}

function normalizeItems(items = []) {
  return items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.price || item.unitPrice || 0);

    return {
      product_id: item.productId || null,
      product_name: item.name || item.productName || "Karari Beauty Product",
      product_slug: item.slug || item.productSlug || null,
      product_image: item.image || item.productImage || null,
      category_slug: item.categorySlug || null,
      unit_price: unitPrice,
      quantity,
      line_total: unitPrice * quantity
    };
  });
}

export async function createOrder(orderPayload = {}) {
  const supabase = createAdminSupabaseClient();
  const orderNumber = orderPayload.orderNumber || makeOrderNumber();
  const items = normalizeItems(orderPayload.items);
  const subtotal = Number(orderPayload.subtotal ?? items.reduce((sum, item) => sum + item.line_total, 0));
  const deliveryCharge = Number(orderPayload.deliveryCharge || 0);
  const discountAmount = Number(orderPayload.discountAmount || 0);
  const totalAmount = Number(orderPayload.totalAmount ?? Math.max(subtotal + deliveryCharge - discountAmount, 0));

  if (!supabase) {
    return {
      ok: true,
      mode: "mock",
      orderNumber,
      message: "Supabase is not configured. Order creation is using the Phase 1 mock response."
    };
  }

  const customerPayload = {
    full_name: orderPayload.customerName || orderPayload.customer?.name || null,
    phone: orderPayload.customerPhone || orderPayload.customer?.phone || null,
    email: orderPayload.customerEmail || orderPayload.customer?.email || null,
    country: orderPayload.deliveryCountry || orderPayload.customer?.country || null,
    city: orderPayload.deliveryCity || orderPayload.customer?.city || null,
    address: orderPayload.deliveryAddress || orderPayload.customer?.address || null
  };

  const { data: customer, error: customerError } = await supabase.from("customers").insert(customerPayload).select("id").single();
  if (customerError) throw new Error(`Unable to create customer: ${customerError.message}`);

  const orderRecord = {
    order_number: orderNumber,
    customer_id: customer.id,
    customer_name: customerPayload.full_name,
    customer_phone: customerPayload.phone,
    customer_email: customerPayload.email,
    delivery_country: customerPayload.country,
    delivery_city: customerPayload.city,
    delivery_address: customerPayload.address,
    order_type: orderPayload.orderType || "domestic",
    payment_gateway: orderPayload.paymentGateway || null,
    payment_method: orderPayload.paymentMethod || null,
    payment_preference: orderPayload.paymentPreference || null,
    payment_status: normalizePaymentStatus(orderPayload.paymentStatus || "pending"),
    payment_reference: orderPayload.paymentReference || null,
    payment_transaction_id: orderPayload.paymentTransactionId || null,
    payment_note: orderPayload.paymentNote || null,
    razorpay_order_id: orderPayload.razorpayOrderId || null,
    razorpay_payment_id: orderPayload.razorpayPaymentId || null,
    razorpay_signature: orderPayload.razorpaySignature || null,
    razorpay_signature_verified: Boolean(orderPayload.razorpaySignatureVerified),
    payment_verified_at: orderPayload.paymentVerifiedAt || null,
    payment_failure_reason: orderPayload.paymentFailureReason || null,
    cod_selected: Boolean(orderPayload.codSelected),
    cod_eligible: Boolean(orderPayload.codEligible),
    subtotal: subtotal,
    delivery_charge: deliveryCharge,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    status: orderPayload.status || "new",
    notes: orderPayload.notes || null
  };

  const { data: order, error: orderError } = await supabase.from("orders").insert(orderRecord).select("id, order_number").single();
  if (orderError) throw new Error(`Unable to create order: ${orderError.message}`);

  if (items.length) {
    const { error: itemsError } = await supabase.from("order_items").insert(items.map((item) => ({ ...item, order_id: order.id })));
    if (itemsError) throw new Error(`Unable to create order items: ${itemsError.message}`);
  }

  return {
    ok: true,
    mode: "supabase",
    orderId: order.id,
    orderNumber: order.order_number
  };
}

function mapAdminOrder(row) {
  const items = row.order_items || [];
  const history = row.order_status_history || [];

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    customerEmail: row.customer_email || "",
    deliveryCountry: row.delivery_country || "",
    deliveryCity: row.delivery_city || "",
    deliveryAddress: row.delivery_address || "",
    orderType: row.order_type || "domestic",
    paymentGateway: row.payment_gateway || "",
    paymentMethod: row.payment_method || "",
    paymentPreference: row.payment_preference || "",
    paymentStatus: row.payment_status || "pending",
    paymentReference: row.payment_reference || "",
    paymentTransactionId: row.payment_transaction_id || "",
    paymentNote: row.payment_note || "",
    razorpayOrderId: row.razorpay_order_id || "",
    razorpayPaymentId: row.razorpay_payment_id || "",
    razorpaySignature: row.razorpay_signature || "",
    razorpaySignatureVerified: Boolean(row.razorpay_signature_verified),
    paymentVerifiedAt: row.payment_verified_at || "",
    paymentFailureReason: row.payment_failure_reason || "",
    codSelected: Boolean(row.cod_selected),
    codEligible: Boolean(row.cod_eligible),
    subtotal: Number(row.subtotal || 0),
    deliveryCharge: Number(row.delivery_charge || 0),
    discountAmount: Number(row.discount_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    status: row.status || "new",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemsCount: items.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    items: items.map((item) => ({
      id: item.id,
      productName: item.product_name,
      productSlug: item.product_slug,
      productImage: item.product_image,
      categorySlug: item.category_slug,
      unitPrice: Number(item.unit_price || 0),
      quantity: Number(item.quantity || 0),
      lineTotal: Number(item.line_total || 0)
    })),
    timeline: history.map((item) => ({
      id: item.id,
      fromStatus: item.from_status || "",
      toStatus: item.to_status || "",
      note: item.note || "",
      changedBy: item.changed_by || "",
      changedByName: item.changed_by_name || "",
      createdAt: item.created_at
    }))
  };
}

function applyOrderSort(query, sort = "newest") {
  if (sort === "oldest") return query.order("created_at", { ascending: true });
  if (sort === "total-high") return query.order("total_amount", { ascending: false });
  if (sort === "total-low") return query.order("total_amount", { ascending: true });
  return query.order("created_at", { ascending: false });
}

// Deliberately generous: the admin list has no paging control yet, so the
// default must not silently hide orders. It only caps pathological growth.
// Reduce this once the orders screen can page through results.
const ADMIN_ORDERS_DEFAULT_PAGE_SIZE = 200;
const ADMIN_ORDERS_MAX_PAGE_SIZE = 500;

/**
 * PostgREST `or()` takes a comma-separated filter string, so any comma, paren
 * or dot in user input would be parsed as filter syntax rather than as a search
 * term. Strip those along with the LIKE wildcards.
 */
function sanitizeOrderSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[%_,().*"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function getAdminOrders(options = {}) {
  const supabase = getAdminClientOrThrow();
  const search = sanitizeOrderSearch(options.search);
  const status = String(options.status || "").trim();
  const sort = String(options.sort || "newest").trim();

  const requestedPageSize = Number(options.pageSize);
  const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
    ? Math.min(Math.trunc(requestedPageSize), ADMIN_ORDERS_MAX_PAGE_SIZE)
    : ADMIN_ORDERS_DEFAULT_PAGE_SIZE;
  const requestedPage = Number(options.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 1 ? Math.trunc(requestedPage) : 1;
  const from = (page - 1) * pageSize;

  // Bounded by design: this previously pulled every order with all of its items
  // on each admin page load, so cost grew without limit as orders accumulated.
  let query = supabase
    .from("orders")
    .select("*, order_items(*)", { count: "exact" })
    .range(from, from + pageSize - 1);

  if (status && ORDER_STATUS_SET.has(status)) query = query.eq("status", status);
  if (search) {
    query = query.or([
      `order_number.ilike.%${search}%`,
      `customer_name.ilike.%${search}%`,
      `customer_phone.ilike.%${search}%`,
      `customer_email.ilike.%${search}%`
    ].join(","));
  }

  const { data, error, count } = await applyOrderSort(query, sort);

  if (error) {
    console.warn("[karari-data] admin orders Supabase read failed.", error.message);
    throw new OrderAdminError("Unable to load orders.", 500);
  }

  return {
    data: data.map(mapAdminOrder),
    mode: "supabase",
    page,
    pageSize,
    total: count ?? data.length,
    hasMore: count === null ? data.length === pageSize : from + data.length < count
  };
}

export async function getAdminOrderById(orderId) {
  const supabase = getAdminClientOrThrow();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", orderId)
    .order("created_at", { foreignTable: "order_status_history", ascending: false })
    .maybeSingle();

  if (error) throw new OrderAdminError("Unable to load order.", 500);
  if (!data) throw new OrderAdminError("Order not found.", 404);

  return mapAdminOrder(data);
}

async function insertOrderTimeline(supabase, order, { toStatus, note }, adminUser) {
  const { error } = await supabase.from("order_status_history").insert({
    order_id: order.id,
    from_status: order.status || null,
    to_status: toStatus,
    note: cleanNote(note) || null,
    changed_by: adminUser.user?.id || null,
    changed_by_name: getAdminDisplayName(adminUser)
  });

  if (error) throw new OrderAdminError("Unable to save order timeline.", 500);
}

export async function updateAdminOrderStatus(orderId, payload = {}, adminUser = {}) {
  const supabase = getAdminClientOrThrow();
  const hasOrderStatus = Object.prototype.hasOwnProperty.call(payload, "status") && payload.status;
  const hasPaymentStatus = Object.prototype.hasOwnProperty.call(payload, "paymentStatus") && payload.paymentStatus;
  const note = cleanNote(payload.note);

  const { data: existingOrder, error: loadError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (loadError) throw new OrderAdminError("Unable to load order.", 500);
  if (!existingOrder) throw new OrderAdminError("Order not found.", 404);

  const nextStatus = hasOrderStatus ? normalizeOrderStatus(payload.status) : existingOrder.status || "new";
  const nextPaymentStatus = hasPaymentStatus ? normalizePaymentStatus(payload.paymentStatus) : existingOrder.payment_status || "pending";
  const statusChanged = existingOrder.status !== nextStatus;
  const paymentStatusChanged = (existingOrder.payment_status || "pending") !== nextPaymentStatus;
  const nextNotes = note ? appendNote(existingOrder.notes, note, adminUser) : existingOrder.notes || null;
  const updatePayload = {
    notes: nextNotes
  };

  if (hasOrderStatus) updatePayload.status = nextStatus;
  if (hasPaymentStatus) updatePayload.payment_status = nextPaymentStatus;

  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (updateError) throw new OrderAdminError("Unable to update order.", 500);
  const paymentNote = paymentStatusChanged ? `Payment status updated to ${nextPaymentStatus}.` : "";
  const timelineNote = [note, paymentNote].filter(Boolean).join("\n");
  if (statusChanged || paymentStatusChanged || note) {
    await insertOrderTimeline(supabase, existingOrder, { toStatus: nextStatus, note: timelineNote }, adminUser);
  }

  return getAdminOrderById(orderId);
}

// Once an order has moved past confirmation an admin is fulfilling it. A late or
// retried webhook must not drag it back to "confirmed".
const FULFILMENT_IN_PROGRESS_STATUSES = new Set(["processing", "packed", "shipped", "delivered", "cancelled"]);

/**
 * Apply a Razorpay payment result to the order it belongs to.
 *
 * Called from two racing sources: the browser's verify call and Razorpay's
 * webhook (which retries on any non-2xx). Both can deliver the same capture
 * more than once and in either order, so this is written to be idempotent and
 * to never downgrade a settled payment.
 */
export async function updateOrderPaymentByRazorpayOrderId(razorpayOrderId, payload = {}) {
  const supabase = getAdminClientOrThrow();
  const paymentStatus = normalizePaymentStatus(payload.paymentStatus || "paid");

  const { data: existingOrder, error: loadError } = await supabase
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (loadError) throw new OrderAdminError("Unable to load order for this payment.", 500);
  if (!existingOrder) throw new OrderAdminError("Order not found for this payment.", 404);

  const currentPaymentStatus = existingOrder.payment_status || "pending";

  // Replay of a capture we already recorded.
  if (currentPaymentStatus === "paid" && paymentStatus === "paid") {
    return getAdminOrderById(existingOrder.id);
  }

  // Razorpay emits payment.failed for a failed *attempt*. If the customer
  // retried and succeeded, that failure can arrive after the capture; applying
  // it would mark a genuinely paid order as failed.
  if (currentPaymentStatus === "paid" && paymentStatus === "failed") {
    console.warn("[karari-orders] Ignoring late payment.failed for an already-captured order.", {
      orderNumber: existingOrder.order_number,
      razorpayOrderId
    });
    return getAdminOrderById(existingOrder.id);
  }

  // Defence in depth behind signature verification: the captured amount must
  // match what we asked Razorpay to collect. A mismatch is flagged for manual
  // review rather than silently confirmed.
  //
  // Only meaningful for INR. Orders stored in INR but charged in another
  // currency cannot be compared without the exchange rate used at the time, so
  // comparing would flag every legitimate international payment.
  const capturedPaise = Number(payload.amountPaise);
  const capturedCurrency = String(payload.currency || "INR").toUpperCase();

  if (paymentStatus === "paid" && capturedCurrency !== "INR") {
    console.info("[karari-orders] Skipping amount check for a non-INR capture.", {
      orderNumber: existingOrder.order_number,
      capturedCurrency,
      capturedMinorUnits: capturedPaise
    });
  } else if (paymentStatus === "paid" && Number.isFinite(capturedPaise)) {
    const expectedPaise = Math.round(Number(existingOrder.total_amount || 0) * 100);

    if (Math.round(capturedPaise) !== expectedPaise) {
      console.error("[karari-orders] Razorpay captured amount does not match the order total.", {
        orderNumber: existingOrder.order_number,
        expectedPaise,
        capturedPaise
      });

      await supabase
        .from("orders")
        .update({
          payment_status: "submitted",
          payment_failure_reason: `Captured amount ${capturedPaise} paise does not match order total ${expectedPaise} paise. Manual review required.`,
          razorpay_payment_id: payload.razorpayPaymentId || null
        })
        .eq("id", existingOrder.id);

      throw new OrderAdminError("Captured payment amount does not match the order total.", 409);
    }
  }

  const updatePayload = {
    payment_gateway: "razorpay",
    payment_method: "online",
    payment_status: paymentStatus
  };

  // Only a successful payment advances the order, and only while it is still
  // awaiting confirmation. A failure leaves the workflow status untouched.
  if (paymentStatus === "paid" && !FULFILMENT_IN_PROGRESS_STATUSES.has(existingOrder.status)) {
    updatePayload.status = "confirmed";
  }

  if (Object.prototype.hasOwnProperty.call(payload, "razorpayPaymentId")) {
    updatePayload.razorpay_payment_id = payload.razorpayPaymentId || null;
    updatePayload.payment_transaction_id = payload.razorpayPaymentId || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "razorpaySignature")) updatePayload.razorpay_signature = payload.razorpaySignature || null;
  if (Object.prototype.hasOwnProperty.call(payload, "razorpaySignatureVerified")) updatePayload.razorpay_signature_verified = Boolean(payload.razorpaySignatureVerified);
  if (Object.prototype.hasOwnProperty.call(payload, "paymentVerifiedAt")) updatePayload.payment_verified_at = payload.paymentVerifiedAt || null;
  if (Object.prototype.hasOwnProperty.call(payload, "paymentFailureReason")) updatePayload.payment_failure_reason = payload.paymentFailureReason || null;

  // Guard on the payment status we just read so two concurrent deliveries can
  // not both believe they were the first to mark this order paid.
  const { data: order, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", existingOrder.id)
    .eq("payment_status", currentPaymentStatus)
    .select("*")
    .maybeSingle();

  if (error) throw new OrderAdminError("Unable to update payment status.", 500);

  // Lost the race: another delivery updated the row first. Its result stands.
  if (!order) return getAdminOrderById(existingOrder.id);

  if (paymentStatus === "paid") {
    await applyOrderInventory(supabase, order);
  }

  return getAdminOrderById(order.id);
}

/**
 * Decrement stock for a newly paid order.
 *
 * Delegates to the `apply_order_inventory` Postgres function so the read,
 * decrement and "already applied" flag happen in one atomic statement instead
 * of a read-modify-write from the app. Inventory must never fail a payment that
 * Razorpay has already captured, so problems are logged and swallowed.
 */
async function applyOrderInventory(supabase, order) {
  const { error } = await supabase.rpc("apply_order_inventory", { p_order_id: order.id });

  if (error) {
    console.error("[karari-orders] Inventory was not applied for a paid order. Adjust stock manually.", {
      orderNumber: order.order_number,
      orderId: order.id,
      message: error.message
    });
  }
}

export async function updateAdminOrderNotes(orderId, payload = {}, adminUser = {}) {
  const supabase = getAdminClientOrThrow();
  const note = cleanNote(payload.note);
  if (!note) throw new OrderAdminError("Please add an internal note.");

  const { data: existingOrder, error: loadError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (loadError) throw new OrderAdminError("Unable to load order.", 500);
  if (!existingOrder) throw new OrderAdminError("Order not found.", 404);

  const { error: updateError } = await supabase
    .from("orders")
    .update({ notes: appendNote(existingOrder.notes, note, adminUser) })
    .eq("id", orderId);

  if (updateError) throw new OrderAdminError("Unable to update order notes.", 500);
  await insertOrderTimeline(supabase, existingOrder, { toStatus: existingOrder.status || "new", note }, adminUser);

  return getAdminOrderById(orderId);
}
