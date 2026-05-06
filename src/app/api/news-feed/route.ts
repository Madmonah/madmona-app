import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/news-feed?category=sports|fashion|trending|economy
//
// Universal news feed API supporting multiple categories.
// Each category has its own pool of RSS sources.
// Pool refreshed every 3 minutes per category.
//
// Returns: 12 fresh items (70% Egyptian/Arabic if available, 30% global)
// ============================================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

type NewsCategory = 'sports' | 'fashion' | 'trending' | 'economy' | 'interior' | 'locals' | 'defense'

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

// Themed fallback images per category
const FB_SPORTS = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80'
const FB_FOOTBALL = 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80'
const FB_FASHION = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80'
const FB_FASHION2 = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80'
const FB_TRENDING = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80'
const FB_TECH = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'
const FB_ECONOMY = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80'
const FB_STOCKS = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80'
const FB_GLOBAL = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80'
const FB_INTERIOR = 'https://images.unsplash.com/photo-1591622180834-da91d2b0c2bf?w=800&q=80'
const FB_LOCALS = 'https://images.unsplash.com/photo-1572455024215-83a5c80a5b1e?w=800&q=80'
const FB_DEFENSE = 'https://images.unsplash.com/photo-1614108622516-bdb7af0a85a5?w=800&q=80'

const ALL_SOURCES: NewsSource[] = [
  // ⚽ SPORTS
  { name: 'يلا كورة', url: 'https://www.yallakora.com/rss', egyptian: true, weight: 6, fallbackImage: FB_FOOTBALL, category: 'sports' },
  { name: 'في الجول', url: 'https://www.filgoal.com/rss', egyptian: true, weight: 5, fallbackImage: FB_FOOTBALL, category: 'sports' },
  { name: 'كووورة', url: 'https://www.kooora.com/rss/news.aspx', egyptian: false, weight: 4, fallbackImage: FB_FOOTBALL, category: 'sports' },
  { name: 'الجزيرة - رياضة', url: 'https://www.aljazeera.net/aljazeerarss/sport.xml', egyptian: false, weight: 3, fallbackImage: FB_SPORTS, category: 'sports' },
  { name: 'BBC عربي - رياضة', url: 'http://feeds.bbci.co.uk/arabic/sports/rss.xml', egyptian: false, weight: 2, fallbackImage: FB_SPORTS, category: 'sports' },
  { name: 'CNN العربية - رياضة', url: 'https://arabic.cnn.com/sport/rss', egyptian: false, weight: 2, fallbackImage: FB_SPORTS, category: 'sports' },
  { name: 'كورة', url: 'https://www.kora.com/rss', egyptian: true, weight: 2, fallbackImage: FB_FOOTBALL, category: 'sports' },

  // 👗 FASHION
  { name: 'Vogue Arabia', url: 'https://en.vogue.me/feed/', egyptian: false, weight: 5, fallbackImage: FB_FASHION, category: 'fashion' },
  { name: 'سيدتي - أناقة', url: 'https://www.sayidaty.net/rss-feed/3', egyptian: false, weight: 5, fallbackImage: FB_FASHION, category: 'fashion' },
  { name: 'Layalina', url: 'https://layalina.com/feed/', egyptian: false, weight: 4, fallbackImage: FB_FASHION2, category: 'fashion' },
  { name: 'Elle Arabia', url: 'https://www.ellearabia.com/feed', egyptian: false, weight: 3, fallbackImage: FB_FASHION, category: 'fashion' },
  { name: 'Harpers Bazaar', url: 'https://www.harpersbazaararabia.com/feed', egyptian: false, weight: 2, fallbackImage: FB_FASHION2, category: 'fashion' },
  { name: 'فستاني', url: 'https://www.fustany.com/ar/rss', egyptian: true, weight: 4, fallbackImage: FB_FASHION, category: 'fashion' },
  { name: 'موضة العرب', url: 'https://www.almrsal.com/feed', egyptian: false, weight: 2, fallbackImage: FB_FASHION, category: 'fashion' },

  // 🔥 TRENDING
  { name: 'الجزيرة - تكنولوجيا', url: 'https://www.aljazeera.net/aljazeerarss/technology.xml', egyptian: false, weight: 5, fallbackImage: FB_TECH, category: 'trending' },
  { name: 'BBC عربي - تكنولوجيا', url: 'http://feeds.bbci.co.uk/arabic/scienceandtech/rss.xml', egyptian: false, weight: 4, fallbackImage: FB_TECH, category: 'trending' },
  { name: 'Cairo Scene', url: 'https://cairoscene.com/feed', egyptian: true, weight: 5, fallbackImage: FB_TRENDING, category: 'trending' },
  { name: 'Egyptian Streets', url: 'https://egyptianstreets.com/feed/', egyptian: true, weight: 4, fallbackImage: FB_TRENDING, category: 'trending' },
  { name: 'CNN العربية - تكنولوجيا', url: 'https://arabic.cnn.com/tech/rss', egyptian: false, weight: 3, fallbackImage: FB_TECH, category: 'trending' },
  { name: 'الجزيرة - منوعات', url: 'https://www.aljazeera.net/aljazeerarss/culture.xml', egyptian: false, weight: 2, fallbackImage: FB_TRENDING, category: 'trending' },
  { name: 'يوم 7 - فن', url: 'https://www.youm7.com/rss/SectionRss?SectionID=42', egyptian: true, weight: 2, fallbackImage: FB_TRENDING, category: 'trending' },

  // 💰 ECONOMY
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, weight: 6, fallbackImage: FB_STOCKS, category: 'economy' },
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, weight: 5, fallbackImage: FB_ECONOMY, category: 'economy' },
  { name: 'المصري اليوم - اقتصاد', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, weight: 5, fallbackImage: FB_ECONOMY, category: 'economy' },
  { name: 'CNN العربية - اقتصاد', url: 'https://arabic.cnn.com/business/rss', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL, category: 'economy' },
  { name: 'BBC عربي - اقتصاد', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL, category: 'economy' },
  { name: 'الجزيرة - اقتصاد', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL, category: 'economy' },

  // 👮‍♂️ INTERIOR (وزارة الداخلية - حوادث/أمن)
  { name: 'المصري اليوم - حوادث', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=10', egyptian: true, weight: 6, fallbackImage: FB_INTERIOR, category: 'interior' },
  { name: 'اليوم السابع - حوادث', url: 'https://www.youm7.com/rss/SectionRss?SectionID=203', egyptian: true, weight: 5, fallbackImage: FB_INTERIOR, category: 'interior' },
  { name: 'اليوم السابع - حوادث 2', url: 'https://www.youm7.com/rss/SectionRss?SectionID=297', egyptian: true, weight: 4, fallbackImage: FB_INTERIOR, category: 'interior' },
  { name: 'الوطن - حوادث', url: 'https://www.elwatannews.com/RssFeeds/3', egyptian: true, weight: 4, fallbackImage: FB_INTERIOR, category: 'interior' },
  { name: 'CNN العربية - الشرق الأوسط', url: 'https://arabic.cnn.com/middle-east/rss', egyptian: false, weight: 2, fallbackImage: FB_INTERIOR, category: 'interior' },

  // 🏘️ LOCALS (المحافظات/المحليات)
  { name: 'المصري اليوم - محافظات', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=2', egyptian: true, weight: 6, fallbackImage: FB_LOCALS, category: 'locals' },
  { name: 'اليوم السابع - محافظات', url: 'https://www.youm7.com/rss/SectionRss?SectionID=88', egyptian: true, weight: 5, fallbackImage: FB_LOCALS, category: 'locals' },
  { name: 'الوطن - محافظات', url: 'https://www.elwatannews.com/RssFeeds/15', egyptian: true, weight: 4, fallbackImage: FB_LOCALS, category: 'locals' },
  { name: 'صدى البلد - محافظات', url: 'https://www.elbalad.news/rssfeed?id=10', egyptian: true, weight: 3, fallbackImage: FB_LOCALS, category: 'locals' },
  { name: 'الأهرام - عاجل', url: 'https://gate.ahram.org.eg/RssFeeds/Rss/4.aspx', egyptian: true, weight: 3, fallbackImage: FB_LOCALS, category: 'locals' },

  // 🛡️ DEFENSE (وزارة الدفاع/سياسة/عسكرية)
  { name: 'المصري اليوم - سياسة', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=4', egyptian: true, weight: 6, fallbackImage: FB_DEFENSE, category: 'defense' },
  { name: 'اليوم السابع - سياسة', url: 'https://www.youm7.com/rss/SectionRss?SectionID=319', egyptian: true, weight: 5, fallbackImage: FB_DEFENSE, category: 'defense' },
  { name: 'الوطن - سياسة', url: 'https://www.elwatannews.com/RssFeeds/1', egyptian: true, weight: 4, fallbackImage: FB_DEFENSE, category: 'defense' },
  { name: 'الجزيرة - سياسة', url: 'https://www.aljazeera.net/aljazeerarss/politics.xml', egyptian: false, weight: 3, fallbackImage: FB_DEFENSE, category: 'defense' },
  { name: 'BBC عربي - الشرق الأوسط', url: 'http://feeds.bbci.co.uk/arabic/middleeast/rss.xml', egyptian: false, weight: 3, fallbackImage: FB_DEFENSE, category: 'defense' },
  { name: 'CNN العربية - عالم', url: 'https://arabic.cnn.com/world/rss', egyptian: false, weight: 2, fallbackImage: FB_DEFENSE, category: 'defense' },
]

interface CategoryPool {
  items: NewsItem[]
  timestamp: number
  refreshing: boolean
}

const pools: Record<NewsCategory, CategoryPool | null> = {
  sports: null,
  fashion: null,
  trending: null,
  economy: null,
  interior: null,
  locals: null,
  defense: null,
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
  return allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })
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
  const validCategories: NewsCategory[] = ['sports', 'fashion', 'trending', 'economy', 'interior', 'locals', 'defense']
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
