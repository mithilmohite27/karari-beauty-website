import { notFound } from "next/navigation";
import CollectionExperience from "@/components/CollectionExperience";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { absoluteUrl, getDefaultOgImage } from "@/lib/seo";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getCategory(slug) {
  return categories.find((category) => category.slug === slug);
}

function getCollectionProducts(category) {
  return products.filter((product) => {
    if (product.categorySlug) return product.categorySlug === category.slug;
    return slugify(product.category) === category.slug;
  });
}

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    return {
      title: {
        absolute: "Collection Not Found | Karari Beauty"
      }
    };
  }

  const title = `${category.name} Collection | Karari Beauty`;
  const description = `${category.description} Explore premium boutique products, gifts and seasonal collections from Karari Beauty.`;
  const image = category.image || getDefaultOgImage();

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: absoluteUrl(category.href)
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(category.href),
      images: [{ url: image, alt: `${category.name} collection from Karari Beauty` }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export default async function CollectionPage({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);

  if (!category) {
    notFound();
  }

  const collectionProducts = getCollectionProducts(category);
  const preferredRelatedCategories = (category.relatedCategorySlugs || [])
    .map((relatedSlug) => categories.find((item) => item.slug === relatedSlug))
    .filter(Boolean);
  const fallbackRelatedCategories = categories.filter((item) => item.id !== category.id && !preferredRelatedCategories.some((related) => related.id === item.id));
  const relatedCategories = [...preferredRelatedCategories, ...fallbackRelatedCategories].slice(0, 6);

  return <CollectionExperience category={category} products={collectionProducts} relatedCategories={relatedCategories} />;
}
