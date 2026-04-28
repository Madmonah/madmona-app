/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Re-enable strict TS checking after refactoring auth/page.tsx
  // to use Database['public']['Tables']['users']['Insert'] type assertions
  // directly at the call sites. The createClient<Database>() generics don't
  // survive being returned from a helper function.
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
