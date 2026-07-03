import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export class CustomerAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CustomerAdminError";
    this.status = status;
  }
}

function getAdminClientOrThrow() {
  const supabase = createAdminSupabaseClient();
  if (!supabase) throw new CustomerAdminError("Supabase setup required", 503);
  return supabase;
}

function mapCustomer(row) {
  const orders = row.orders || [];
  const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
  const latestOrder = sortedOrders[0] || null;

  return {
    id: row.id,
    fullName: row.full_name || "",
    phone: row.phone || "",
    email: row.email || "",
    country: row.country || "",
    city: row.city || "",
    address: row.address || "",
    totalOrders: orders.length,
    totalSpent,
    lastOrderDate: latestOrder?.created_at || "",
    latestOrderStatus: latestOrder?.status || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    orders: sortedOrders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status || "new",
      totalAmount: Number(order.total_amount || 0),
      createdAt: order.created_at
    }))
  };
}

function filterCustomers(customers, search) {
  const normalized = String(search || "").trim().toLowerCase();
  if (!normalized) return customers;

  return customers.filter((customer) => [
    customer.fullName,
    customer.phone,
    customer.email,
    customer.city,
    customer.country
  ].join(" ").toLowerCase().includes(normalized));
}

function sortCustomers(customers, sort = "newest") {
  const next = [...customers];

  if (sort === "oldest") return next.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  if (sort === "most-orders") return next.sort((a, b) => Number(b.totalOrders || 0) - Number(a.totalOrders || 0));
  if (sort === "highest-spent") return next.sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));
  if (sort === "recently-ordered") return next.sort((a, b) => new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0));

  return next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function getAdminCustomers(options = {}) {
  const supabase = getAdminClientOrThrow();

  const { data, error } = await supabase
    .from("customers")
    .select("*, orders(id, order_number, status, total_amount, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[karari-data] admin customers Supabase read failed.", error.message);
    throw new CustomerAdminError("Unable to load customers.", 500);
  }

  const customers = sortCustomers(filterCustomers((data || []).map(mapCustomer), options.search), options.sort);

  return {
    data: customers,
    mode: "supabase"
  };
}

export async function getCustomerOrderHistory(customerId) {
  const supabase = getAdminClientOrThrow();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new CustomerAdminError("Unable to load customer orders.", 500);

  return (data || []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status || "new",
    totalAmount: Number(order.total_amount || 0),
    createdAt: order.created_at
  }));
}

export async function getAdminCustomerById(customerId) {
  const supabase = getAdminClientOrThrow();

  const { data, error } = await supabase
    .from("customers")
    .select("*, orders(id, order_number, status, total_amount, created_at)")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new CustomerAdminError("Unable to load customer.", 500);
  if (!data) throw new CustomerAdminError("Customer not found.", 404);

  return mapCustomer(data);
}
