import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Don't index admin routes or internal API endpoints
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://madmonacairo.com/sitemap.xml',
    host: 'https://madmonacairo.com',
  }
}
