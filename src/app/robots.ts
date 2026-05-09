import type { MetadataRoute } from 'next'

// Robots.txt — let crawlers in for all public pages, block admin/api/auth flows
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/account',         // private (logged-in only)
          '/account/',
          '/supplier/',       // private supplier dashboards
          '/auth/',           // auth flows
          '/bookings/',       // private booking pages
          '/book',            // legacy redirect
          '/login',           // legacy redirect
          '/my-bookings',     // legacy redirect
          '/spaces/',         // legacy redirect
          '/units/',          // legacy redirect
          '/reserve/',        // legacy redirect
        ],
      },
    ],
    sitemap: 'https://madmonacairo.com/sitemap.xml',
    host: 'https://madmonacairo.com',
  }
}
