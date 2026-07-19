"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PRODUCT_IMAGE_FALLBACK = "/images/fallbacks/karari-product-fallback.svg";

function isSupabaseProductImage(src) {
  if (!src || typeof src !== "string") return false;

  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
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
      unoptimized={isSupabaseProductImage(imageSrc)}
      onError={handleError}
    />
  );
}
