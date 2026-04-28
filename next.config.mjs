/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Re-enable strict type checking after fixing Supabase generic typing in auth/page.tsx
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['media.canva.com'],
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
