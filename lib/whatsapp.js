import { businessSettings } from "@/data/businessSettings";

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function createWhatsAppUrl({
  product,
  deliveryLocation = "",
  internationalInquiry = false,
  note = ""
}) {
  const message = [
    `Hi ${businessSettings.name},`,
    "I am interested in this product:",
    "",
    `Product: ${product?.name || "General inquiry"}`,
    `Category: ${product?.category || "Karari Beauty collection"}`,
    `Price: ${product?.price ? formatCurrency(product.price) : "Please share"}`,
    `Offer: ${product?.offer || "Please share available offers"}`,
    `Delivery Location: ${deliveryLocation || "Please confirm"}`,
    `International Inquiry: ${internationalInquiry ? "Yes" : "No"}`,
    "",
    note,
    "Please share availability, delivery details and payment options."
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${businessSettings.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
