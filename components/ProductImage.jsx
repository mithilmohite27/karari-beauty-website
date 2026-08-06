"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PRODUCT_IMAGE_FALLBACK = "/images/fallbacks/karari-product-fallback.svg";

// SVG fallbacks are already tiny and vector; running them through the optimizer
// costs a transform for no gain. Everything else (including Supabase Storage
// originals, which are multi-MB PNGs) must go through next/image so it is
// resized to the `sizes` hint and re-encoded as AVIF/WebP.
function shouldSkipOptimization(src) {
  return typeof src === "string" && src.endsWith(".svg");
}

export default function ProductImage({ src, alt, fallbackSrc = PRODUCT_IMAGE_FALLBACK, onError, ...props }) {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  const handleError = (event) => {
    onError?.(event);
    setImageSrc((current) => (current === fallbackSrc ? current : fallbackSrc));
  };

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      unoptimized={shouldSkipOptimization(imageSrc)}
      onError={handleError}
    />
  );
}
