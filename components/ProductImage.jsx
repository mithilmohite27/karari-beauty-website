"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isCdnPath } from "@/lib/imageVariants";

const PRODUCT_IMAGE_FALLBACK = "/images/fallbacks/karari-product-fallback.svg";

/**
 * Decide whether an image should bypass the Next.js image optimizer.
 *
 * Every trip through /_next/image consumes one Vercel image-transformation
 * from a metered monthly allowance. When that allowance runs out the optimizer
 * returns HTTP 402 and the image renders blank - which is exactly how a quota
 * exhaustion presents itself: scattered "broken" images with working paths,
 * usually the newest ones, because older transforms are still cached.
 *
 * Two categories genuinely gain nothing from a transform:
 *
 *   - SVG: already vector and tiny.
 *   - Anything under the `optimized/` prefix in Storage. Those were produced by
 *     scripts/publish-optimized-images.mjs: resized WebP, ~70 KB, already the
 *     size they are displayed at. Re-encoding them buys nothing measurable and
 *     spends a transform that a genuinely large upload will need instead.
 *
 * Serving these direct from Supabase's CDN keeps the allowance for images that
 * actually need resizing, and means a future exhaustion can never blank out the
 * product catalogue.
 */
function shouldSkipOptimization(src) {
  if (typeof src !== "string") return false;
  if (src.endsWith(".svg")) return true;

  // A /cdn/ path is the one case that genuinely wants the image pipeline. It
  // resolves through lib/cdn-loader.js to an already-resized object in R2, so
  // Next builds a real srcset and still makes no /_next/image request - no
  // Vercel transformation is consumed. Skipping it here would throw away the
  // responsive variants the whole migration exists to produce.
  if (isCdnPath(src)) return false;

  // Any WebP in our storage bucket is already compressed to display size -
  // either by the one-off migration (publish-optimized-images.mjs) or, for
  // anything uploaded since, by compressForStorage() in lib/data/media.js.
  // Re-encoding it would spend a transformation to make it marginally smaller.
  return src.includes(".supabase.co/storage/") && src.endsWith(".webp");
}

export default function ProductImage({ src, alt, blurDataURL, fallbackSrc = PRODUCT_IMAGE_FALLBACK, onError, ...props }) {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  const handleError = (event) => {
    onError?.(event);
    setImageSrc((current) => (current === fallbackSrc ? current : fallbackSrc));
  };

  // The blur placeholder belongs to the original image, so it must be dropped
  // the moment we fall back - otherwise a failed load shows the product blurred
  // underneath the generic fallback graphic.
  const showBlur = Boolean(blurDataURL) && imageSrc === src;

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      unoptimized={shouldSkipOptimization(imageSrc)}
      {...(showBlur ? { placeholder: "blur", blurDataURL } : {})}
      onError={handleError}
    />
  );
}
