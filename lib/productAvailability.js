const STOCK_DETAILS = {
  unknown: {
    label: "Available to order",
    schemaAvailability: null,
    purchasable: true
  },
  in_stock: {
    label: "In stock",
    schemaAvailability: "https://schema.org/InStock",
    purchasable: true
  },
  low_stock: {
    label: "Low stock",
    schemaAvailability: "https://schema.org/LimitedAvailability",
    purchasable: true
  },
  out_of_stock: {
    label: "Out of stock",
    schemaAvailability: "https://schema.org/OutOfStock",
    purchasable: false
  },
  preorder: {
    label: "Pre-order",
    schemaAvailability: "https://schema.org/PreOrder",
    purchasable: true
  },
  made_to_order: {
    label: "Made to order",
    schemaAvailability: null,
    purchasable: true
  }
};

export function getProductStockDetails(stockStatus = "unknown") {
  return STOCK_DETAILS[stockStatus] || STOCK_DETAILS.unknown;
}

export function getProductSchemaAvailability(stockStatus) {
  return getProductStockDetails(stockStatus).schemaAvailability;
}

export function isProductPurchasable(stockStatus) {
  return getProductStockDetails(stockStatus).purchasable;
}

export function getProductOrderDetails(product = {}) {
  const stockDetails = getProductStockDetails(product.stockStatus);
  const numericPrice = Number(product.price);
  const hasValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  return {
    ...stockDetails,
    hasValidPrice,
    label: hasValidPrice ? stockDetails.label : "Price on request",
    purchasable: stockDetails.purchasable && hasValidPrice
  };
}
