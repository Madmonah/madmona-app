import { NextResponse } from 'next/server'

// ============================================================================
// GET /api/economic-news?seen=url1,url2,url3
//
// Returns LIVE economic news from 20+ Egyptian/Arabic RSS sources.
//
// "Seen tracking": client passes URLs of articles already shown.
// API filters them out and returns only NEW articles.
// → Result: every cycle on the homepage shows TRULY fresh content.
//
// Cache TTL = 30 seconds (very short — we want freshness).
// ============================================================================

export const revalidate = 30

interface NewsItem {
  title: string
  link: string
  image: string
  source: string
  pubDate: string
  isEgyptian: boolean
  category: 'economy' | 'stocks' | 'realestate' | 'general'
}

interface NewsSource {
  name: string
  url: string
  egyptian: boolean
  category: 'economy' | 'stocks' | 'realestate' | 'general'
  weight: number // higher = more items pulled from this source
}

const SOURCES: NewsSource[] = [
  // 🇪🇬 EGYPTIAN — Top tier financial papers
  { name: 'المال', url: 'https://almalnews.com/feed/', egyptian: true, category: 'economy', weight: 3 },
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, category: 'stocks', weight: 3 },
  { name: 'مباشر مصر', url: 'https://www.mubasher.info/rss/news', egyptian: true, category: 'stocks', weight: 3 },
  { name: 'الشروق', url: 'https://www.shorouknews.com/RSS/Feeds/Economy.xml', egyptian: true, category: 'economy', weight: 2 },
  { name: 'اليوم السابع', url: 'https://www.youm7.com/rss/SectionRss?SectionID=297', egyptian: true, category: 'economy', weight: 2 },

  // 🇪🇬 EGYPTIAN — General news (economy sections)
  { name: 'الأهرام', url: 'https://gate.ahram.org.eg/rss/PortalEconomyRss.aspx', egyptian: true, category: 'economy', weight: 2 },
  { name: 'المصري اليوم', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, category: 'economy', weight: 2 },
  { name: 'الوطن', url: 'https://www.elwatannews.com/rss/category/29.rss', egyptian: true, category: 'economy', weight: 2 },
  { name: 'صدى البلد', url: 'https://www.elbalad.news/rss?type=10', egyptian: true, category: 'economy', weight: 2 },
  { name: 'الدستور', url: 'https://www.dostor.org/rss/category/3', egyptian: true, category: 'economy', weight: 2 },
  { name: 'أخبار اليوم', url: 'https://www.akhbarelyom.com/rss', egyptian: true, category: 'general', weight: 2 },

  // 🇪🇬 EGYPTIAN — English (translates well, niche audience)
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, category: 'economy', weight: 1 },
  { name: 'Egypt Today', url: 'https://www.egypttoday.com/rss', egyptian: true, category: 'general', weight: 1 },

  // 🇪🇬 EGYPTIAN — Real estate
  { name: 'عقار ماب', url: 'https://aqarmap.com.eg/blog/feed/', egyptian: true, category: 'realestate', weight: 1 },

  // 🌍 ARABIC REGIONAL — Specialized economy
  { name: 'أرقام', url: 'https://www.argaam.com/ar/rss', egyptian: false, category: 'stocks', weight: 2 },
  { name: 'الاقتصادي', url: 'https://www.aliqtisadi.com/feed/', egyptian: false, category: 'economy', weight: 1 },
  { name: 'الشرق', url: 'https://asharq.com/feed', egyptian: false, category: 'economy', weight: 1 },

  // 🌍 ARABIC REGIONAL — General news
  { name: 'CNN العربية', url: 'https://arabic.cnn.com/business/rss', egyptian: false, category: 'economy', weight: 1 },
  { name: 'BBC عربي', url: 'http://feeds.bbci.co.uk/arabic/business/rss.xml', egyptian: false, category: 'economy', weight: 1 },
  { name: 'Sky News عربية', url: 'https://www.skynewsarabia.com/business/rss', egyptian: false, category: 'economy', weight: 1 },
  { name: 'الجزيرة', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, category: 'economy', weight: 1 },
]

// In-memory pool — we keep a large set of recent items, refresh periodically
let pool: { items: NewsItem[]; timestamp: number } | null = null
const POOL_TTL = 30 * 1000 // refresh pool every 30 seconds

// ----------------------------------------------------------------------------
// XML parsing helpers
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
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items: NewsItem[] = []
    const itemRegex = /<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi
    let match: RegExpExecArray | null
    const maxItems = source.weight * 4 // weight 3 → 12 items, weight 2 → 8, weight 1 → 4

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
          link, image,
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

// ----------------------------------------------------------------------------
// Pool builder — refreshes the entire pool from all 20+ sources
// ----------------------------------------------------------------------------

async function buildPool(): Promise<NewsItem[]> {
  const results = await Promise.all(SOURCES.map(fetchSource))
  const allItems = results.flat()

  // Dedupe by link
  const seen = new Set<string>()
  const deduped = allItems.filter(item => {
    if (seen.has(item.link)) return false
    seen.add(item.link)
    return true
  })

  // Sort: Egyptian first, then by date desc
  deduped.sort((a, b) => {
    if (a.isEgyptian !== b.isEgyptian) return a.isEgyptian ? -1 : 1
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  })

  return deduped
}

// ----------------------------------------------------------------------------
// Smart selector — returns N items, prioritizing UNSEEN ones, varied sources
// ----------------------------------------------------------------------------

function selectFreshItems(pool: NewsItem[], seenLinks: Set<string>, n: number): NewsItem[] {
  // 1) Filter out items the client has already seen
  const unseen = pool.filter(item => !seenLinks.has(item.link))

  // 2) If we have enough unseen items, use only those
  // 3) Otherwise, fall back to including some seen items (so user always gets content)
  const candidates = unseen.length >= n ? unseen : [...unseen, ...pool.filter(i => seenLinks.has(i.link))]

  // 4) Diversify: ensure we don't show 5 items from same source in a row
  // Group by source, then interleave round-robin style
  const bySource = new Map<string, NewsItem[]>()
  candidates.forEach(item => {
    if (!bySource.has(item.source)) bySource.set(item.source, [])
    bySource.get(item.source)!.push(item)
  })

  // Egyptian sources first when interleaving
  const egyptianGroups: NewsItem[][] = []
  const regionalGroups: NewsItem[][] = []
  bySource.forEach(group => {
    if (group[0].isEgyptian) egyptianGroups.push(group)
    else regionalGroups.push(group)
  })

  // Shuffle groups so order varies between calls
  egyptianGroups.sort(() => Math.random() - 0.5)
  regionalGroups.sort(() => Math.random() - 0.5)

  // Round-robin pull: 3 Egyptian → 1 regional → repeat
  const result: NewsItem[] = []
  let egIdx = 0
  let regIdx = 0
  let consecutiveEg = 0

  while (result.length < n) {
    let added = false

    // Try to add Egyptian
    if (consecutiveEg < 3 && egyptianGroups.length > 0) {
      const group = egyptianGroups[egIdx % egyptianGroups.length]
      if (group.length > 0) {
        result.push(group.shift()!)
        consecutiveEg++
        added = true
      }
      egIdx++
    }

    // Try to add regional
    if (!added || consecutiveEg >= 3) {
      if (regionalGroups.length > 0) {
        const group = regionalGroups[regIdx % regionalGroups.length]
        if (group.length > 0) {
          result.push(group.shift()!)
          consecutiveEg = 0
          added = true
        }
        regIdx++
      }
    }

    // Cleanup empty groups
    egyptianGroups.forEach((g, i) => { if (g.length === 0) egyptianGroups.splice(i, 1) })
    regionalGroups.forEach((g, i) => { if (g.length === 0) regionalGroups.splice(i, 1) })

    if (!added) break // pool exhausted
  }

  return result
}

// ----------------------------------------------------------------------------
// GET handler
// ----------------------------------------------------------------------------

export async function GET(request: Request) {
  const url = new URL(request.url)
  const seenParam = url.searchParams.get('seen') || ''
  const seenLinks = new Set(
    seenParam.split(',').map(s => s.trim()).filter(Boolean)
  )

  // Refresh pool if expired
  if (!pool || Date.now() - pool.timestamp > POOL_TTL) {
    const items = await buildPool()
    if (items.length > 0) {
      pool = { items, timestamp: Date.now() }
    } else if (!pool) {
      return NextResponse.json({ ok: false, items: [], error: 'no_sources' })
    }
  }

  // Select fresh items, excluding seen ones
  const fresh = selectFreshItems(pool.items, seenLinks, 15)

  return NextResponse.json({
    ok: true,
    items: fresh,
    count: fresh.length,
    pool_size: pool.items.length,
    seen_count: seenLinks.size,
  })
}
