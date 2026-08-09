import { notFound } from "next/navigation";
import ProductDetailExperience from "@/components/ProductDetailExperience";
import { getActiveCategories } from "@/lib/data/categories";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { getProductSchemaAvailability } from "@/lib/productAvailability";
import {
  absoluteUrl,
  cleanSeoText,
  createPageMetadata,
  createProductMetaDescription,
  createProductSeoTitle,
  getDefaultOgImage
} from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

// Prerenders the catalog at build time so product pages are served from the CDN.
// Products created later fall back to on-demand rendering via dynamicParams.
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: {
        absolute: "Product Not Found | Karari Beauty"
      }
    };
  }

  return createPageMetadata({
    title: createProductSeoTitle(product),
    description: createProductMetaDescription(product),
    path: `/products/${product.slug}`,
    image: product.image || getDefaultOgImage(),
    imageAlt: cleanSeoText(product.name)
  });
}

function ProductJsonLd({ product, category }) {
  const images = product.galleryImages?.length
    ? product.galleryImages.map((item) => absoluteUrl(item.imageUrl))
    : product.image
      ? [absoluteUrl(product.image)]
      : [];
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const categoryHref = category?.href || "";
  const categoryName = cleanSeoText(category?.name || product.category);
  const availability = getProductSchemaAvailability(product.stockStatus);
  const offer = Number(product.price) > 0
    ? {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "INR",
        price: product.price,
        ...(availability ? { availability } : {}),
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@id": `${absoluteUrl("/")}#store` }
      }
    : null;
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: absoluteUrl("/")
    },
    ...(categoryHref && categoryName
      ? [{
          "@type": "ListItem",
          position: 2,
          name: categoryName,
          item: absoluteUrl(categoryHref)
        }]
      : []),
    {
      "@type": "ListItem",
      position: categoryHref && categoryName ? 3 : 2,
      name: cleanSeoText(product.name),
      item: productUrl
    }
  ];
  const productSchema = {
    "@type": "Product",
    "@id": `${productUrl}#product`,
    mainEntityOfPage: productUrl,
    name: cleanSeoText(product.name),
    ...(images.length ? { image: images } : {}),
    description: cleanSeoText(product.shortDescription || product.description),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    ...(offer ? { offers: offer } : {})
  };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      productSchema,
      {
        "@type": "BreadcrumbList",
        "@id": `${productUrl}#breadcrumb`,
        itemListElement: breadcrumbItems
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [product, categories, allProducts, siteSettings] = await Promise.all([
    getProductBySlug(slug),
    getActiveCategories(),
    getProducts(),
    getSiteSettings()
  ]);

  if (!product) {
    notFound();
  }

  const category = categories.find((item) => item.slug === product.categorySlug);
  const relatedProducts = await getRelatedProducts(product, 4);

  return (
    <>
      <ProductJsonLd product={product} category={category} />
      <ProductDetailExperience product={product} category={category} relatedProducts={relatedProducts} allProducts={allProducts} allCategories={categories} siteSettings={siteSettings} />
    </>
  );
}
