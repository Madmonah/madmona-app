/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Re-enable strict TS after refactoring auth/page.tsx and spaces/[id]
  // The Database<Generic> doesn't survive helper-function returns even with
  // singleton pattern. Will revisit when migrating to @supabase/ssr.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['media.canva.com', 'mjhflxpxunwycbiquoig.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=*, camera=*, microphone=*' },
        ],
      },
    ]
  },
}

export default nextConfig
