import { notFound } from "next/navigation";
import CollectionExperience from "@/components/CollectionExperience";
import { getActiveCategories, getCategoryBySlug } from "@/lib/data/categories";
import { getProducts, getProductsByCategorySlug } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/data/siteSettings";
import { absoluteUrl, cleanSeoText, createPageMetadata, getDefaultOgImage } from "@/lib/seo";

export const revalidate = 3600;
// Categories added after a deploy still render on demand and are cached from
// then on, rather than 404ing.
export const dynamicParams = true;

// Without this the route has no prerendered entry and every request is rendered
// on demand with no-store, which is what kept collections off the CDN.
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
      },
      // This route streams a loading shell before the category lookup resolves,
      // so the response has already committed 200 by the time notFound() runs -
      // a soft 404. Until that is restructured, keep search engines from
      // indexing unknown collection URLs as real pages.
      robots: { index: false, follow: false }
    };
  }

  const href = category.href || `/collections/${category.slug}`;
  return createPageMetadata({
    title: `${category.name} Collection`,
    description: `${category.description} Shop the ${category.name.toLowerCase()} collection online from Karari Beauty with delivery across India.`,
    path: href,
    image: category.image || getDefaultOgImage(),
    imageAlt: `${category.name} collection at Karari Beauty`
  });
}

function CollectionJsonLd({ category, products }) {
  const href = category.href || `/collections/${category.slug}`;
  const url = absoluteUrl(href);
  const name = `${cleanSeoText(category.name)} Collection`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name,
        description: cleanSeoText(category.description),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: cleanSeoText(product.name),
            url: absoluteUrl(`/products/${product.slug}`)
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/")
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: url
          }
        ]
      }
    ]
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />;
}

export default async function CollectionPage({ params }) {
  const { slug } = await params;
  const [category, categories, collectionProducts, allProducts, siteSettings] = await Promise.all([
    getCategoryBySlug(slug),
    getActiveCategories(),
    getProductsByCategorySlug(slug),
    getProducts(),
    getSiteSettings()
  ]);

  if (!category) {
    notFound();
  }

  const preferredRelatedCategories = (category.relatedCategorySlugs || [])
    .map((relatedSlug) => categories.find((item) => item.slug === relatedSlug))
    .filter(Boolean);
  const fallbackRelatedCategories = categories.filter((item) => item.slug !== category.slug && !preferredRelatedCategories.some((related) => related.slug === item.slug));
  const relatedCategories = [...preferredRelatedCategories, ...fallbackRelatedCategories].slice(0, 6);

  return (
    <>
      <CollectionJsonLd category={category} products={collectionProducts} />
      <CollectionExperience category={category} products={collectionProducts} relatedCategories={relatedCategories} allProducts={allProducts} allCategories={categories} siteSettings={siteSettings} />
    </>
  );
}
