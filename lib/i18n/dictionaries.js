/**
 * UI translations.
 *
 * Deliberately a plain dictionary rather than next-intl or react-i18next. The
 * storefront ships a large client bundle already, and this needs one thing:
 * look up a string by key. A framework would add weight and a routing model
 * (/en, /hi) that would fragment the ISR cache for every prerendered page.
 *
 * SCOPE - read before assuming a page is translated.
 * This covers interface chrome only: navigation, buttons, form labels, status
 * messages. Product names, descriptions and category copy come from Supabase
 * and are NOT translated by this file. See supabase/add-content-translations.sql
 * for the catalogue side; until that is populated, product text falls back to
 * whatever the admin entered.
 *
 * Adding a language: add an entry to LANGUAGES and a matching block below.
 * Any key missing from a translation falls back to English rather than
 * rendering the raw key.
 */

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" }
];

const en = {
  // Header and navigation
  "nav.collections": "Collections",
  "nav.account": "Account",
  "nav.wishlist": "Wishlist",
  "nav.cart": "Cart",
  "nav.viewed": "Viewed",
  "nav.search": "Search Rakhi, jewellery, bangles, gifts...",
  "nav.signIn": "Sign In",
  "nav.signOut": "Sign Out",
  "nav.country": "Country",
  "nav.currency": "Currency",
  "nav.language": "Language",
  "nav.recentlyViewed": "Recently Viewed",

  // Product
  "product.addToCart": "Add to Cart",
  "product.add": "Add",
  "product.buyNow": "Buy Now",
  "product.quickView": "Quick view",
  "product.outOfStock": "Out of stock",
  "product.explore": "Explore",

  // Cart
  "cart.title": "Your Cart",
  "cart.empty": "Your cart is empty.",
  "cart.subtotal": "Cart subtotal",
  "cart.checkout": "Proceed to Checkout",
  "cart.continueShopping": "Continue Shopping",
  "cart.remove": "Remove",
  "cart.quantity": "Quantity",

  // Checkout
  "checkout.title": "Secure Checkout",
  "checkout.customerDetails": "Customer Details",
  "checkout.deliveryDetails": "Delivery Details",
  "checkout.paymentMethod": "Payment Method",
  "checkout.orderSummary": "Order Summary",
  "checkout.showSummary": "Show order summary",
  "checkout.hideSummary": "Hide order summary",
  "checkout.fullName": "Full Name",
  "checkout.mobile": "Mobile Number",
  "checkout.email": "Email",
  "checkout.address": "Address",
  "checkout.city": "City",
  "checkout.state": "State",
  "checkout.pincode": "Pincode / ZIP",
  "checkout.deliveryNote": "Delivery Note",
  "checkout.payNow": "Pay Now",
  "checkout.placeCodOrder": "Place COD Order",
  "checkout.submitRequest": "Submit Order Request",
  "checkout.processing": "Processing…",
  "checkout.delivery": "Delivery",
  "checkout.freeDelivery": "Free delivery",
  "checkout.discount": "Discount",
  "checkout.total": "Total",
  "checkout.secureNote": "256-bit SSL encrypted · Secured by Razorpay",

  // Generic
  "common.items": "items",
  "common.item": "item",
  "common.loading": "Loading…",
  "common.required": "required"
};

const hi = {
  "nav.collections": "संग्रह",
  "nav.account": "खाता",
  "nav.wishlist": "पसंदीदा",
  "nav.cart": "कार्ट",
  "nav.viewed": "देखे गए",
  "nav.search": "राखी, ज्वेलरी, चूड़ियाँ, उपहार खोजें...",
  "nav.signIn": "साइन इन",
  "nav.signOut": "साइन आउट",
  "nav.country": "देश",
  "nav.currency": "मुद्रा",
  "nav.language": "भाषा",
  "nav.recentlyViewed": "हाल में देखे गए",

  "product.addToCart": "कार्ट में डालें",
  "product.add": "जोड़ें",
  "product.buyNow": "अभी खरीदें",
  "product.quickView": "झलक देखें",
  "product.outOfStock": "स्टॉक में नहीं",
  "product.explore": "देखें",

  "cart.title": "आपका कार्ट",
  "cart.empty": "आपका कार्ट खाली है।",
  "cart.subtotal": "कुल राशि",
  "cart.checkout": "चेकआउट करें",
  "cart.continueShopping": "खरीदारी जारी रखें",
  "cart.remove": "हटाएँ",
  "cart.quantity": "मात्रा",

  "checkout.title": "सुरक्षित चेकआउट",
  "checkout.customerDetails": "ग्राहक विवरण",
  "checkout.deliveryDetails": "डिलीवरी विवरण",
  "checkout.paymentMethod": "भुगतान का तरीका",
  "checkout.orderSummary": "ऑर्डर सारांश",
  "checkout.showSummary": "ऑर्डर सारांश देखें",
  "checkout.hideSummary": "सारांश छिपाएँ",
  "checkout.fullName": "पूरा नाम",
  "checkout.mobile": "मोबाइल नंबर",
  "checkout.email": "ईमेल",
  "checkout.address": "पता",
  "checkout.city": "शहर",
  "checkout.state": "राज्य",
  "checkout.pincode": "पिनकोड",
  "checkout.deliveryNote": "डिलीवरी निर्देश",
  "checkout.payNow": "अभी भुगतान करें",
  "checkout.placeCodOrder": "COD ऑर्डर करें",
  "checkout.submitRequest": "ऑर्डर अनुरोध भेजें",
  "checkout.processing": "प्रोसेस हो रहा है…",
  "checkout.delivery": "डिलीवरी",
  "checkout.freeDelivery": "मुफ़्त डिलीवरी",
  "checkout.discount": "छूट",
  "checkout.total": "कुल",
  "checkout.secureNote": "256-बिट SSL सुरक्षित · Razorpay द्वारा सुरक्षित",

  "common.items": "वस्तुएँ",
  "common.item": "वस्तु",
  "common.loading": "लोड हो रहा है…",
  "common.required": "आवश्यक"
};

const DICTIONARIES = { en, hi };

export function isSupportedLanguage(code) {
  return Object.prototype.hasOwnProperty.call(DICTIONARIES, String(code || ""));
}

/**
 * Look up a key. Falls back to English, then to the supplied fallback text, so
 * an untranslated key never renders as "checkout.payNow" to a customer.
 */
export function translate(language, key, fallback = "") {
  const dictionary = DICTIONARIES[language] || DICTIONARIES[DEFAULT_LANGUAGE];
  return dictionary[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? fallback ?? key;
}
