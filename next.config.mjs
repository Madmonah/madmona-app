/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict TypeScript checking enabled.
  // Supabase generic-type loss is now isolated to @ts-ignore directives
  // inside lib/supabase.ts helper functions, not the build config.
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
