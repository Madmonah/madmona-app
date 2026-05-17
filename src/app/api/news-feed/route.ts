import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// GET /api/news-feed?category=economy|real_estate|automotive|business|tourism|fashion|tech
//
// MADMONA NEWS FEED — refreshed every 3 min, recency-filtered, brand-fallbacks.
// Now merges:
//   1. admin_news (manually curated entries from /admin/news) — pinned first
//   2. RSS items from Egyptian + Arabic + international sources
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
  isPinned?: boolean
  isAdmin?: boolean
}

interface NewsSource {
  name: string
  url: string
  egyptian: boolean
  weight: number
  category: NewsCategory
}

// ============================================================================
// MADMONA BRAND-IDENTITY FALLBACK IMAGES
// ============================================================================

const CATEGORY_LABELS_AR: Record<NewsCategory, string> = {
  economy: 'اقتصاد',
  real_estate: 'عقارات',
  automotive: 'سيارات',
  business: 'أعمال',
  tourism: 'سياحة',
  fashion: 'موضة وأعراس',
  tech: 'تكنولوجيا',
}

const CATEGORY_ICONS: Record<NewsCategory, string> = {
  economy:
    '<path d="M -50 30 L -15 -10 L 15 12 L 50 -35" stroke="#2FA084" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="-35" r="6" fill="#2FA084"/><path d="M -50 45 L 50 45" stroke="#2FA084" stroke-width="3" fill="none" opacity="0.5"/>',
  real_estate:
    '<rect x="-45" y="-15" width="90" height="55" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><polygon points="-55,-15 0,-50 55,-15" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><rect x="-15" y="10" width="30" height="30" stroke="#2FA084" stroke-width="4" fill="none"/>',
  automotive:
    '<path d="M -55 10 L -45 -20 L 45 -20 L 55 10 L 55 25 L -55 25 Z" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><circle cx="-30" cy="28" r="10" stroke="#2FA084" stroke-width="5" fill="#1F6F5F"/><circle cx="30" cy="28" r="10" stroke="#2FA084" stroke-width="5" fill="#1F6F5F"/>',
  business:
    '<rect x="-40" y="-15" width="80" height="55" rx="6" stroke="#2FA084" stroke-width="6" fill="none"/><path d="M -20 -15 L -20 -30 L 20 -30 L 20 -15" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="M -40 12 L 40 12" stroke="#2FA084" stroke-width="3" opacity="0.5"/>',
  tourism:
    '<path d="M 0 -45 Q -20 -30 -25 -10 Q -28 5 -15 15 L 15 15 Q 28 5 25 -10 Q 20 -30 0 -45 Z" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="M -45 30 Q -22 22 0 30 Q 22 38 45 30" stroke="#2FA084" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="0" cy="-15" r="4" fill="#2FA084"/>',
  fashion:
    '<path d="M -35 -25 L -50 35 L 50 35 L 35 -25 Z" stroke="#2FA084" stroke-width="6" fill="none" stroke-linejoin="round"/><circle cx="0" cy="-35" r="10" stroke="#2FA084" stroke-width="5" fill="none"/><path d="M -35 -25 L 35 -25" stroke="#2FA084" stroke-width="5" stroke-linecap="round"/>',
  tech:
    '<rect x="-35" y="-30" width="70" height="60" rx="6" stroke="#2FA084" stroke-width="6" fill="none"/><circle cx="0" cy="0" r="14" stroke="#2FA084" stroke-width="5" fill="none"/><path d="M -45 -15 L -35 -15 M -45 0 L -35 0 M -45 15 L -35 15 M 35 -15 L 45 -15 M 35 0 L 45 0 M 35 15 L 45 15" stroke="#2FA084" stroke-width="5" stroke-linecap="round"/>',
}

function makeFallbackSVG(category: NewsCategory): string {
  const label = CATEGORY_LABELS_AR[category]
  const icon = CATEGORY_ICONS[category]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 600" preserveAspectRatio="xMidYMid slice"><defs><pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="0.8" fill="#FAF7F0" opacity="0.06"/></pattern></defs><rect width="1080" height="600" fill="#1F6F5F"/><rect width="1080" height="600" fill="url(#dots)"/><rect x="0" y="0" width="1080" height="6" fill="#2FA084"/><rect x="0" y="594" width="1080" height="6" fill="#2FA084"/><g transform="translate(540,250)">${icon}</g><text x="540" y="400" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="68" font-weight="700" fill="#FAF7F0">${label}</text><text x="540" y="450" text-anchor="middle" font-family="Tahoma, Arial, sans-serif" font-size="22" font-weight="400" fill="#FAF7F0" opacity="0.65">آخر الأخبار · من Madmona</text><text x="540" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="#2FA084" letter-spacing="6">MADMONA · احنا بتوع الإيجار</text></svg>`
  const b64 = Buffer.from(svg, 'utf-8').toString('base64')
  return `data:image/svg+xml;base64,${b64}`
}

// ============================================================================
// CATEGORY KEYWORDS (filter for relevance)
// ============================================================================

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

const gnews = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ar-EG&gl=EG&ceid=EG:ar`

const ALL_SOURCES: NewsSource[] = [
  // 💰 ECONOMY
  { name: 'البورصة', url: 'https://alborsaanews.com/feed', egyptian: true, weight: 6, category: 'economy' },
  { name: 'Daily News Egypt', url: 'https://dailynewsegypt.com/feed/', egyptian: true, weight: 5, category: 'economy' },
  { name: 'المصري اليوم - اقتصاد', url: 'https://www.almasryalyoum.com/rss/rssfeeds?category=1', egyptian: true, weight: 5, category: 'economy' },
  { name: 'Google News - اقتصاد', url: gnews('اقتصاد مصر'), egyptian: true, weight: 4, category: 'economy' },
  { name: 'CNN العربية - اقتصاد', url: 'https://arabic.cnn.com/business/rss', egyptian: false, weight: 2, category: 'economy' },
  { name: 'الجزيرة - اقتصاد', url: 'https://www.aljazeera.net/aljazeerarss/economy.xml', egyptian: false, weight: 2, category: 'economy' },

  // 🏠 REAL ESTATE
  { name: 'Google News - عقارات', url: gnews('عقارات مصر'), egyptian: true, weight: 6, category: 'real_estate' },
  { name: 'Google News - شقق', url: gnews('شقق سكنية'), egyptian: true, weight: 5, category: 'real_estate' },
  { name: 'Google News - العاصمة الإدارية', url: gnews('العاصمة الإدارية الجديدة عقارات'), egyptian: true, weight: 4, category: 'real_estate' },
  { name: 'Google News - الإسكان', url: gnews('وزارة الإسكان مصر'), egyptian: true, weight: 4, category: 'real_estate' },
  { name: 'Google News - real estate Egypt', url: gnews('Egypt real estate'), egyptian: false, weight: 3, category: 'real_estate' },

  // 🚗 AUTOMOTIVE
  { name: 'Google News - سيارات', url: gnews('سيارات مصر'), egyptian: true, weight: 6, category: 'automotive' },
  { name: 'Google News - أسعار السيارات', url: gnews('أسعار السيارات مصر'), egyptian: true, weight: 5, category: 'automotive' },
  { name: 'Google News - سيارات كهربائية', url: gnews('سيارات كهربائية مصر'), egyptian: true, weight: 4, category: 'automotive' },
  { name: 'Google News - cars Egypt', url: gnews('Egypt cars market'), egyptian: false, weight: 3, category: 'automotive' },
  { name: 'Google News - automotive', url: gnews('automotive industry electric vehicles'), egyptian: false, weight: 2, category: 'automotive' },

  // 💼 BUSINESS
  { name: 'Google News - شركات مصر', url: gnews('شركات مصر استثمار'), egyptian: true, weight: 6, category: 'business' },
  { name: 'Google News - ستارت أب', url: gnews('startup مصر تمويل'), egyptian: true, weight: 5, category: 'business' },
  { name: 'Google News - رواد الأعمال', url: gnews('ريادة أعمال مصر'), egyptian: true, weight: 4, category: 'business' },
  { name: 'Daily News - Business', url: 'https://dailynewsegypt.com/category/business/feed/', egyptian: true, weight: 4, category: 'business' },
  { name: 'Google News - fintech Egypt', url: gnews('fintech Egypt MENA'), egyptian: false, weight: 3, category: 'business' },

  // ✈️ TOURISM
  { name: 'Google News - سياحة مصر', url: gnews('سياحة مصر'), egyptian: true, weight: 6, category: 'tourism' },
  { name: 'Google News - شرم الشيخ', url: gnews('شرم الشيخ سياحة'), egyptian: true, weight: 5, category: 'tourism' },
  { name: 'Google News - الغردقة', url: gnews('الغردقة سياحة فنادق'), egyptian: true, weight: 4, category: 'tourism' },
  { name: 'Google News - فنادق', url: gnews('فنادق مصر إشغال'), egyptian: true, weight: 4, category: 'tourism' },
  { name: 'Google News - tourism Egypt', url: gnews('Egypt tourism Red Sea'), egyptian: false, weight: 3, category: 'tourism' },

  // 👗 FASHION
  { name: 'Vogue Arabia', url: 'https://en.vogue.me/feed/', egyptian: false, weight: 5, category: 'fashion' },
  { name: 'سيدتي - أناقة', url: 'https://www.sayidaty.net/rss-feed/3', egyptian: false, weight: 5, category: 'fashion' },
  { name: 'فستاني', url: 'https://www.fustany.com/ar/rss', egyptian: true, weight: 5, category: 'fashion' },
  { name: 'Layalina', url: 'https://layalina.com/feed/', egyptian: false, weight: 4, category: 'fashion' },
  { name: 'Elle Arabia', url: 'https://www.ellearabia.com/feed', egyptian: false, weight: 3, category: 'fashion' },
  { name: 'Google News - فساتين زفاف', url: gnews('فساتين زفاف موضة'), egyptian: false, weight: 3, category: 'fashion' },

  // 💻 TECH
  { name: 'Google News - تكنولوجيا', url: gnews('تكنولوجيا مصر'), egyptian: true, weight: 5, category: 'tech' },
  { name: 'الجزيرة - تكنولوجيا', url: 'https://www.aljazeera.net/aljazeerarss/technology.xml', egyptian: false, weight: 5, category: 'tech' },
  { name: 'BBC عربي - تكنولوجيا', url: 'http://feeds.bbci.co.uk/arabic/scienceandtech/rss.xml', egyptian: false, weight: 4, category: 'tech' },
  { name: 'CNN العربية - تكنولوجيا', url: 'https://arabic.cnn.com/tech/rss', egyptian: false, weight: 4, category: 'tech' },
  { name: 'Google News - AI', url: gnews('ذكاء اصطناعي تكنولوجيا'), egyptian: false, weight: 3, category: 'tech' },
  { name: 'Google News - كاميرات', url: gnews('كاميرات تصوير احترافية'), egyptian: false, weight: 3, category: 'tech' },
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
const MAX_AGE_DAYS = 14

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

function isRecent(pubDate: string): boolean {
  if (!pubDate) return true
  const d = new Date(pubDate)
  if (isNaN(d.getTime())) return true
  const ageMs = Date.now() - d.getTime()
  const maxMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return ageMs >= 0 && ageMs <= maxMs
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
    const fallback = makeFallbackSVG(source.category)

    while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
      const itemXml = match[1]
      const title = extractTag(itemXml, 'title')
      const link = extractLink(itemXml)
      const rawImage = extractImage(itemXml)
      const image = rawImage || fallback
      const pubDate =
        extractTag(itemXml, 'pubDate') ||
        extractTag(itemXml, 'published') ||
        extractTag(itemXml, 'dc:date') ||
        new Date().toISOString()

      if (!isRecent(pubDate)) continue

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

// ============================================================================
// ADMIN NEWS - fetch manually-curated entries from DB
// ============================================================================

interface AdminNewsRow {
  id: string
  title: string
  link: string | null
  image_url: string | null
  category: NewsCategory
  source_label: string | null
  is_pinned: boolean
  pub_date: string
}

async function fetchAdminNews(category: NewsCategory): Promise<NewsItem[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) return []
    const supabase = createClient(supabaseUrl, supabaseKey)

    // @ts-expect-error - RLS allows anon read of published rows
    const { data } = await supabase
      .from('admin_news')
      .select('id, title, link, image_url, category, source_label, is_pinned, pub_date')
      .eq('category', category)
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('pub_date', { ascending: false })
      .limit(20)

    if (!data || !Array.isArray(data)) return []

    const fallback = makeFallbackSVG(category)
    return (data as AdminNewsRow[]).map((row) => ({
      title: row.title,
      link: row.link || `https://madmonacairo.com/?n=${row.id}`,
      image: row.image_url || fallback,
      source: row.source_label || 'Madmona',
      pubDate: row.pub_date,
      isEgyptian: true,
      category,
      isPinned: row.is_pinned,
      isAdmin: true,
    }))
  } catch {
    return []
  }
}

async function buildPool(category: NewsCategory): Promise<NewsItem[]> {
  const sources = ALL_SOURCES.filter(s => s.category === category)
  const [adminItems, ...rssResults] = await Promise.all([
    fetchAdminNews(category),
    ...sources.map(fetchSource),
  ])
  const rssItems = rssResults.flat()

  // Apply keyword filter to RSS only (admin items already curated)
  let filteredRss = rssItems
  const keywords = CATEGORY_KEYWORDS[category]
  if (keywords?.must && keywords.must.length > 0) {
    const mustKeywords = keywords.must
    const filtered = rssItems.filter(item => {
      const haystack = item.title.toLowerCase()
      return mustKeywords.some(kw => haystack.includes(kw.toLowerCase()))
    })
    if (filtered.length >= 3) {
      filteredRss = filtered
    }
  }

  // Sort RSS by recency
  filteredRss.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0
    const db = new Date(b.pubDate).getTime() || 0
    return db - da
  })

  // Dedupe (admin entries take priority over RSS with same link)
  const seen = new Set<string>()
  const merged: NewsItem[] = []

  // Pinned admin first, then unpinned admin, then RSS
  const pinned = adminItems.filter(i => i.isPinned)
  const unpinned = adminItems.filter(i => !i.isPinned)
  for (const item of [...pinned, ...unpinned, ...filteredRss]) {
    if (seen.has(item.link)) continue
    seen.add(item.link)
    merged.push(item)
  }

  return merged
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
  // Always keep pinned admin items at the front, regardless of shuffle
  const pinned = allItems.filter(i => i.isPinned)
  const rest = allItems.filter(i => !i.isPinned)

  // Bias rest toward freshness
  const freshHalf = rest.slice(0, Math.max(n * 3, Math.ceil(rest.length / 2)))
  const egyptian = freshHalf.filter(i => i.isEgyptian)
  const other = freshHalf.filter(i => !i.isEgyptian)
  const remainingSlots = Math.max(0, n - pinned.length)
  const targetEg = Math.min(Math.ceil(remainingSlots * 0.7), egyptian.length)
  const targetOther = remainingSlots - targetEg

  const picked: NewsItem[] = [
    ...pinned.slice(0, n),
    ...shuffle(egyptian).slice(0, targetEg),
    ...shuffle(other).slice(0, targetOther),
  ]
  if (picked.length < n) {
    const remaining = [...egyptian, ...other].filter(item => !picked.includes(item))
    while (picked.length < n && remaining.length > 0) {
      picked.push(remaining.shift()!)
    }
  }
  return picked.slice(0, n)
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
      pool.timestamp = Date.now()
      pool.refreshing = false
    }
  } catch {
    if (pool) {
      pool.timestamp = Date.now()
      pool.refreshing = false
    }
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
  const adminCount = pool.items.filter(i => i.isAdmin).length

  return new NextResponse(
    JSON.stringify({
      ok: true,
      category,
      items: fresh,
      count: fresh.length,
      pool_size: pool.items.length,
      admin_count: adminCount,
      pool_age_seconds: ageSeconds,
      next_refresh_in_seconds: nextRefreshIn,
      max_item_age_days: MAX_AGE_DAYS,
      generated_at: new Date().toISOString(),
    }),
    { status: 200, headers: noCacheHeaders() }
  )
}
