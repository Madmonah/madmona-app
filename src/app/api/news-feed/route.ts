import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/news-feed?category=economy|real_estate|automotive|business|tourism|fashion|tech
//
// News feed aligned with Madmona's main marketplace categories:
//   - economy:     عام/اقتصاد (universal interest)
//   - real_estate: عقارات (matches "عقارات للإيجار")
//   - automotive:  سيارات (matches "مركبات ونقل")
//   - business:    أعمال/شركات (matches "مساحات عمل")
//   - tourism:     سياحة/ترفيه (matches "ترفيه ورياضة" + "مركبات بحرية")
//   - fashion:     موضة (matches "أعراس وتجهيزات")
//   - tech:        تكنولوجيا (matches "معدات ميديا")
//
// Each category uses Google News RSS (reliable) + dedicated Egyptian/Arabic feeds.
// All categories filter by relevance keywords to ensure topical accuracy.
// Pool refreshed every 3 minutes per category.
// ============================================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

type NewsCategory = 'economy' | 'real_estate' | 'automotive' | 'business' | 'tourism' | 'fashion' | 'tech'

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian: boolean
  category: NewsCategory
}

interface NewsSource {
  name: string
  url: string
  egyptian: boolean
  weight: number
  fallbackImage: string
  category: NewsCategory
}

// Strict keyword filtering - items MUST contain at least ONE keyword
const CATEGORY_KEYWORDS: Record<NewsCategory, { must?: string[]; exclude?: string[] }> = {
  economy: {
    must: ['اقتصاد', 'بورصة', 'دولار', 'جنيه', 'سعر', 'تضخم', 'استثمار', 'بنك', 'عملة', 'صادرات', 'واردات', 'سهم', 'أسهم', 'أسعار', 'سوق', 'ديون', 'money', 'price', 'stock', 'bank', 'invest', 'economy', 'GDP', 'إجمالي', 'أرباح', 'خسائر', 'مالية', 'الميزانية', 'صندوق النقد'],
  },
  real_estate: {
    must: ['عقار', 'عقاري', 'عقارية', 'عقارات', 'شقة', 'شقق', 'فيلا', 'فيلات', 'إسكان', 'سكني', 'سكنية', 'الإسكان', 'وحدة', 'وحدات سكنية', 'كومباوند', 'مدينة جديدة', 'العاصمة الإدارية', 'العلمين', 'الساحل', 'إيجار', 'بيع شقق', 'متر', 'م²', 'real estate', 'property', 'housing', 'apartment', 'villa'],
  },
  automotive: {
    must: ['سيارة', 'سيارات', 'عربية', 'عربيات', 'موتور', 'محرك', 'مرسيدس', 'BMW', 'تويوتا', 'كيا', 'هيونداي', 'نيسان', 'شيفروليه', 'أوبل', 'سعر السيارات', 'سيارات كهربائية', 'كهربائية', 'هايبرد', 'سيارة جديدة', 'موديل', 'wagon', 'sedan', 'SUV', 'EV', 'BYD', 'Tesla', 'auto', 'vehicle', 'electric car'],
  },
  business: {
    must: ['شركة', 'شركات', 'أعمال', 'ريادة', 'ستارت أب', 'مشروع', 'مشروعات', 'startup', 'business', 'company', 'CEO', 'مؤسس', 'استثمار', 'تمويل', 'صفقة', 'استحواذ', 'IPO', 'طرح', 'ربع سنوي', 'أرباح الشركة', 'مدير تنفيذي', 'سيلكون', 'تكنولوجيا مالية', 'fintech', 'فينتك', 'يونيكورن'],
  },
  tourism: {
    must: ['سياحة', 'سياحي', 'سياحية', 'سائح', 'سائحين', 'فندق', 'فنادق', 'منتجع', 'منتجعات', 'الغردقة', 'شرم الشيخ', 'مرسى علم', 'الأقصر', 'أسوان', 'دهب', 'سفاجا', 'العين السخنة', 'البحر الأحمر', 'حجوزات', 'رحلة', 'رحلات', 'سفر', 'طيران', 'رحلات بحرية', 'يخت', 'سفينة', 'tourism', 'travel', 'hotel', 'resort', 'cruise'],
  },
  fashion: {
    must: ['موضة', 'أزياء', 'فستان', 'فساتين', 'بدلة', 'حذاء', 'أحذية', 'حقيبة', 'حقائب', 'مجوهرات', 'إكسسوارات', 'إطلالة', 'مكياج', 'تجميل', 'عريس', 'عروس', 'زفاف', 'فرح', 'أعراس', 'fashion', 'style', 'designer', 'dress', 'bridal', 'wedding', 'beauty', 'Vogue', 'مصمم', 'مصممة'],
  },
  tech: {
    must: ['تكنولوجيا', 'تقنية', 'تقني', 'iPhone', 'Samsung', 'Android', 'AI', 'ذكاء اصطناعي', 'كاميرا', 'كاميرات', 'لاب توب', 'تطبيق', 'تطبيقات', 'هاتف', 'موبايل', 'سامسونج', 'آبل', 'جوجل', 'ميتا', 'فيسبوك', 'يوتيوب', 'تويتر', 'انستاجرام', 'إنترنت', 'tech', 'AI', 'app', 'iPhone', 'gadget', 'startup tech', 'software', 'hardware'],
  },
}

// Themed fallback images per category
const FB = {
  economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  stocks: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80',
  real_estate: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  villa: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  automotive: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
  car_luxury: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
  business2: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
  tourism: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
  tourism2: 'https://images.unsplash.com/photo-1542397284385-6010376c5337?w=800&q=80',
  fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
  fashion2: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  tech2: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
}

// Helper to build Google News RSS URL for Egypt/Arabic
const gnews = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar-EG&gl=EG&ceid=EG:ar`

const ALL_SOURCES: NewsSource[] = [
  // 💰 ECONOMY (universal interest)
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, weight: 6, fallbackImage: FB.stocks, category: 'economy' },
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, weight: 5, fallbackImage: FB.economy, category: 'economy' },
  { name: 'المصري اليوم - اقتصاد', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, weight: 5, fallbackImage: FB.economy, category: 'economy' },
  { name: 'Google News - اقتصاد', url: gnews('اقتصاد مصر'), egyptian: true, weight: 4, fallbackImage: FB.economy, category: 'economy' },
  { name: 'CNN العربية - اقتصاد', url: 'https://arabic.cnn.com/business/rss', egyptian: false, weight: 2, fallbackImage: FB.economy, category: 'economy' },
  { name: 'الجزيرة - اقتصاد', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, weight: 2, fallbackImage: FB.economy, category: 'economy' },

  // 🏠 REAL ESTATE (matches "عقارات للإيجار")
  { name: 'Google News - عقارات', url: gnews('عقارات مصر'), egyptian: true, weight: 6, fallbackImage: FB.real_estate, category: 'real_estate' },
  { name: 'Google News - شقق', url: gnews('شقق سكنية'), egyptian: true, weight: 5, fallbackImage: FB.real_estate, category: 'real_estate' },
  { name: 'Google News - العاصمة الإدارية', url: gnews('العاصمة الإدارية الجديدة عقارات'), egyptian: true, weight: 4, fallbackImage: FB.villa, category: 'real_estate' },
  { name: 'Google News - الإسكان', url: gnews('وزارة الإسكان مصر'), egyptian: true, weight: 4, fallbackImage: FB.real_estate, category: 'real_estate' },
  { name: 'Google News - real estate Egypt', url: gnews('Egypt real estate'), egyptian: false, weight: 3, fallbackImage: FB.real_estate, category: 'real_estate' },

  // 🚗 AUTOMOTIVE (matches "مركبات ونقل")
  { name: 'Google News - سيارات', url: gnews('سيارات مصر'), egyptian: true, weight: 6, fallbackImage: FB.automotive, category: 'automotive' },
  { name: 'Google News - أسعار السيارات', url: gnews('أسعار السيارات مصر'), egyptian: true, weight: 5, fallbackImage: FB.automotive, category: 'automotive' },
  { name: 'Google News - سيارات كهربائية', url: gnews('سيارات كهربائية مصر'), egyptian: true, weight: 4, fallbackImage: FB.car_luxury, category: 'automotive' },
  { name: 'Google News - cars Egypt', url: gnews('Egypt cars market'), egyptian: false, weight: 3, fallbackImage: FB.automotive, category: 'automotive' },
  { name: 'Google News - automotive', url: gnews('automotive industry electric vehicles'), egyptian: false, weight: 2, fallbackImage: FB.car_luxury, category: 'automotive' },

  // 💼 BUSINESS (matches "مساحات عمل" - office/business renters)
  { name: 'Google News - شركات مصر', url: gnews('شركات مصر استثمار'), egyptian: true, weight: 6, fallbackImage: FB.business, category: 'business' },
  { name: 'Google News - ستارت أب', url: gnews('startup مصر تمويل'), egyptian: true, weight: 5, fallbackImage: FB.business2, category: 'business' },
  { name: 'Google News - رواد الأعمال', url: gnews('ريادة أعمال مصر'), egyptian: true, weight: 4, fallbackImage: FB.business2, category: 'business' },
  { name: 'Daily News - Business', url: 'https://dailynewsegypt.com/category/business/feed/', egyptian: true, weight: 4, fallbackImage: FB.business, category: 'business' },
  { name: 'Google News - fintech Egypt', url: gnews('fintech Egypt MENA'), egyptian: false, weight: 3, fallbackImage: FB.business, category: 'business' },

  // ✈️ TOURISM (matches "ترفيه ورياضة" + "مركبات بحرية")
  { name: 'Google News - سياحة مصر', url: gnews('سياحة مصر'), egyptian: true, weight: 6, fallbackImage: FB.tourism, category: 'tourism' },
  { name: 'Google News - شرم الشيخ', url: gnews('شرم الشيخ سياحة'), egyptian: true, weight: 5, fallbackImage: FB.tourism2, category: 'tourism' },
  { name: 'Google News - الغردقة', url: gnews('الغردقة سياحة فنادق'), egyptian: true, weight: 4, fallbackImage: FB.tourism2, category: 'tourism' },
  { name: 'Google News - فنادق', url: gnews('فنادق مصر إشغال'), egyptian: true, weight: 4, fallbackImage: FB.tourism, category: 'tourism' },
  { name: 'Google News - tourism Egypt', url: gnews('Egypt tourism Red Sea'), egyptian: false, weight: 3, fallbackImage: FB.tourism, category: 'tourism' },

  // 👗 FASHION (matches "أعراس وتجهيزات" - bridal/wedding)
  { name: 'Vogue Arabia', url: 'https://en.vogue.me/feed/', egyptian: false, weight: 5, fallbackImage: FB.fashion, category: 'fashion' },
  { name: 'سيدتي - أناقة', url: 'https://www.sayidaty.net/rss-feed/3', egyptian: false, weight: 5, fallbackImage: FB.fashion, category: 'fashion' },
  { name: 'فستاني', url: 'https://www.fustany.com/ar/rss', egyptian: true, weight: 5, fallbackImage: FB.fashion, category: 'fashion' },
  { name: 'Layalina', url: 'https://layalina.com/feed/', egyptian: false, weight: 4, fallbackImage: FB.fashion2, category: 'fashion' },
  { name: 'Elle Arabia', url: 'https://www.ellearabia.com/feed', egyptian: false, weight: 3, fallbackImage: FB.fashion, category: 'fashion' },
  { name: 'Google News - فساتين زفاف', url: gnews('فساتين زفاف موضة'), egyptian: false, weight: 3, fallbackImage: FB.fashion2, category: 'fashion' },

  // 💻 TECH (matches "معدات ميديا" - cameras, AV gear)
  { name: 'Google News - تكنولوجيا', url: gnews('تكنولوجيا مصر'), egyptian: true, weight: 5, fallbackImage: FB.tech, category: 'tech' },
  { name: 'الجزيرة - تكنولوجيا', url: 'https://www.aljazeera.net/aljazeerarss/technology.xml', egyptian: false, weight: 5, fallbackImage: FB.tech, category: 'tech' },
  { name: 'BBC عربي - تكنولوجيا', url: 'http://feeds.bbci.co.uk/arabic/scienceandtech/rss.xml', egyptian: false, weight: 4, fallbackImage: FB.tech, category: 'tech' },
  { name: 'CNN العربية - تكنولوجيا', url: 'https://arabic.cnn.com/tech/rss', egyptian: false, weight: 4, fallbackImage: FB.tech2, category: 'tech' },
  { name: 'Google News - AI', url: gnews('ذكاء اصطناعي تكنولوجيا'), egyptian: false, weight: 3, fallbackImage: FB.tech, category: 'tech' },
  { name: 'Google News - كاميرات', url: gnews('كاميرات تصوير احترافية'), egyptian: false, weight: 3, fallbackImage: FB.tech2, category: 'tech' },
]

interface CategoryPool {
  items: NewsItem[]
  timestamp: number
  refreshing: boolean
}

const pools: Record<NewsCategory, CategoryPool | null> = {
  economy: null,
  real_estate: null,
  automotive: null,
  business: null,
  tourism: null,
  fashion: null,
  tech: null,
}

const POOL_TTL = 3 * 60 * 1000

// XML helpers
function decodeCData(s: string) { return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') }
function stripTags(s: string) { return s.replace(/<[^>]+>/g, '').trim() }
function decodeEntities(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
}
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(regex)
  if (!m) return ''
  return decodeEntities(stripTags(decodeCData(m[1]))).trim()
}

function extractImage(itemXml: string): string | null {
  let m = itemXml.match(/<media:content[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)
  if (m) return m[1]
  m = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)
  if (m) return m[1]
  m = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i)
  if (m) return m[1]
  m = itemXml.match(/<enclosure[^>]*type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/i)
  if (m) return m[1]
  m = itemXml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i)
  if (m) return m[1]
  const descMatch = itemXml.match(/<(?:description|content:encoded)(?:\s[^>]*)?>([\s\S]*?)<\/(?:description|content:encoded)>/i)
  if (descMatch) {
    const inner = decodeCData(descMatch[1])
    const img = inner.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (img) return img[1]
  }
  m = itemXml.match(/<\w*image[^>]*>([^<]*\.(?:jpg|jpeg|png|webp)[^<]*)</i)
  if (m) return m[1].trim()
  return null
}

function extractLink(itemXml: string): string {
  let m = itemXml.match(/<link>([^<]+)<\/link>/i)
  if (m && m[1].startsWith('http')) return m[1].trim()
  m = itemXml.match(/<link[^>]*href=["']([^"']+)["']/i)
  if (m) return m[1]
  return ''
}

async function fetchSource(source: NewsSource): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MadmonaBot/1.0; +https://madmonacairo.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
      redirect: 'follow',
    })
    if (!res.ok) return []
    const xml = await res.text()
    if (!xml || xml.length < 100) return []

    const items: NewsItem[] = []
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null
    const maxItems = source.weight * 4

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
      const itemXml = match[1]
      const title = extractTag(itemXml, 'title')
      const link = extractLink(itemXml)
      const image = extractImage(itemXml) || source.fallbackImage
      const pubDate =
        extractTag(itemXml, 'pubDate') ||
        extractTag(itemXml, 'published') ||
        extractTag(itemXml, 'dc:date') ||
        new Date().toISOString()

      if (title && link && title.length > 10 && link.startsWith('http')) {
        items.push({
          title: title.slice(0, 200),
          link,
          image,
          source: source.name,
          pubDate,
          isEgyptian: source.egyptian,
          category: source.category,
        })
      }
    }
    return items
  } catch {
    return []
  }
}

async function buildPool(category: NewsCategory): Promise<NewsItem[]> {
  const sources = ALL_SOURCES.filter(s => s.category === category)
  const results = await Promise.all(sources.map(fetchSource))
  const allItems = results.flat()
  const seen = new Set<string>()
  let deduped = allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })

  // Apply keyword filter to ensure category relevance
  const keywords = CATEGORY_KEYWORDS[category]
  if (keywords?.must && keywords.must.length > 0) {
    const mustKeywords = keywords.must
    const filtered = deduped.filter(item => {
      const haystack = item.title.toLowerCase()
      return mustKeywords.some(kw => haystack.includes(kw.toLowerCase()))
    })
    // Only apply filter if it leaves us with enough items (at least 3)
    if (filtered.length >= 3) {
      deduped = filtered
    }
  }

  return deduped
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function selectMix(allItems: NewsItem[], n: number): NewsItem[] {
  const egyptian = allItems.filter(i => i.isEgyptian)
  const other = allItems.filter(i => !i.isEgyptian)
  const targetEg = Math.min(Math.ceil(n * 0.7), egyptian.length)
  const targetOther = n - targetEg

  const picked: NewsItem[] = [
    ...shuffle(egyptian).slice(0, targetEg),
    ...shuffle(other).slice(0, targetOther),
  ]
  if (picked.length < n) {
    const remaining = [...egyptian, ...other].filter(item => !picked.includes(item))
    while (picked.length < n && remaining.length > 0) {
      picked.push(remaining.shift()!)
    }
  }
  return shuffle(picked).slice(0, n)
}

async function refreshPool(category: NewsCategory) {
  const pool = pools[category]
  if (pool?.refreshing) return
  if (pool) pool.refreshing = true
  try {
    const items = await buildPool(category)
    if (items.length > 0) {
      pools[category] = { items, timestamp: Date.now(), refreshing: false }
    } else if (pool) {
      pool.refreshing = false
    }
  } catch {
    if (pool) pool.refreshing = false
  }
}

function noCacheHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const categoryParam = (url.searchParams.get('category') || 'economy').toLowerCase()
  const validCategories: NewsCategory[] = ['economy', 'real_estate', 'automotive', 'business', 'tourism', 'fashion', 'tech']
  const category = validCategories.includes(categoryParam as NewsCategory)
    ? (categoryParam as NewsCategory)
    : 'economy'

  if (!pools[category]) {
    const items = await buildPool(category)
    if (items.length > 0) {
      pools[category] = { items, timestamp: Date.now(), refreshing: false }
    } else {
      return new NextResponse(
        JSON.stringify({ ok: false, items: [], category, error: 'no_sources_available' }),
        { status: 200, headers: noCacheHeaders() }
      )
    }
  }

  const pool = pools[category]!
  const age = Date.now() - pool.timestamp
  const stale = age > POOL_TTL
  if (stale) {
    refreshPool(category)
  }

  const fresh = selectMix(pool.items, 12)
  const ageSeconds = Math.floor(age / 1000)
  const nextRefreshIn = Math.max(0, Math.floor((POOL_TTL - age) / 1000))

  return new NextResponse(
    JSON.stringify({
      ok: true,
      category,
      items: fresh,
      count: fresh.length,
      pool_size: pool.items.length,
      pool_age_seconds: ageSeconds,
      next_refresh_in_seconds: nextRefreshIn,
      generated_at: new Date().toISOString(),
    }),
    { status: 200, headers: noCacheHeaders() }
  )
}
