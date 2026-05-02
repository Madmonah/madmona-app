import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/economic-news
//
// Egyptian-first economic news from RSS sources.
// Cache TTL = 60 seconds — refreshes very frequently for "always fresh" feel.
// ============================================================================

export const revalidate = 60

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
}

const SOURCES: NewsSource[] = [
  // 🇪🇬 Egyptian
  { name: 'المال', url: 'https://almalnews.com/feed/', egyptian: true },
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true },
  { name: 'مباشر مصر', url: 'https://www.mubasher.info/rss/news', egyptian: true },
  { name: 'الشروق', url: 'https://www.shorouknews.com/RSS/Feeds/Economy.xml', egyptian: true },
  { name: 'الوطن', url: 'https://www.elwatannews.com/rss/category/29.rss', egyptian: true },
  { name: 'اليوم السابع', url: 'https://www.youm7.com/rss/SectionRss?SectionID=297', egyptian: true },
  { name: 'الأهرام', url: 'https://gate.ahram.org.eg/rss/PortalEconomyRss.aspx', egyptian: true },
  { name: 'المصري اليوم', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true },
  // 🌍 Regional
  { name: 'CNN العربية', url: 'https://arabic.cnn.com/business/rss', egyptian: false },
  { name: 'BBC عربي', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml', egyptian: false },
  { name: 'Sky News عربية', url: 'https://www.skynewsarabia.com/business/rss', egyptian: false },
]

let cache: { data: NewsItem[]; timestamp: number } | null = null
const CACHE_TTL = 60 * 1000 // 60 seconds — very fresh

// Helpers --------------------------------------------------------------------

function decodeCData(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, '').trim()
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
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
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items: NewsItem[] = []
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null
    const maxItems = source.egyptian ? 8 : 3 // more from Egyptian sources

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

      if (title && image && link) {
        items.push({
          title: title.slice(0, 200),
          link, image, source: source.name, pubDate,
          isEgyptian: source.egyptian,
        })
      }
    }
    return items
  } catch {
    return []
  }
}

// Handler --------------------------------------------------------------------

export async function GET(request: Request) {
  const url = new URL(request.url)
  const forceFresh = url.searchParams.get('fresh') === '1'

  if (!forceFresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ok: true, items: cache.data, cached: true, count: cache.data.length,
    })
  }

  const results = await Promise.all(SOURCES.map(fetchSource))
  const allItems = results.flat()

  if (allItems.length === 0) {
    return NextResponse.json({ ok: false, items: [], error: 'no_sources' })
  }

  const egyptian = allItems
    .filter(i => i.isEgyptian)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  const regional = allItems
    .filter(i => !i.isEgyptian)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  // Shuffle slightly within each priority group so consecutive page loads
  // see different orderings (gives "fresh" feeling even if cache hit nearby)
  const merged: NewsItem[] = []
  const egTop = egyptian.slice(0, 16)
  const regTop = regional.slice(0, 5)

  let egIdx = 0
  let regIdx = 0
  while (egIdx < egTop.length || regIdx < regTop.length) {
    for (let i = 0; i < 3 && egIdx < egTop.length; i++) {
      merged.push(egTop[egIdx++])
    }
    if (regIdx < regTop.length) {
      merged.push(regTop[regIdx++])
    }
  }

  const final = merged.slice(0, 21) // up to 21 items now (was 16)

  cache = { data: final, timestamp: Date.now() }

  return NextResponse.json({
    ok: true, items: final, cached: false, count: final.length,
    egyptian_count: egTop.length,
  })
}
