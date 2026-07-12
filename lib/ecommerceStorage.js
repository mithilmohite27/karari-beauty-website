const CART_KEY = "karari-cart";
const BUY_NOW_KEY = "karari-buy-now";
const WISHLIST_KEY = "karari-wishlist";
const RECENTLY_VIEWED_KEY = "karari-recently-viewed";
const ORDERS_KEY = "karari_orders";
const LATEST_ORDER_KEY = "karari_latest_order";
const MAX_RECENTLY_VIEWED = 6;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function writeLocalJson(key, value) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readSessionJson(key, fallback) {
  if (!canUseSessionStorage()) return fallback;
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeSessionJson(key, value) {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function dispatchStorageEvent(eventName, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function readLocalJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function normalizeWishlistIds(items) {
  return items
    .map((item) => (typeof item === "string" ? item : item?.productId || item?.id))
    .filter(Boolean);
}

export function buildCartItem(product) {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.image,
    category: product.category,
    categorySlug: product.categorySlug,
    codAvailable: Boolean(product.codAvailable),
    quantity: 1
  };
}

export function reconcileCartItemsWithCatalog(items = [], catalog = []) {
  if (!Array.isArray(items) || !items.length || !Array.isArray(catalog) || !catalog.length) return items;

  return items
    .map((item) => {
      const product = catalog.find((entry) => entry.id === item.productId || entry.slug === item.slug);
      if (!product) return null;

      return {
        ...buildCartItem(product),
        quantity: Math.max(1, Number(item.quantity) || 1)
      };
    })
    .filter(Boolean);
}

function hasCartChanged(previousItems, nextItems) {
  return JSON.stringify(previousItems) !== JSON.stringify(nextItems);
}

export function getCartItems() {
  return readLocalJson(CART_KEY, []);
}

export function syncCartItemsWithCatalog(catalog = []) {
  const currentCart = getCartItems();
  const nextCart = reconcileCartItemsWithCatalog(currentCart, catalog);

  if (hasCartChanged(currentCart, nextCart)) {
    writeLocalJson(CART_KEY, nextCart);
    dispatchStorageEvent("cart:updated", nextCart);
  }

  return nextCart;
}

export function addToCart(product, quantity = 1) {
  const itemQuantity = Math.max(1, Number(quantity) || 1);
  const currentCart = getCartItems();
  const existingItem = currentCart.find((item) => item.productId === product.id);
  const nextCart = existingItem
    ? currentCart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: (Number(item.quantity) || 0) + itemQuantity }
          : item
      )
    : [...currentCart, { ...buildCartItem(product), quantity: itemQuantity }];

  writeLocalJson(CART_KEY, nextCart);
  dispatchStorageEvent("cart:updated", nextCart);
  return nextCart;
}

export function getCartCount() {
  return getCartItems().reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

export function updateCartItemQuantity(productId, quantity) {
  const nextQuantity = Math.max(0, Number(quantity) || 0);
  const currentCart = getCartItems();
  const nextCart = nextQuantity === 0
    ? currentCart.filter((item) => item.productId !== productId)
    : currentCart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: nextQuantity }
          : item
      );

  writeLocalJson(CART_KEY, nextCart);
  dispatchStorageEvent("cart:updated", nextCart);
  return nextCart;
}

export function removeCartItem(productId) {
  const nextCart = getCartItems().filter((item) => item.productId !== productId);
  writeLocalJson(CART_KEY, nextCart);
  dispatchStorageEvent("cart:updated", nextCart);
  return nextCart;
}

export function clearCart() {
  writeLocalJson(CART_KEY, []);
  dispatchStorageEvent("cart:updated", []);
  return [];
}

export function setBuyNowItem(product, quantity = 1) {
  const itemQuantity = Math.max(1, Number(quantity) || 1);
  const nextItem = { ...buildCartItem(product), quantity: itemQuantity };

  writeSessionJson(BUY_NOW_KEY, nextItem);
  dispatchStorageEvent("buyNow:updated", nextItem);
  return nextItem;
}

export function getBuyNowItem() {
  return readSessionJson(BUY_NOW_KEY, null);
}

export function syncBuyNowItemWithCatalog(catalog = []) {
  const currentItem = getBuyNowItem();
  if (!currentItem) return null;

  const nextItem = reconcileCartItemsWithCatalog([currentItem], catalog)[0] || null;
  if (!nextItem) {
    clearBuyNowItem();
    return null;
  }

  if (hasCartChanged([currentItem], [nextItem])) {
    writeSessionJson(BUY_NOW_KEY, nextItem);
    dispatchStorageEvent("buyNow:updated", nextItem);
  }

  return nextItem;
}

export function clearBuyNowItem() {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(BUY_NOW_KEY);
  dispatchStorageEvent("buyNow:updated", null);
  return null;
}

export function getCartSubtotal(items = getCartItems()) {
  return items.reduce((total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

export function getOrders() {
  return readLocalJson(ORDERS_KEY, []);
}

export function getLatestOrder() {
  return readLocalJson(LATEST_ORDER_KEY, null);
}

export function saveOrderRequest(order) {
  const orders = getOrders();
  const nextOrders = [order, ...orders];

  writeLocalJson(ORDERS_KEY, nextOrders);
  writeLocalJson(LATEST_ORDER_KEY, order);
  dispatchStorageEvent("orders:updated", order);
  return order;
}

export function getWishlistItems() {
  return normalizeWishlistIds(readLocalJson(WISHLIST_KEY, []));
}

export function toggleWishlist(product) {
  const current = getWishlistItems();
  const isWished = current.includes(product.id);
  const next = isWished ? current.filter((id) => id !== product.id) : [...current, product.id];

  writeLocalJson(WISHLIST_KEY, next);
  dispatchStorageEvent("wishlist:updated", next);
  return { items: next, isWished: !isWished };
}

export function getWishlistCount() {
  return getWishlistItems().length;
}

export function getRecentlyViewedIds() {
  return readLocalJson(RECENTLY_VIEWED_KEY, []);
}

export function getRecentlyViewed(catalog = []) {
  const storedIds = readLocalJson(RECENTLY_VIEWED_KEY, []);
  return storedIds
    .map((id) => catalog.find((product) => product.id === id))
    .filter(Boolean);
}

export function addRecentlyViewed(product, catalog = []) {
  const storedIds = readLocalJson(RECENTLY_VIEWED_KEY, []);
  const nextIds = [product.id, ...storedIds.filter((id) => id !== product.id)].slice(0, MAX_RECENTLY_VIEWED);
  const nextProducts = nextIds
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean);

  writeLocalJson(RECENTLY_VIEWED_KEY, nextIds);
  dispatchStorageEvent("recentlyViewed:updated", { ids: nextIds, products: nextProducts });
  return catalog.length ? nextProducts : nextIds;
}

export function getRecentlyViewedCount() {
  return getRecentlyViewedIds().length;
}
