import { notFound } from "next/navigation";
import ProductDetailExperience from "@/components/ProductDetailExperience";
import { getActiveCategories } from "@/lib/data/categories";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/data/products";
import { absoluteUrl, getDefaultOgImage } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const title = `${product.name} | Karari Beauty`;
  const description = product.shortDescription || product.description;
  const url = absoluteUrl(`/products/${product.slug}`);
  const image = product.image || getDefaultOgImage();

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: product.name }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

function ProductJsonLd({ product, category }) {
  const image = product.image ? [product.image] : [getDefaultOgImage()];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image,
    description: product.shortDescription || product.description,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: "Karari Beauty"
    },
    category: category?.name || product.category,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "INR",
      price: product.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition"
    }
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const [product, categories, allProducts] = await Promise.all([getProductBySlug(slug), getActiveCategories(), getProducts()]);

  if (!product) {
    notFound();
  }

  const category = categories.find((item) => item.slug === product.categorySlug);
  const relatedProducts = await getRelatedProducts(product, 4);

  return (
    <>
      <ProductJsonLd product={product} category={category} />
      <ProductDetailExperience product={product} category={category} relatedProducts={relatedProducts} allProducts={allProducts} allCategories={categories} />
    </>
  );
}
