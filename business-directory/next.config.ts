import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Geolocation IS used (distance search), so it stays enabled for self.
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
]

const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // Typed links catch the class of bug that put four dead hrefs in the
  // prototype's admin sidebar.
  typedRoutes: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Supabase Storage — the real photo source from Phase 8 onward.
      ...(supabaseHost
        ? ([
            { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
          ] as const)
        : []),
      // Local Supabase during development.
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      // Seed imagery only. Removed once Storage-backed photos land.
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }])
  },
}

export default nextConfig
