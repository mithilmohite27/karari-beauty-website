import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    // Source images in Supabase Storage are 1000-1500px PNGs. AVIF/WebP plus the
    // per-component `sizes` hints cut a ~2 MB original to tens of KB at the edge.
    formats: ["image/avif", "image/webp"],
    // Product art is immutable once uploaded (filenames are timestamp-prefixed),
    // so optimized variants can be held for a year instead of the 60s default.
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
      }
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
