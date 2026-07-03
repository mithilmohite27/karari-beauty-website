import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function makeOrderNumber() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KB-${timestamp}-${suffix}`;
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
  const discountAmount = Number(orderPayload.discountAmount || 0);
  const totalAmount = Number(orderPayload.totalAmount ?? Math.max(subtotal - discountAmount, 0));

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
    payment_preference: orderPayload.paymentPreference || null,
    subtotal: subtotal,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    status: "new",
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

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name || "",
    customerPhone: row.customer_phone || "",
    customerEmail: row.customer_email || "",
    orderType: row.order_type || "domestic",
    paymentPreference: row.payment_preference || "",
    subtotal: Number(row.subtotal || 0),
    totalAmount: Number(row.total_amount || 0),
    status: row.status || "new",
    createdAt: row.created_at,
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
    }))
  };
}

export async function getAdminOrders() {
  const supabase = createAdminSupabaseClient();

  if (!supabase) {
    return {
      data: [],
      mode: "setup-required"
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[karari-data] admin orders Supabase read failed.", error.message);
    return {
      data: [],
      mode: "supabase"
    };
  }

  return {
    data: data.map(mapAdminOrder),
    mode: "supabase"
  };
}
