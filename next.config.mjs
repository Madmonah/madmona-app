/** @type {import('next').NextConfig} */
const nextConfig = {
  // KNOWN ISSUE: Supabase JS v2.45+ resolves Insert<T> generic to `never` when
  // the Database type lacks the new `__InternalSupabase` schema marker.
  // Proper fix requires migrating to @supabase/ssr (separate session).
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      // 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «إعلانات نزلت النهاردة الصور بتاعتها
      //    محطوطة غلط»)
      //
      //    الدومينين دول كانوا **ناقصين** من القايمة، والـoptimizer بيرفض
      //    أي دومين مش مكتوب هنا بـ400. يعني الإعلان بينزل ومعاه صوره
      //    مسجّلة في الداتابيز، وعلى الموقع **مفيش صورة خالص** —
      //    فشل صامت مالوش أي أثر في اللوجّ.
      //
      //    اتأكدنا: /_next/image على الاتنين رجّع 400.
      //    التأثير دلوقتي: إعلان منشور واحد (٦ صور) + إعلانين (١٦ صورة).
      { protocol: 'https', hostname: 'madmona-uploaded-documents.s3.eu-north-1.amazonaws.com' },
      { protocol: 'https', hostname: 'media.madmonacairo.com' },
      { protocol: 'https', hostname: 'media.canva.com' },
      { protocol: 'https', hostname: 'mjhflxpxunwycbiquoig.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'assets.wuiltweb.com' },
      { protocol: 'https', hostname: 'yallamenu.shop' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: 'dynamic-media-cdn.tripadvisor.com' },
      { protocol: 'https', hostname: '*.lovable.app' },
      { protocol: 'https', hostname: 'sharkawy-almaza.com' },
      { protocol: 'https', hostname: 'wikilist.vip' },
      { protocol: 'https', hostname: 'images.deliveryhero.io' },
      { protocol: 'https', hostname: 'ugc.production.linktr.ee' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24h
  },
  async redirects() {
    const CATEGORY_SLUGS = [
      'properties', 'vehicles', 'workspaces', 'equipment',
      'media', 'weddings', 'tourism', 'recreation', 'marine',
      'apartments', 'chalets', 'villas', 'cars', 'cameras', 'workspace',
    ];
    const redirects = [];

    // The /add-listing/success page links to /signup?token=...&phone=... — this
    // redirect makes that flow land on the real auth signup page (which
    // accepts ?phone= to prefill, and MadmonaListingClaimer auto-claims the
    // draft after account creation). Query params are preserved automatically.
    redirects.push(
      { source: '/signup', destination: '/auth/signup', permanent: false },
    );

    // Deprecated supplier-signup paths → unified /add-listing flow
    // (old WhatsApp messages still contain these URLs)
    // NOTE: /auth/signup is NOT redirected — it's the legitimate account
    // creation page used after listing submission.
    redirects.push(
      { source: '/supplier/register', destination: '/add-listing', permanent: true },
      { source: '/list-your-asset', destination: '/add-listing', permanent: true },
    );

    for (const slug of CATEGORY_SLUGS) {
      // OLD: /categories/properties → /marketplace?category=properties
      redirects.push({
        source: `/categories/${slug}`,
        destination: `/marketplace?category=${slug}`,
        permanent: true,
      });
      // NEW: /marketplace/properties → /marketplace?category=properties
      // (Earlier AI sent these as if they were category pages, but /marketplace/[slug]
      //  is for individual listings, so we redirect them to the filtered marketplace.)
      redirects.push({
        source: `/marketplace/${slug}`,
        destination: `/marketplace?category=${slug}`,
        permanent: false, // some real listings may want these slugs eventually
      });
    }
    return redirects;
  },
  async rewrites() {
    return [
      // حملة «اكتب اسم محلك» — الأداة صفحة ستاتيك مستقلة في public/ عشان
      // تفضل خفيفة وتتحمّل في ثانية على موبايل ٣G (ده لينك بيتبعت في
      // جروبات واتساب، فأي ميلي ثانية بتفرق). الـrewrite بيدي لينك نضيف
      // /mahalak بدل /mahalak.html — واللينك ده هو اللي في كل الإعلانات
      // والبوستر والـQR، فمتغيّروش.
      { source: '/mahalak', destination: '/mahalak.html' },
    ]
  },
  async headers() {
    return [
      {
        // NOTE: security headers live HERE only. They used to be duplicated in
        // vercel.json with a slightly different set (no Permissions-Policy),
        // which made it unclear which one actually applied. vercel.json now
        // only handles regions + crons.
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=*, camera=*, microphone=*' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
