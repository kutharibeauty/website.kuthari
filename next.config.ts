import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Vercel's image optimizer is returning 402
    // (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) — the account's image-optimization
    // quota/spend limit is exhausted, so EVERY /_next/image request fails and all
    // <Image> renders show a broken image. Serving the originals directly (Supabase
    // and /public both work) bypasses the optimizer so images load again.
    // Re-enable optimization (remove this line) once the Vercel plan/limit is raised.
    unoptimized: true,
  },

  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 2 years incl. subdomains (P12.14). Safe here because
          // the site is served exclusively over HTTPS on Vercel.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // geolocation=(self) — the "Use my current location" delivery check needs
          // geolocation for our OWN origin. An empty allowlist "geolocation=()"
          // disables it site-wide, so the browser blocks getCurrentPosition and
          // never even prompts (surfaces as PERMISSION_DENIED / "Location is blocked").
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      {
        // Long-term cache for static assets
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Cache public images and SVGs.
        //
        // These are brand assets that effectively never change in place, so a
        // 24h TTL bought nothing and cost every repeat visit a revalidation.
        //
        // TRADE-OFF: unlike /_next/static these filenames are NOT content-hashed,
        // so `immutable` means a returning visitor keeps the old bytes for up to
        // a year. To change one of these images, ship it under a NEW filename
        // (as jagannath-watermark.png -> .webp did) rather than overwriting it.
        source: '/images/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Cache merchant feed (6 hours, same as revalidate)
        source: '/api/merchant-feed',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=21600, stale-while-revalidate=3600' }],
      },
    ]
  },
}

export default nextConfig
