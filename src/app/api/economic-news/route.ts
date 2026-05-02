import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/economic-news
//
// Fetches latest Arabic/Egyptian economic news from multiple RSS sources,
// extracts title + image + link, and returns top 12 items sorted by date.
//
// Cached for 10 minutes (in-memory + Next.js fetch cache) to avoid hammering
// upstream sources.
// ============================================================================

export const revalidate = 600 // 10 minutes

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
}

interface NewsSource {
  name: string
  url: string
}

// Reliable Arabic economic news RSS feeds
const SOURCES: NewsSource[] = [
  { name: 'المال', url: 'https://almalnews.com/feed/' },
  { name: 'البورصة', url: 'https://alborsaanews.com/feed' },
  { name: 'مباشر', url: 'https://www.mubasher.info/rss/news' },
  { name: 'CNN العربية', url: 'https://arabic.cnn.com/business/rss' },
  { name: 'BBC عربي', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml' },
  { name: 'Sky News عربية', url: 'https://www.skynewsarabia.com/business/rss' },
  { name: 'Reuters Arabic', url: 'https://ara.reuters.com/rssfeed/businessNews' },
  { name: 'الجزيرة', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml' },
]

// In-memory cache (resets on cold start, but Vercel keeps warm for ~5min)
let cache: { data: NewsItem[]; timestamp: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function decodeCData(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractTag(xml: string, tag: string): string {
  // Match both <tag>...</tag> and <tag attr="...">...</tag>
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i')
  const m = xml.match(regex)
  if (!m) return ''
  return decodeEntities(stripTags(decodeCData(m[1]))).trim()
}

function extractImage(itemXml: string): string | null {
  // 1) <media:content url="..."/>
  let m = itemXml.match(/<media:content[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)
  if (m) return m[1]

  // 2) <media:thumbnail url="..."/>
  m = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)
  if (m) return m[1]

  // 3) <enclosure url="..." type="image/..."/>
  m = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i)
  if (m) return m[1]
  m = itemXml.match(/<enclosure[^>]*type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/i)
  if (m) return m[1]

  // 4) <image><url>...</url></image>
  m = itemXml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i)
  if (m) return m[1]

  // 5) First <img src="..."> in description or content:encoded
  const descMatch = itemXml.match(/<(?:description|content:encoded)(?:\s[^>]*)?>([\s\S]*?)<\/(?:description|content:encoded)>/i)
  if (descMatch) {
    const inner = decodeCData(descMatch[1])
    const img = inner.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (img) return img[1]
  }

  return null
}

function extractLink(itemXml: string): string {
  // Try <link>https://...</link>
  let m = itemXml.match(/<link>([^<]+)<\/link>/i)
  if (m && m[1].startsWith('http')) return m[1].trim()

  // Try Atom-style <link href="..."/>
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
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000), // 8s timeout per source
    })

    if (!res.ok) return []

    const xml = await res.text()
    const items: NewsItem[] = []

    // Match all <item>...</item> (RSS) or <entry>...</entry> (Atom)
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
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
          link,
          image,
          source: source.name,
          pubDate,
        })
      }
    }

    return items
  } catch (e) {
    console.error(`[economic-news] Failed to fetch ${source.name}:`, e instanceof Error ? e.message : e)
    return []
  }
}

// ----------------------------------------------------------------------------
// GET handler
// ----------------------------------------------------------------------------

export async function GET() {
  // Use in-memory cache first
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ok: true,
      items: cache.data,
      cached: true,
      count: cache.data.length,
    })
  }

  // Fetch all sources in parallel (failures ignored individually)
  const results = await Promise.all(SOURCES.map(fetchSource))
  const allItems = results.flat()

  if (allItems.length === 0) {
    return NextResponse.json({
      ok: false,
      items: [],
      error: 'no_sources_responded',
    })
  }

  // Sort by date descending and take top 12
  const sorted = allItems
    .sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime() || 0
      const dateB = new Date(b.pubDate).getTime() || 0
      return dateB - dateA
    })
    .slice(0, 12)

  // Update cache
  cache = { data: sorted, timestamp: Date.now() }

  return NextResponse.json({
    ok: true,
    items: sorted,
    cached: false,
    count: sorted.length,
  })
}
