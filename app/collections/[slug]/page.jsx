import { notFound } from "next/navigation";
import CollectionExperience from "@/components/CollectionExperience";
import { getActiveCategories, getCategoryBySlug } from "@/lib/data/categories";
import { getProducts, getProductsByCategorySlug } from "@/lib/data/products";
import { absoluteUrl, getDefaultOgImage } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getActiveCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: {
        absolute: "Collection Not Found | Karari Beauty"
      }
    };
  }

  const href = category.href || `/collections/${category.slug}`;
  const title = `${category.name} Collection | Karari Beauty`;
  const description = `${category.description} Explore premium boutique products, gifts and seasonal collections from Karari Beauty.`;
  const image = category.image || getDefaultOgImage();

  return {
    title: {
      absolute: title
    },
    description,
    alternates: {
      canonical: absoluteUrl(href)
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(href),
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
  const [category, categories, collectionProducts, allProducts] = await Promise.all([
    getCategoryBySlug(slug),
    getActiveCategories(),
    getProductsByCategorySlug(slug),
    getProducts()
  ]);

  if (!category) {
    notFound();
  }

  const preferredRelatedCategories = (category.relatedCategorySlugs || [])
    .map((relatedSlug) => categories.find((item) => item.slug === relatedSlug))
    .filter(Boolean);
  const fallbackRelatedCategories = categories.filter((item) => item.slug !== category.slug && !preferredRelatedCategories.some((related) => related.slug === item.slug));
  const relatedCategories = [...preferredRelatedCategories, ...fallbackRelatedCategories].slice(0, 6);

  return <CollectionExperience category={category} products={collectionProducts} relatedCategories={relatedCategories} allProducts={allProducts} allCategories={categories} />;
}
