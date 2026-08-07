import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Alexandria, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { DEVELOPER_DIRECTORY } from '@/lib/developer-directory'
import CompactNewsTabs from '@/components/CompactNewsTabs'
import RedesignMarquee from './RedesignMarquee'

// ============================================================================
// HomeRedesign — (٧ أغسطس ٢٠٢٦) «التصميم الجديد» من ملف Madmona Redesign
// اللي عمله محمد في Claude Design. ديسكتوب بس — الموبايل لسه MobileHome.
// الهوية: كريمي #F4EFE4 · أخضر غامق #0E332C · دهبي #B8860B · خط Alexandria.
// كل الداتا حقيقية: إحصائيات + أقسام + بورصة property_market_items + مطورين.
// ============================================================================

const alex = Alexandria({ subsets: ['arabic', 'latin'], weight: ['700', '900'], variable: '--font-alex', display: 'swap' })
const ibm = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700'], variable: '--font-ibm', display: 'swap' })

const INK = '#0E332C'
const CREAM = '#F4EFE4'
const GOLD = '#B8860B'

type Cat = {
  id: string; name_ar: string; slug: string; icon: string | null; track: string | null
  group_slug?: string | null; group_name_ar?: string | null; group_emoji?: string | null; group_display_order?: number | null
}

type Props = {
  categories: Cat[]
  stats: { listings: number; suppliers: number; categories: number; cities: number }
  liveCounts: Record<string, number>
  heroImage: string
}

type MarketItem = {
  area: 'new_capital' | 'new_cairo' | 'sahel'
  segment: string
  title: string
  price_from: number | null
  price_to: number | null
  price_unit: string | null
  updated_at: string
}

const kFmt = (n: number | null) => {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} مليون`
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString('ar-EG')} ألف`
  return n.toLocaleString('ar-EG')
}
const unitLabel = (u: string | null) => (u === 'egp_per_m2' ? 'ج/م²' : u === 'egp_per_night' ? 'ج/ليلة' : u === 'egp_per_month' ? 'ج/شهر' : 'ج')
const rangeFmt = (i: MarketItem) => {
  const a = kFmt(i.price_from); const b = kFmt(i.price_to)
  return a && b ? `${a} - ${b} ${unitLabel(i.price_unit)}` : `${a || b} ${unitLabel(i.price_unit)}`
}

async function getMarketTiles() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('property_market_items')
      .select('area, segment, title, price_from, price_to, price_unit, updated_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    const items = (data || []) as MarketItem[]
    if (!items.length) return { tiles: [], updated: '' }
    const pick = (area: string, seg: string, unit?: string) =>
      items.find(i => i.area === area && i.segment === seg && (!unit || i.price_unit === unit))
    const defs = [
      { it: pick('new_capital', 'resale', 'egp_per_m2'), area: 'العاصمة الإدارية', emoji: '🏛️', img: '/areas/capital.jpg' },
      { it: pick('new_cairo', 'resale', 'egp_per_m2'), area: 'التجمع الخامس', emoji: '📍', img: '/areas/newcairo.jpg' },
      { it: pick('sahel', 'rent'), area: 'الساحل — الصيف', emoji: '⛱️', img: '/areas/coast.jpg' },
      { it: pick('new_cairo', 'rent'), area: 'إيجارات التجمع', emoji: '🔑', img: '/areas/rentals.jpg' },
    ]
    const updatedRaw = items.reduce((mx, it) => (it.updated_at > mx ? it.updated_at : mx), items[0].updated_at)
    let updated = ''
    try { updated = new Date(updatedRaw).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) } catch {}
    const tiles = defs
      .filter(d => d.it)
      .map(d => ({ area: d.area, emoji: d.emoji, img: d.img, value: rangeFmt(d.it as MarketItem), label: (d.it as MarketItem).title }))
    return { tiles, updated }
  } catch {
    return { tiles: [], updated: '' }
  }
}

const ACCENTS = ['#B8860B', '#2FA084', '#C0563F', '#6D5ACF', '#0E332C']
const TINTS = ['rgba(184,134,11,0.14)', 'rgba(47,160,132,0.14)', 'rgba(192,86,63,0.14)', 'rgba(109,90,207,0.14)', 'rgba(14,51,44,0.1)']

function buildGroups(categories: Cat[], liveCounts: Record<string, number>) {
  const map = new Map<string, { slug: string; name: string; emoji: string; count: number; order: number; catCount: number }>()
  for (const c of categories) {
    const key = c.group_slug || c.track || 'other'
    const g = map.get(key) || {
      slug: key,
      name: c.group_name_ar || c.name_ar,
      emoji: c.group_emoji || c.icon || '🏷️',
      count: liveCounts[key] || 0,
      order: c.group_display_order ?? 99,
      catCount: 0,
    }
    g.catCount++
    map.set(key, g)
  }
  return [...map.values()].sort((a, b) => (b.count - a.count) || (a.order - b.order)).slice(0, 5)
}

export default async function HomeRedesign({ categories, stats, liveCounts, heroImage }: Props) {
  const { tiles, updated } = await getMarketTiles()
  const groups = buildGroups(categories, liveCounts)
  const devs = DEVELOPER_DIRECTORY.slice(0, 14)
  const devsLoop = [...devs, ...devs]

  return (
    <div dir="rtl" className={`${alex.variable} ${ibm.variable}`} style={{ minHeight: '100vh', background: CREAM, fontFamily: 'var(--font-ibm), sans-serif', color: '#12261F' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes rzRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes rzFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes rzMq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.rz-mq { animation: rzMq 30s linear infinite; }
.rz-mq-slow { animation: rzMq 35s linear infinite; }
.rz-rise { animation: rzRise 0.7s ease both; }
.rz-rise-2 { animation: rzRise 0.7s ease 0.15s both; }
.rz-float { animation: rzFloat 5s ease-in-out infinite; }
.rz-float-2 { animation: rzFloat 5s ease-in-out 0.7s infinite; }
.rz-lift { transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
.rz-lift:hover { transform: translateY(-4px); }
.rz-cat { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.rz-cat:hover { transform: translateY(-6px); box-shadow: 6px 6px 0 var(--acc, ${GOLD}); }
.rz-inkbtn { transition: background 0.25s ease, color 0.25s ease; }
.rz-inkbtn:hover { background: ${GOLD} !important; }
.rz-goldbtn { transition: background 0.25s ease, color 0.25s ease; }
.rz-goldbtn:hover { background: ${CREAM} !important; color: ${INK} !important; }
.rz-ghost:hover { background: rgba(14,51,44,0.06); }
.rz-navlink { transition: color 0.2s ease; }
.rz-navlink:hover { color: ${INK} !important; }
.rz-newsrow:hover { background: ${CREAM}; }
a { text-decoration: none; }
`,
        }}
      />

      {/* Top hairline */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD}, ${INK} 30%, ${INK} 70%, ${GOLD})` }} />

      {/* ═══ Nav ═══ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(244,239,228,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(18,38,31,0.12)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 48, background: INK, borderRadius: '21px 21px 6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 20, paddingTop: 4 }}>م</span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 21, color: INK }}>مضمونة</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.42em', color: GOLD }}>MADMONA</span>
            </span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14, fontWeight: 500 }}>
            <Link href="/marketplace" style={{ color: INK, borderBottom: `2px solid ${GOLD}`, paddingBottom: 2 }}>السوق</Link>
            <Link className="rz-navlink" href="/marketplace?track=sales" style={{ color: 'rgba(18,38,31,0.65)' }}>العقارات</Link>
            <Link className="rz-navlink" href="/marketplace?track=services" style={{ color: 'rgba(18,38,31,0.65)' }}>الخدمات</Link>
            <Link className="rz-navlink" href="/marketplace?track=restaurants" style={{ color: 'rgba(18,38,31,0.65)' }}>المطاعم</Link>
            <Link className="rz-navlink" href="/chat/marid" style={{ color: 'rgba(18,38,31,0.65)' }}>اسأل الجني ✨</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link className="rz-ghost" href="/auth/login" style={{ height: 42, padding: '0 18px', borderRadius: 999, border: `1.5px solid ${INK}`, background: 'transparent', color: INK, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>دخول</Link>
            <Link className="rz-inkbtn" href="/list-your-asset" style={{ height: 42, padding: '0 20px', borderRadius: 999, background: INK, color: CREAM, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', boxShadow: '0 8px 20px -8px rgba(14,51,44,0.5)' }}>ضيف إعلانك</Link>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '72px 28px 40px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48, alignItems: 'center' }}>
          <div className="rz-rise">
            <p style={{ margin: '0 0 18px', display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: GOLD }}>
              <span style={{ width: 28, height: 1.5, background: GOLD, display: 'inline-block' }} />
              سوق مصر المضمون · القاهرة
            </p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 76, lineHeight: 1.12, letterSpacing: '-0.01em', color: INK }}>
              كل حاجة<br />
              <span style={{ color: 'transparent', WebkitTextStroke: `2px ${INK}` }}>تشتريها</span> أو<br />
              تأجرها… <span style={{ position: 'relative', display: 'inline-block', color: GOLD }}>مضمونة<span style={{ position: 'absolute', right: 0, left: 0, bottom: 6, height: 10, background: 'rgba(184,134,11,0.18)', zIndex: -1, borderRadius: 4 }} /></span>
            </h1>
            <p style={{ margin: '22px 0 0', maxWidth: 460, fontSize: 16, lineHeight: 1.9, color: 'rgba(18,38,31,0.7)' }}>
              عقارات، عربيات، خدمات، مطاعم — كل مورد متوثّق، وكل صفقة عليها ضمان مضمونة. دوّر، قارن، واحجز وانت مطمّن.
            </p>
            <form action="/marketplace" role="search" style={{ marginTop: 30, maxWidth: 520, display: 'flex', alignItems: 'center', background: '#fff', border: `2px solid ${INK}`, borderRadius: 999, padding: 6, boxShadow: `6px 6px 0 ${INK}` }}>
              <input type="search" name="q" placeholder="دوّر على شقة، عربية، خبيرة ميكب…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 500, color: '#12261F', padding: '10px 18px', minWidth: 0, fontFamily: 'var(--font-ibm), sans-serif' }} />
              <button className="rz-inkbtn" type="submit" style={{ border: 'none', cursor: 'pointer', height: 48, padding: '0 30px', borderRadius: 999, background: INK, color: CREAM, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 700, fontSize: 15 }}>دوّر</button>
            </form>
            <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 26 }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 26, color: INK }}>{(stats.suppliers || 0).toLocaleString('ar-EG')}+</span>
                <span style={{ fontSize: 12, color: 'rgba(18,38,31,0.6)' }}>مورد موثّق</span>
              </span>
              <span style={{ width: 1, height: 34, background: 'rgba(18,38,31,0.15)' }} />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 26, color: INK }}>{(stats.listings || 0).toLocaleString('ar-EG')}</span>
                <span style={{ fontSize: 12, color: 'rgba(18,38,31,0.6)' }}>إعلان نشط</span>
              </span>
              <span style={{ width: 1, height: 34, background: 'rgba(18,38,31,0.15)' }} />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 26, color: GOLD }}>١٠٠٪</span>
                <span style={{ fontSize: 12, color: 'rgba(18,38,31,0.6)' }}>صفقات مضمونة</span>
              </span>
            </div>
          </div>

          {/* Arch collage */}
          <div className="rz-rise-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Link className="rz-lift" href="/marketplace?track=sales" style={{ gridRow: 'span 2', position: 'relative', borderRadius: '160px 160px 20px 20px', overflow: 'hidden', minHeight: 380, display: 'block', border: `2px solid ${INK}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="عقارات" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,51,44,0.9), rgba(14,51,44,0.05) 60%)' }} />
              <span style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: 22, display: 'block' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 24, color: CREAM }}>عقارات</span>
                <span style={{ display: 'block', fontSize: 12, color: 'rgba(244,239,228,0.75)', marginTop: 2 }}>بيع · إيجار · مصايف</span>
              </span>
              <span style={{ position: 'absolute', top: 18, left: 18, padding: '5px 14px', borderRadius: 999, background: GOLD, color: '#fff', fontSize: 11, fontWeight: 700 }}>الأكثر طلباً</span>
            </Link>
            <Link className="rz-lift" href="/marketplace?group=sale-vehicles" style={{ position: 'relative', borderRadius: '100px 100px 20px 20px', overflow: 'hidden', minHeight: 183, display: 'block', background: INK, border: `2px solid ${INK}` }}>
              <span className="rz-float" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 }}>🚗</span>
              <span style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: 16, display: 'block' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 18, color: CREAM }}>عربيات</span>
              </span>
            </Link>
            <Link className="rz-lift" href="/marketplace?track=services" style={{ position: 'relative', borderRadius: '100px 100px 20px 20px', overflow: 'hidden', minHeight: 183, display: 'block', background: GOLD, border: `2px solid ${INK}` }}>
              <span className="rz-float-2" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 }}>🛠️</span>
              <span style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: 16, display: 'block' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 18, color: '#fff' }}>خدمات</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Marquee (لايف) ═══ */}
      <RedesignMarquee />

      {/* ═══ Categories ═══ */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '84px 28px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: GOLD }}>الأقسام</p>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 44, color: INK, letterSpacing: '-0.01em' }}>اختار مجالك</h2>
          </div>
          <Link href="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: INK, borderBottom: `2px solid ${GOLD}`, paddingBottom: 3 }}>كل الأقسام ←</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          {groups.map((g, i) => (
            <Link
              key={g.slug}
              className="rz-cat"
              href={`/marketplace?group=${encodeURIComponent(g.slug)}`}
              style={{ ['--acc' as string]: ACCENTS[i % ACCENTS.length], position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '36px 18px 26px', background: '#fff', border: `2px solid ${INK}`, borderRadius: '110px 110px 18px 18px', textAlign: 'center' }}
            >
              <span style={{ width: 64, height: 64, borderRadius: '50%', background: TINTS[i % TINTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{g.emoji}</span>
              <span style={{ display: 'block' }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 18, color: INK }}>{g.name}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(18,38,31,0.55)', marginTop: 4 }}>{g.catCount} قسم فرعي</span>
              </span>
              <span style={{ padding: '5px 16px', borderRadius: 999, background: ACCENTS[i % ACCENTS.length], color: '#fff', fontSize: 11, fontWeight: 700 }}>
                {g.count > 0 ? `${g.count.toLocaleString('ar-EG')} إعلان` : 'استكشف'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Live market (dark) ═══ */}
      {tiles.length > 0 && (
        <section style={{ background: INK, padding: '72px 28px', position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: -120, left: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,134,11,0.22), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 36 }}>
              <div>
                <p style={{ margin: '0 0 10px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: GOLD }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                  بورصة مضمونة · لايف
                </p>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 44, color: CREAM, letterSpacing: '-0.01em' }}>أسعار السوق دلوقتي</h2>
              </div>
              <Link className="rz-goldbtn" href="/real-estate/market" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 26px', borderRadius: 999, background: GOLD, color: '#fff', fontWeight: 700, fontSize: 14 }}>شوف كل الأسعار ←</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {tiles.map(t => (
                <div key={t.area} className="rz-lift" style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(244,239,228,0.14)', borderRadius: 18, padding: 24 }}>
                  <span style={{ position: 'absolute', inset: 0, backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,32,27,0.95), rgba(10,32,27,0.72))' }} />
                  <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(244,239,228,0.85)' }}>{t.area}</span>
                    <span style={{ fontSize: 20 }}>{t.emoji}</span>
                  </span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 16, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 25, color: CREAM, fontVariantNumeric: 'tabular-nums' }}>{t.value}</span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 4, fontSize: 12, color: 'rgba(244,239,228,0.7)' }}>{t.label}</span>
                  <span style={{ position: 'relative', display: 'inline-flex', marginTop: 14, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(74,222,128,0.15)', color: '#4ADE80' }}>محدث {updated}</span>
                </div>
              ))}
            </div>
            {/* Developer pills */}
            <div style={{ marginTop: 40, borderTop: '1px solid rgba(244,239,228,0.14)', paddingTop: 28 }}>
              <p style={{ margin: '0 0 18px', fontSize: 12, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(244,239,228,0.5)', textAlign: 'center' }}>شركاء البورصة — كبار المطورين</p>
              <div dir="ltr" style={{ overflow: 'hidden' }}>
                <div className="rz-mq-slow" style={{ display: 'flex', gap: 16, width: 'max-content', paddingLeft: 16 }}>
                  {devsLoop.map((d, i) => (
                    <span key={`${d.slug}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', padding: '10px 22px', borderRadius: 999, background: 'rgba(244,239,228,0.08)', border: '1px solid rgba(244,239,228,0.14)' }}>
                      <span style={{ width: 26, height: 26, borderRadius: '50%', background: GOLD, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 12 }}>{d.name.trim().charAt(0)}</span>
                      <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 700, fontSize: 13, color: 'rgba(244,239,228,0.85)' }}>{d.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ News ═══ */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '84px 28px 20px' }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 10px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: GOLD }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C0563F', display: 'inline-block' }} />
            يتجدد كل ٣ دقايق
          </p>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 44, color: INK, letterSpacing: '-0.01em' }}>أخبار مضمونة</h2>
        </div>
        <div style={{ border: `2px solid ${INK}`, borderRadius: 24, overflow: 'hidden', background: '#fff', padding: 16 }}>
          <CompactNewsTabs />
        </div>
      </section>

      {/* ═══ How it works ═══ */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '84px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: GOLD }}>ليه مضمونة؟</p>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 44, color: INK }}>الضمان مش كلام</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: `2px solid ${INK}`, borderRadius: 24, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '40px 32px', borderLeft: `2px solid ${INK}` }}>
            <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 15, color: GOLD }}>٠١</span>
            <h3 style={{ margin: '14px 0 10px', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 21, color: INK }}>مورد متوثّق</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: 'rgba(18,38,31,0.65)' }}>كل مورد بيعدّي على مراجعة هوية ونشاط قبل ما إعلانه ينزل السوق. مفيش حسابات وهمية.</p>
          </div>
          <div style={{ padding: '40px 32px', borderLeft: `2px solid ${INK}`, background: INK }}>
            <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 15, color: GOLD }}>٠٢</span>
            <h3 style={{ margin: '14px 0 10px', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 21, color: CREAM }}>دفع آمن</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: 'rgba(244,239,228,0.7)' }}>فلوسك محجوزة عندنا لحد ما تستلم وتتأكد. لو في مشكلة — استرداد كامل خلال ٤٨ ساعة.</p>
          </div>
          <div style={{ padding: '40px 32px' }}>
            <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 15, color: GOLD }}>٠٣</span>
            <h3 style={{ margin: '14px 0 10px', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 21, color: INK }}>الجني معاك</h3>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: 'rgba(18,38,31,0.65)' }}>مساعد ذكي بيرد ٢٤ ساعة — بيقارن الأسعار، يرشّح موردين، ويتابع طلبك لحد ما يوصل.</p>
          </div>
        </div>
      </section>

      {/* ═══ Supplier CTA ═══ */}
      <section style={{ maxWidth: 1360, margin: '0 auto', padding: '0 28px 96px' }}>
        <div style={{ position: 'relative', background: GOLD, borderRadius: 28, padding: '64px 56px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <span style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', border: '28px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', bottom: -80, left: '15%', width: 200, height: 200, borderRadius: '50%', border: '22px solid rgba(14,51,44,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: 560 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 40, lineHeight: 1.3, color: '#fff' }}>عندك منتج أو خدمة؟<br />اعرضها للمصريين — مجاناً</h2>
            <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.85)' }}>افتح متجرك على مضمونة في دقيقتين، وإعلانك يوصل لعملاء جاهزين يشتروا.</p>
          </div>
          <Link className="rz-lift" href="/list-your-asset" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', borderRadius: 999, background: INK, color: CREAM, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 17, boxShadow: '0 16px 32px -12px rgba(14,51,44,0.5)' }}>ابدأ دلوقتي ←</Link>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer style={{ background: INK, color: CREAM, padding: '64px 28px 36px' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap', paddingBottom: 44, borderBottom: '1px solid rgba(244,239,228,0.15)' }}>
            <div style={{ maxWidth: 320 }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 30 }}>مضمونة</p>
              <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', color: GOLD }}>YOUR GUARANTEED MARKETPLACE</p>
              <p style={{ margin: '18px 0 0', fontSize: 13, lineHeight: 1.9, color: 'rgba(244,239,228,0.6)' }}>سوق مصري كل حاجة فيه مضمونة — من المورد للسعر للاستلام.</p>
            </div>
            <div style={{ display: 'flex', gap: 72, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: GOLD, fontSize: 12, letterSpacing: '0.15em' }}>السوق</span>
                <Link href="/marketplace?track=sales" style={{ color: 'rgba(244,239,228,0.75)' }}>عقارات</Link>
                <Link href="/marketplace?group=sale-vehicles" style={{ color: 'rgba(244,239,228,0.75)' }}>عربيات</Link>
                <Link href="/marketplace?track=services" style={{ color: 'rgba(244,239,228,0.75)' }}>خدمات</Link>
                <Link href="/marketplace?track=restaurants" style={{ color: 'rgba(244,239,228,0.75)' }}>مطاعم</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: GOLD, fontSize: 12, letterSpacing: '0.15em' }}>مضمونة</span>
                <Link href="/about" style={{ color: 'rgba(244,239,228,0.75)' }}>عن المنصة</Link>
                <Link href="/list-your-asset" style={{ color: 'rgba(244,239,228,0.75)' }}>ضيف إعلانك</Link>
                <Link href="/chat/marid" style={{ color: 'rgba(244,239,228,0.75)' }}>اسأل الجني</Link>
                <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(244,239,228,0.75)' }}>واتساب</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: GOLD, fontSize: 12, letterSpacing: '0.15em' }}>قانوني</span>
                <Link href="/privacy" style={{ color: 'rgba(244,239,228,0.75)' }}>الخصوصية</Link>
                <Link href="/terms" style={{ color: 'rgba(244,239,228,0.75)' }}>الشروط</Link>
              </div>
            </div>
          </div>
          <p style={{ margin: '28px 0 0', textAlign: 'center', fontSize: 12, color: 'rgba(244,239,228,0.45)' }}>© {new Date().getFullYear()} مضمونة — معاملاتك مضمونة</p>
        </div>
      </footer>
    </div>
  )
}
