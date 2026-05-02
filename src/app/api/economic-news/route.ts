import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/economic-news
//
// FORCE DYNAMIC — never cached at any level (Next.js, Vercel CDN, browser)
// Returns randomly shuffled 15 items from a pool of 150+ Egyptian/Arabic
// economic news on EVERY single request. Different order every refresh.
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
}

const SOURCES: NewsSource[] = [
  // Egypt — specialized economy
  { name: 'المال', url: 'https://almalnews.com/feed/', egyptian: true, weight: 5 },
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, weight: 5 },
  { name: 'مباشر مصر', url: 'https://www.mubasher.info/rss/news', egyptian: true, weight: 4 },
  { name: 'أموال الغد', url: 'https://www.amwalalghad.com/feed/', egyptian: true, weight: 4 },
  { name: 'Enterprise', url: 'https://enterprise.press/feed/', egyptian: true, weight: 4 },
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, weight: 3 },
  { name: 'Mada Masr - Business', url: 'https://www.madamasr.com/en/category/business/feed/', egyptian: true, weight: 3 },

  // Egypt — general news, economy section
  { name: 'الأهرام - اقتصاد', url: 'https://gate.ahram.org.eg/rss/PortalEconomyRss.aspx', egyptian: true, weight: 4 },
  { name: 'الشروق - اقتصاد', url: 'https://www.shorouknews.com/RSS/Feeds/Economy.xml', egyptian: true, weight: 4 },
  { name: 'اليوم السابع - اقتصاد', url: 'https://www.youm7.com/rss/SectionRss?SectionID=297', egyptian: true, weight: 4 },
  { name: 'المصري اليوم - اقتصاد', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, weight: 3 },
  { name: 'الوطن - اقتصاد', url: 'https://www.elwatannews.com/rss/category/29.rss', egyptian: true, weight: 3 },
  { name: 'صدى البلد - اقتصاد', url: 'https://www.elbalad.news/rss?type=10', egyptian: true, weight: 3 },
  { name: 'الدستور - اقتصاد', url: 'https://www.dostor.org/rss/category/3', egyptian: true, weight: 2 },

  // Egypt — real estate
  { name: 'عقار ماب', url: 'https://aqarmap.com.eg/blog/feed/', egyptian: true, weight: 2 },

  // Regional
  { name: 'أرقام', url: 'https://www.argaam.com/ar/rss', egyptian: false, weight: 2 },
  { name: 'الاقتصادي', url: 'https://www.aliqtisadi.com/feed/', egyptian: false, weight: 2 },
  { name: 'العربية - أسواق', url: 'https://www.alarabiya.net/rssfeed/aswaq', egyptian: false, weight: 1 },
  { name: 'CNN العربية', url: 'https://arabic.cnn.com/business/rss', egyptian: false, weight: 1 },
  { name: 'BBC عربي', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml', egyptian: false, weight: 1 },
  { name: 'Sky News عربية', url: 'https://www.skynewsarabia.com/business/rss', egyptian: false, weight: 1 },
  { name: 'الجزيرة - اقتصاد', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, weight: 1 },
]

// Module-level pool stored in memory (only refreshed when stale)
let pool: { items: NewsItem[]; timestamp: number } | null = null
const POOL_TTL = 60 * 1000 // 60s — pool refresh rate (not response cache)

// ----------------------------------------------------------------------------
// XML helpers
// ----------------------------------------------------------------------------
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
        'User-Agent': 'Mozilla/5.0 (compatible; MadmonaBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items: NewsItem[] = []
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null
    const maxItems = source.weight * 5

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
      const itemXml = match[1]
      const title = extractTag(itemXml, 'title')
      const link = extractLink(itemXml)
      const image = extractImage(itemXml)
      const pubDate =
        extractTag(itemXml, 'pubDate') ||
        extractTag(itemXml, 'published') ||
        extractTag(itemXml, 'dc:date') ||
        new Date().toISOString()

      if (title && image && link && title.length > 10) {
        items.push({
          title: title.slice(0, 200),
          link, image,
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

async function buildPool(): Promise<NewsItem[]> {
  const results = await Promise.all(SOURCES.map(fetchSource))
  const allItems = results.flat()
  const seen = new Set<string>()
  return allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })
}

// Strong Fisher-Yates shuffle with a unique seed each call
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

// ----------------------------------------------------------------------------
// GET handler — FORCE DYNAMIC, no cache, fresh shuffle on every call
// ----------------------------------------------------------------------------
export async function GET() {
  // Refresh pool every 60s (or if empty)
  if (!pool || Date.now() - pool.timestamp > POOL_TTL) {
    const items = await buildPool()
    if (items.length > 0) {
      pool = { items, timestamp: Date.now() }
    } else if (!pool) {
      return new NextResponse(
        JSON.stringify({ ok: false, items: [], error: 'no_sources' }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }
  }

  // Different shuffle every single call
  const fresh = selectRandomMix(pool.items, 15)

  // Comprehensive no-cache headers — bypass Next.js, Vercel edge, CDN, browser
  return new NextResponse(
    JSON.stringify({
      ok: true,
      items: fresh,
      count: fresh.length,
      pool_size: pool.items.length,
      egyptian_in_pool: pool.items.filter(i => i.isEgyptian).length,
      generated_at: new Date().toISOString(),
      shuffle_seed: Math.random().toString(36).slice(2),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    }
  )
}
