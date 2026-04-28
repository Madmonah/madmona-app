/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict TypeScript checking enabled.
  // The previous Database<Generic>-loss issue is gone now that:
  //   1) Phone OTP / auth flow has been removed
  //   2) Supabase client is only used server-side (API routes), where
  //      generics are preserved naturally without helper functions.
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
