import type { MetadataRoute } from 'next'

// Robots — عموم الزواحف مسموحة للصفحات العامة + ترحيب صريح بزواحف الـAI search
// (GPTBot/ClaudeBot/PerplexityBot..) عشان مضمونة تظهر في إجابات المساعدين الذكيين.
// ملاحظة: /api/ مقفول ما عدا فيد Google Merchant.
const DISALLOW_PRIVATE = [
  '/admin/',
  '/api/',
  '/account',
  '/account/',
  '/supplier/',
  '/auth/',
  '/bookings/',
  '/book',
  '/login',
  '/my-bookings',
  '/spaces/',
  '/units/',
  '/reserve/',
  '/chat/',
]

const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'YouBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/merchant-feed'],
        disallow: DISALLOW_PRIVATE,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: ['/', '/llms.txt', '/feed.xml'],
        disallow: DISALLOW_PRIVATE,
      },
    ],
    sitemap: [
      'https://www.madmonacairo.com/sitemap.xml',
      'https://www.madmonacairo.com/sitemap-images.xml',
    ],
    host: 'https://www.madmonacairo.com',
  }
}
