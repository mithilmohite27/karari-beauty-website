const baseProducts = [
  {
    id: "rakhi-om-blue",
    name: "Divine Spiritual Om Rakhi",
    sku: "KB-RK-OM-101",
    category: "Rakhi",
    price: 449,
    offer: "Festive gift wrap included",
    collection: "Under ₹499",
    badge: "Featured",
    image: "/hero/raksha-bandhan-2026.png",
    description: "A premium blue and gold Rakhi inspired by spiritual motifs and clean festive styling."
  },
  {
    id: "rakhi-kids-set",
    name: "Set of 2 Kids Rakhi",
    sku: "KB-RK-KD-202",
    category: "Rakhi",
    price: 474,
    offer: "Pair pricing available",
    collection: "Under ₹499",
    badge: "Kids",
    image: "/hero/raksha-bandhan-2026.png",
    description: "Bright but refined kids Rakhi set with soft colors and playful festive detail."
  },
  {
    id: "rakhi-ek-onkar",
    name: "Ek Onkar Bracelet Rakhi for Brother",
    sku: "KB-RK-EK-303",
    category: "Rakhi",
    price: 379,
    offer: "Premium pouch included",
    collection: "Under ₹499",
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1000&q=80",
    description: "A bracelet style Rakhi with a meaningful motif and keepsake finish."
  },
  {
    id: "rakhi-bhabhi",
    name: "Elegant Bhabhi Rakhi",
    sku: "KB-RK-BH-404",
    category: "Rakhi",
    price: 125,
    offer: "Add roli chawal card",
    collection: "Under ₹199",
    badge: "Value Pick",
    image: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1000&q=80",
    description: "A graceful Bhabhi Rakhi with a delicate festive thread and elegant detailing."
  },
  {
    id: "combo-imported-chocolates",
    name: "Set of Two Rakhi with Imported Chocolates Combo",
    sku: "KB-CB-IM-505",
    category: "Gift Hampers",
    price: 1201,
    offer: "25% first order offer eligible",
    collection: "Premium Hampers",
    badge: "Combo",
    image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=1000&q=80",
    description: "Two Rakhi threads paired with imported chocolates for a polished brother-sister gift."
  },
  {
    id: "combo-ferrero-16",
    name: "Ferrero Rochers Chocolate 16 Pcs Pack",
    sku: "KB-GF-FR-616",
    category: "Gift Items",
    price: 699,
    offer: "Gift note available",
    collection: "Under ₹999",
    badge: "Gift Add-on",
    image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=1000&q=80",
    description: "A premium chocolate add-on for Rakhi hampers and festive gifting."
  },
  {
    id: "hamper-prosperous",
    name: "Prosperous Festive Gift Hamper",
    sku: "KB-HP-PR-707",
    category: "Gift Hampers",
    price: 4301,
    offer: "Custom hamper inquiry",
    collection: "Premium Hampers",
    badge: "Luxury",
    image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1000&q=80",
    description: "A refined festive hamper with sweets, dry fruits and premium gifting presentation."
  },
  {
    id: "jewellery-pearl-set",
    name: "Pearl Glow Jewellery Set",
    sku: "KB-JW-PL-808",
    category: "Jewellery",
    price: 1899,
    offer: "Boutique box packaging",
    collection: "Jewellery",
    badge: "Karari Edit",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80",
    description: "A soft pearl-inspired jewellery set for festive evenings and gifting."
  },
  {
    id: "bangles-antique-gold",
    name: "Antique Gold Bangle Pair",
    sku: "KB-BG-AG-909",
    category: "Bangles",
    price: 1499,
    offer: "Size confirmation on WhatsApp",
    collection: "Bangles",
    badge: "Occasion",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=80",
    description: "A classic antique-gold bangle pair with boutique festive shine."
  },
  {
    id: "bag-wine-evening",
    name: "Wine Evening Handbag",
    sku: "KB-HB-WN-110",
    category: "Handbags",
    price: 2299,
    offer: "Color options on inquiry",
    collection: "Handbags",
    badge: "New",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80",
    description: "A compact evening handbag with a polished finish for festive outfits."
  },
  {
    id: "watch-rose-classic",
    name: "Rose Classic Watch",
    sku: "KB-WT-RS-111",
    category: "Watches",
    price: 2499,
    offer: "Gift-ready packaging",
    collection: "Watches",
    badge: "Gift",
    image: "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1000&q=80",
    description: "An elegant watch option for thoughtful premium gifting."
  },
  {
    id: "wedding-basket-gold",
    name: "Golden Wedding Basket",
    sku: "KB-WB-GL-112",
    category: "Wedding Baskets",
    price: 3299,
    offer: "Customization available",
    collection: "Wedding Baskets",
    badge: "Custom",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80",
    description: "A premium basket base for wedding ceremonies, family gifts and presentation sets."
  },
  {
    id: "fancy-crystal-keepsake",
    name: "Crystal Fancy Keepsake",
    sku: "KB-FN-CR-113",
    category: "Fancy Items",
    price: 899,
    offer: "Gift wrap available",
    collection: "Fancy Items",
    badge: "Imported",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1000&q=80",
    description: "A polished fancy keepsake for gifting, decor and festive add-ons."
  },
  {
    id: "cosmetics-glow-kit",
    name: "Everyday Glow Cosmetics Kit",
    sku: "KB-CS-GL-114",
    category: "Cosmetics",
    price: 1299,
    offer: "Beauty combo inquiry",
    collection: "Cosmetics",
    badge: "Beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80",
    description: "A curated cosmetics kit with daily-use beauty essentials and a boutique finish."
  },
  {
    id: "ladies-wear-festive-dupatta",
    name: "Festive Ladies' Wear Dupatta",
    sku: "KB-LW-FD-115",
    category: "Ladies' Wear",
    price: 1599,
    offer: "Color options on inquiry",
    collection: "Ladies' Wear",
    badge: "Style",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80",
    description: "A graceful festive fashion piece curated for everyday and celebration styling."
  },
  {
    id: "crockery-tea-set",
    name: "Elegant Crockery Tea Set",
    sku: "KB-CR-TS-116",
    category: "Crockery",
    price: 2199,
    offer: "Packed for gifting",
    collection: "Crockery",
    badge: "Home Gift",
    image: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=1000&q=80",
    description: "An elegant crockery selection for home gifting and premium hosting."
  },
  {
    id: "imported-novelty-box",
    name: "Imported Novelty Gift Box",
    sku: "KB-IM-NV-117",
    category: "Imported Items",
    price: 1899,
    offer: "Imported selection",
    collection: "Imported Items",
    badge: "New",
    image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1000&q=80",
    description: "A premium imported gift selection with novelty appeal and boutique packaging."
  }
];

const categoryProductGroups = [
  {
    category: "Rakhi",
    categorySlug: "rakhi",
    image: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1000&q=80",
    tags: ["festival", "rakhi", "gifting"],
    products: [
      ["Royal Kundan Rakhi Set", 549, 699, "Festive Offer", "A refined Kundan rakhi set with traditional shine and gift-ready presentation."],
      ["Pearl Bead Rakhi Pair", 399, 499, "Pair Edit", "Soft pearl detailing for a graceful Raksha Bandhan celebration."],
      ["Designer Mauli Rakhi", 299, 399, "New Arrival", "A festive mauli rakhi with premium thread work and elegant accents."],
      ["Silver Charm Rakhi", 649, 799, "Premium Pick", "A keepsake-style rakhi with a polished charm finish for brothers."],
      ["Kids Cartoon Rakhi Combo", 349, 449, "Kids Edit", "A cheerful kids rakhi combo with bright details and festive packaging."]
    ]
  },
  {
    category: "Jewellery",
    categorySlug: "jewellery",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80",
    tags: ["jewellery", "styling", "gifting"],
    products: [
      ["Antique Pendant Jewellery Set", 2199, 2699, "Karari Edit", "An antique-inspired pendant set for festive dressing and gifting."],
      ["Rose Pearl Earrings", 899, 1099, "Gift Pick", "Pearl earrings with soft rose tones for daily elegance."],
      ["Meenakari Choker Set", 2499, 3199, "Occasion Edit", "A colourful choker set with festive meenakari detailing."],
      ["Gold Tone Bracelet", 799, 999, "Everyday Style", "A sleek bracelet for everyday polish and thoughtful gifting."],
      ["Crystal Stud Combo", 699, 899, "Value Combo", "A curated stud combo for easy styling across occasions."]
    ]
  },
  {
    category: "Bangles",
    categorySlug: "bangles",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=80",
    tags: ["bangles", "occasion", "traditional"],
    products: [
      ["Rose Gold Bangle Stack", 1299, 1599, "New Arrival", "A rose gold bangle stack with soft festive shimmer."],
      ["Kundan Bridal Bangles", 2299, 2799, "Bridal Edit", "Statement bangles with Kundan-inspired detailing for celebrations."],
      ["Daily Wear Bangle Pair", 699, 899, "Everyday Pick", "A comfortable bangle pair for simple daily styling."],
      ["Pearl Accent Bangles", 1199, 1499, "Premium Pick", "Pearl-accented bangles made for elegant occasion looks."],
      ["Traditional Red Chooda Set", 1799, 2199, "Festive Edit", "A traditional red chooda-style set for weddings and ceremonies."]
    ]
  },
  {
    category: "Handbags",
    categorySlug: "handbags",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80",
    tags: ["handbags", "fashion", "accessories"],
    products: [
      ["Blush Quilted Sling Bag", 1899, 2299, "New Arrival", "A blush sling bag with quilted texture and boutique appeal."],
      ["Classic Black Handbag", 2499, 2999, "Bestseller", "A structured handbag for daily wear and smart gifting."],
      ["Gold Chain Evening Clutch", 1599, 1999, "Party Edit", "A compact clutch with gold chain detailing for celebration looks."],
      ["Tan Everyday Tote", 2199, 2599, "Everyday Style", "A spacious tote designed for everyday styling and utility."],
      ["Pearl Embellished Potli", 999, 1299, "Festive Pick", "A festive potli bag with pearl accents and soft finish."]
    ]
  },
  {
    category: "Watches",
    categorySlug: "watches",
    image: "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1000&q=80",
    tags: ["watches", "gifting", "accessories"],
    products: [
      ["Gold Mesh Watch", 2299, 2699, "Gift Pick", "A sleek gold mesh watch for polished everyday wear."],
      ["Minimal Rose Watch", 1999, 2399, "New Arrival", "A minimal rose-tone watch designed for thoughtful gifting."],
      ["Classic Leather Watch", 1799, 2199, "Everyday Pick", "A classic leather strap watch with boutique simplicity."],
      ["Crystal Dial Watch", 2599, 3199, "Premium Pick", "A crystal-accented watch for refined festive styling."],
      ["Couple Watch Gift Set", 3999, 4899, "Gift Set", "A matching watch set for anniversaries and special occasions."]
    ]
  },
  {
    category: "Fancy Items",
    categorySlug: "fancy-items",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1000&q=80",
    tags: ["fancy", "novelty", "gifting"],
    products: [
      ["Decorative Crystal Showpiece", 1299, 1599, "Imported Pick", "A crystal showpiece selected for gifting and home styling."],
      ["Premium Vanity Mirror", 899, 1199, "Beauty Edit", "A compact vanity mirror with a polished boutique finish."],
      ["Elegant Keychain Gift Set", 499, 699, "Gift Add-on", "A premium keychain set for small yet memorable gifting."],
      ["Scented Candle Jar", 799, 999, "Home Gift", "A softly scented candle jar for calming decor and gifting."],
      ["Mini Jewellery Organizer", 999, 1299, "Useful Pick", "A compact organiser for jewellery, trinkets and travel essentials."]
    ]
  },
  {
    category: "Wedding Baskets",
    categorySlug: "wedding-baskets",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80",
    tags: ["wedding", "baskets", "gifting"],
    products: [
      ["Velvet Wedding Basket", 2799, 3299, "Custom Edit", "A velvet-finished basket for wedding rituals and premium gifting."],
      ["Floral Ceremony Basket", 1999, 2499, "Occasion Pick", "A floral basket designed for ceremonies and festive presentation."],
      ["Gold Trim Gift Basket", 2299, 2799, "Premium Pick", "A gold-trim basket for polished family gifting moments."],
      ["Bride Hamper Basket", 3499, 4299, "Wedding Edit", "A decorative hamper basket curated for bridal celebrations."],
      ["Traditional Pooja Basket", 1599, 1999, "Ritual Pick", "A traditional basket suited for pooja, ceremonies and festive gifting."]
    ]
  },
  {
    category: "Gift Items",
    categorySlug: "gift-items",
    image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1000&q=80",
    tags: ["gifts", "celebration", "hamper"],
    products: [
      ["Premium Celebration Gift Box", 1799, 2199, "Gift Edit", "A gift-ready box for birthdays, festivals and family celebrations."],
      ["Dry Fruit Gift Tray", 2499, 2999, "Festive Pick", "A premium dry fruit tray with elegant presentation."],
      ["Chocolate Gift Basket", 1299, 1599, "Sweet Gift", "A chocolate basket for thoughtful festive and birthday gifting."],
      ["Personal Care Gift Set", 999, 1299, "Useful Pick", "A curated personal care set for practical and warm gifting."],
      ["Luxury Keepsake Gift Hamper", 3999, 4899, "Luxury Edit", "A premium hamper with keepsake styling and celebration-ready details."]
    ]
  },
  {
    category: "Cosmetics",
    categorySlug: "cosmetics",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80",
    tags: ["cosmetics", "beauty", "makeup"],
    products: [
      ["Soft Glam Makeup Kit", 1599, 1999, "Beauty Edit", "A soft glam kit curated for daily and festive beauty looks."],
      ["Matte Lip Color Set", 799, 999, "Bestseller", "A set of matte lip colours for everyday use and gifting."],
      ["Glow Compact Powder", 599, 749, "Daily Pick", "A compact powder for smooth finishing and daily touch-ups."],
      ["Beauty Brush Set", 899, 1199, "Useful Pick", "A brush set for clean makeup application and beauty gifting."],
      ["Festive Eye Palette", 1299, 1699, "Festive Edit", "An eye palette with celebration-ready shades and soft shimmer."]
    ]
  },
  {
    category: "Ladies' Wear",
    categorySlug: "ladies-wear",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80",
    tags: ["fashion", "ladies-wear", "style"],
    products: [
      ["Printed Festive Kurti", 1199, 1499, "Style Pick", "A printed kurti for everyday comfort and festive styling."],
      ["Embroidered Dupatta", 999, 1299, "Festive Pick", "An embroidered dupatta for pairing with ethnic outfits."],
      ["Boutique Scarf Set", 699, 899, "Everyday Style", "A soft scarf set curated for daily wear and gifting."],
      ["Elegant Stole Wrap", 899, 1199, "New Arrival", "A refined stole wrap for layered styling and special outings."],
      ["Occasion Wear Tunic", 1499, 1899, "Occasion Edit", "A boutique tunic for celebrations and polished daywear."]
    ]
  },
  {
    category: "Crockery",
    categorySlug: "crockery",
    image: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=1000&q=80",
    tags: ["crockery", "home", "gifting"],
    products: [
      ["Floral Cup Saucer Set", 1299, 1599, "Home Gift", "A floral cup and saucer set for elegant tea-time gifting."],
      ["Ceramic Dinner Bowl Set", 1499, 1899, "Useful Pick", "A ceramic bowl set for hosting and home gifting."],
      ["Premium Serving Platter", 1799, 2199, "Premium Pick", "A serving platter designed for festive tables and special meals."],
      ["Glass Dessert Bowl Set", 999, 1299, "Dining Edit", "A dessert bowl set for celebrations and everyday hosting."],
      ["Decorative Tea Kettle", 2199, 2699, "Gift Pick", "A decorative kettle selected for home decor and gifting."]
    ]
  },
  {
    category: "Imported Items",
    categorySlug: "imported-items",
    image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1000&q=80",
    tags: ["imported", "premium", "novelty"],
    products: [
      ["Imported Beauty Organizer", 1499, 1899, "Imported Pick", "A premium imported organizer for beauty and daily essentials."],
      ["Novelty Gift Clock", 1299, 1599, "Gift Pick", "A novelty clock selected for distinctive home gifting."],
      ["Premium Aroma Diffuser", 1899, 2399, "Home Edit", "An aroma diffuser with premium styling and gift appeal."],
      ["Imported Travel Pouch", 899, 1199, "Useful Pick", "A compact imported pouch for travel, gifting and daily use."],
      ["Decorative Imported Tray", 1699, 2099, "Premium Finds", "An imported tray for decor, serving and celebration gifting."]
    ]
  }
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const generatedProducts = categoryProductGroups.flatMap((group, groupIndex) =>
  group.products.map(([name, price, originalPrice, discountLabel, description], itemIndex) => ({
    id: `${group.categorySlug}-${slugify(name)}`,
    slug: slugify(name),
    name,
    sku: `KB-${group.categorySlug.toUpperCase().slice(0, 2)}-${String(groupIndex + 1).padStart(2, "0")}${String(itemIndex + 1).padStart(2, "0")}`,
    category: group.category,
    categorySlug: group.categorySlug,
    price,
    originalPrice,
    discountLabel,
    rating: (4.6 + ((groupIndex + itemIndex) % 4) / 10).toFixed(1),
    image: group.image,
    description,
    shortDescription: description,
    isFeatured: itemIndex < 2,
    createdAt: `2026-06-${String(20 - ((groupIndex + itemIndex) % 12)).padStart(2, "0")}`,
    tags: group.tags
  }))
);

export const products = [...baseProducts, ...generatedProducts].map((product, index) => {
  const categorySlug = product.categorySlug || slugify(product.category);
  const slug = product.slug || slugify(product.name);

  return {
    ...product,
    slug,
    categorySlug,
    originalPrice: product.originalPrice || Math.ceil(product.price * 1.18),
    discountLabel: product.discountLabel || product.offer || "Karari Edit",
    rating: product.rating || (4.7 + (index % 3) / 10).toFixed(1),
    shortDescription: product.shortDescription || product.description,
    isFeatured: product.isFeatured ?? index < 18,
    createdAt: product.createdAt || `2026-06-${String(28 - (index % 18)).padStart(2, "0")}`,
    tags: product.tags || [categorySlug]
  };
});
