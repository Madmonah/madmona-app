import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/economic-news
//
// Pool refreshed every 2 minutes from 22 RSS sources.
// CRITICAL FIX: items WITHOUT images now use category-based fallback images
// (this is what was making the pool only 20 items — most Egyptian RSS feeds
//  don't include parseable images, so 80% of items were being discarded).
// ============================================================================

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian: boolean
}

interface NewsSource {
  name: string
  url: string
  egyptian: boolean
  weight: number
  fallbackImage: string  // used when item doesn't have its own image
}

// Source-specific fallback images (Unsplash, license-free, themed)
const FB_ECONOMY = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80'
const FB_STOCKS = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80'
const FB_REALESTATE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80'
const FB_GENERAL = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'
const FB_GLOBAL = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80'

const SOURCES: NewsSource[] = [
  // 🇪🇬 Egyptian — working sources only (verified 2026-05-06)
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, weight: 6, fallbackImage: FB_STOCKS },
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, weight: 5, fallbackImage: FB_ECONOMY },
  { name: 'المصري اليوم - اقتصاد', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, weight: 5, fallbackImage: FB_ECONOMY },

  // 🌍 Regional — working sources only
  { name: 'CNN العربية', url: 'https://arabic.cnn.com/business/rss', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL },
  { name: 'BBC عربي', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL },
  { name: 'الجزيرة - اقتصاد', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, weight: 2, fallbackImage: FB_GLOBAL },

  // 🔄 Backup sources (rarely return data, kept low weight)
  { name: 'المال', url: 'https://almalnews.com/feed/', egyptian: true, weight: 2, fallbackImage: FB_ECONOMY },
  { name: 'Enterprise', url: 'https://enterprise.press/feed/', egyptian: true, weight: 2, fallbackImage: FB_ECONOMY },
  { name: 'مباشر مصر', url: 'https://www.mubasher.info/rss/news', egyptian: true, weight: 1, fallbackImage: FB_STOCKS },
  { name: 'أرقام', url: 'https://www.argaam.com/ar/rss', egyptian: false, weight: 1, fallbackImage: FB_STOCKS },
  { name: 'عقار ماب', url: 'https://aqarmap.com.eg/blog/feed/', egyptian: true, weight: 1, fallbackImage: FB_REALESTATE },
]

interface Pool {
  items: NewsItem[]
  timestamp: number
  refreshing: boolean
  sourceCounts: Record<string, number>
}

let pool: Pool | null = null
const POOL_TTL = 2 * 60 * 1000  // 2 minutes

// XML helpers ----------------------------------------------------------------
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
  // Try og:image-style or any image URL in the raw XML
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
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!res.ok) return []
    const xml = await res.text()
    if (!xml || xml.length < 100) return []

    const items: NewsItem[] = []
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null
    const maxItems = source.weight * 5

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
      const itemXml = match[1]
      const title = extractTag(itemXml, 'title')
      const link = extractLink(itemXml)
      const image = extractImage(itemXml) || source.fallbackImage  // ✅ FALLBACK
      const pubDate =
        extractTag(itemXml, 'pubDate') ||
        extractTag(itemXml, 'published') ||
        extractTag(itemXml, 'dc:date') ||
        new Date().toISOString()

      // Only require title and link (image has fallback now!)
      if (title && link && title.length > 10 && link.startsWith('http')) {
        items.push({
          title: title.slice(0, 200),
          link,
          image,
          source: source.name,
          pubDate,
          isEgyptian: source.egyptian,
        })
      }
    }
    return items
  } catch {
    return []
  }
}

async function buildPool(): Promise<{ items: NewsItem[]; sourceCounts: Record<string, number> }> {
  const results = await Promise.all(SOURCES.map(fetchSource))
  const sourceCounts: Record<string, number> = {}
  results.forEach((items, i) => {
    sourceCounts[SOURCES[i].name] = items.length
  })

  const allItems = results.flat()
  const seen = new Set<string>()
  const unique = allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })

  return { items: unique, sourceCounts }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function selectRandomMix(allItems: NewsItem[], n: number): NewsItem[] {
  const egyptian = allItems.filter(i => i.isEgyptian)
  const regional = allItems.filter(i => !i.isEgyptian)
  const shuffledEg = shuffle(egyptian)
  const shuffledReg = shuffle(regional)
  const targetEg = Math.ceil(n * 0.7)
  const targetReg = n - targetEg
  const picked: NewsItem[] = [
    ...shuffledEg.slice(0, targetEg),
    ...shuffledReg.slice(0, targetReg),
  ]
  if (picked.length < n) {
    const remaining = [...shuffledEg.slice(targetEg), ...shuffledReg.slice(targetReg)]
    while (picked.length < n && remaining.length > 0) {
      picked.push(remaining.shift()!)
    }
  }
  return shuffle(picked).slice(0, n)
}

async function refreshPoolBackground() {
  if (pool?.refreshing) return
  if (pool) pool.refreshing = true
  try {
    const { items, sourceCounts } = await buildPool()
    if (items.length > 0) {
      pool = { items, timestamp: Date.now(), refreshing: false, sourceCounts }
    } else if (pool) {
      pool.refreshing = false
    }
  } catch {
    if (pool) pool.refreshing = false
  }
}

// ----------------------------------------------------------------------------

export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get('refresh') === '1'
  const debug = url.searchParams.get('debug') === '1'

  if (!pool) {
    const { items, sourceCounts } = await buildPool()
    if (items.length > 0) {
      pool = { items, timestamp: Date.now(), refreshing: false, sourceCounts }
    } else {
      return new NextResponse(
        JSON.stringify({ ok: false, items: [], error: 'no_sources' }),
        { status: 200, headers: noCacheHeaders() }
      )
    }
  }

  const age = Date.now() - pool.timestamp
  const stale = age > POOL_TTL
  if (forceRefresh || stale) {
    refreshPoolBackground()
  }

  const fresh = selectRandomMix(pool.items, 15)
  const ageSeconds = Math.floor(age / 1000)
  const nextRefreshIn = Math.max(0, Math.floor((POOL_TTL - age) / 1000))

  const responseBody: Record<string, unknown> = {
    ok: true,
    items: fresh,
    count: fresh.length,
    pool_size: pool.items.length,
    egyptian_in_pool: pool.items.filter(i => i.isEgyptian).length,
    pool_age_seconds: ageSeconds,
    next_refresh_in_seconds: nextRefreshIn,
    pool_refreshing: pool.refreshing,
    generated_at: new Date().toISOString(),
    shuffle_seed: Math.random().toString(36).slice(2),
  }

  if (debug) {
    responseBody.source_counts = pool.sourceCounts
  }

  return new NextResponse(
    JSON.stringify(responseBody),
    { status: 200, headers: noCacheHeaders() }
  )
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
