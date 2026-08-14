import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cloudflare R2 origin serving pre-generated image variants.
 *
 * This single value is the on/off switch for the whole CDN pipeline. While it
 * is unset the site behaves exactly as before: images stay unoptimized and are
 * served straight from Supabase Storage. Setting it turns on the custom loader,
 * which restores responsive srcset without touching Vercel's metered image
 * transformations. Deploying the code and enabling the CDN are therefore
 * separate, independently reversible steps.
 */
const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE;
const cdnHostname = cdnBase ? new URL(cdnBase).hostname : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    // Without the CDN: disable Next.js built-in image optimization transforms.
    // Every trip through /_next/image consumes one of Vercel's metered
    // transformations, and an exhausted allowance returns HTTP 402 - which
    // presents as scattered blank product images.
    //
    // With the CDN: re-enable the pipeline but point it at a custom loader.
    // Next still builds a full srcset and picks the right width per viewport,
    // but resolves each URL through lib/cdn-loader.js to an already-resized
    // object in R2. No /_next/image request is made, so no transformation is
    // consumed, and the quota can never blank out the catalogue again.
    unoptimized: !cdnBase,
    ...(cdnBase
      ? {
          loader: "custom",
          loaderFile: "./lib/cdn-loader.js",
          // Must mirror CDN_WIDTHS in lib/imageVariants.mjs: these are the only
          // widths that exist as objects in the bucket. Listing a width here
          // that was never generated produces a 404, not a resize.
          deviceSizes: [400, 800, 1600],
          // Used for `sizes` values smaller than the narrowest device size -
          // the 3rem/4rem cart and gallery thumbnails. The loader clamps all of
          // them up to the 400px variant.
          imageSizes: [64, 128, 256]
        }
      : {}),
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "images.pexels.com"
      },
      {
        protocol: "https",
        hostname: "**.supabase.co"
      },
      ...(cdnHostname ? [{ protocol: "https", hostname: cdnHostname }] : [])
    ]
  },
  experimental: {
    // Only pull the icons actually referenced instead of the whole lucide barrel.
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" }
        ]
      },
      {
        // robots.txt already disallows these, but a header keeps admin and
        // account screens out of indexes that ignore robots directives.
        source: "/:path(admin|account|auth)/:sub*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      }
    ];
  }
};

export default nextConfig;
