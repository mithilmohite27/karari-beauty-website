// Relative rather than the "@/" alias: the loader file is resolved by Next's
// image pipeline before jsconfig path mapping is guaranteed to apply.
import { CDN_WIDTHS, cdnUrlForWidth, isCdnPath } from "./imageVariants";

/**
 * Custom next/image loader.
 *
 * WHY A CUSTOM LOADER RATHER THAN THE BUILT-IN OPTIMIZER
 * The built-in optimizer bills one Vercel image transformation per unique
 * (src, width, quality). That allowance is metered, and when it ran out the
 * optimizer returned HTTP 402 and product images rendered blank - which is why
 * `images.unoptimized` was switched on in the first place.
 *
 * A custom loader is the third option. Next.js still generates a full srcset
 * and still picks the right width per viewport, but instead of routing through
 * /_next/image it calls this function and uses whatever URL it returns. The
 * resizing already happened at upload time, so no transformation is consumed -
 * the responsive behaviour comes back without the meter.
 *
 * Anything this loader does not recognise is returned untouched. That covers
 * files in /public, inline data URIs, and remote URLs - including the 12
 * products still pointing at images.unsplash.com, which keep rendering exactly
 * as they do today.
 */
export default function cdnLoader({ src, width }) {
  if (!isCdnPath(src)) return src;
  return cdnUrlForWidth(src, Number(width) || CDN_WIDTHS[CDN_WIDTHS.length - 1]);
}
