import Link from 'next/link'
// 🖼️ (١٦ أغسطس ٢٠٢٦) `next/image` مش `<img>`: صور الإعلانات جاية من موبايلات
//    البايعين بحجمها الأصلي (ميجات). الواجهة دي كلها صور كبيرة، فمن غير
//    التحسين الصفحة الرئيسية تبقى تقيلة على أول زيارة.
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Alexandria, IBM_Plex_Sans_Arabic } from 'next/font/google'
import RedesignMarquee from './RedesignMarquee'
import SiteFooter from '@/components/SiteFooter'

// ============================================================================
// HomeRedesign — (٧ أغسطس ٢٠٢٦) «التصميم الجديد» من ملف Madmona Redesign
// اللي عمله محمد في Claude Design. ديسكتوب بس — الموبايل لسه MobileHome.
// الهوية دلوقتي = **نفس لوحة تطبيق الموبايل** (MobileHome): كريمي #FAFAF7 ·
// أخضر غامق #14231E · أخضر البراند #059669 · دهبي #D4A017 · خط Alexandria.
// ⚠️ السطر ده كان مكتوب فيه «دهبي #2B4521» — و#2B4521 أخضر زيتوني مش دهبي.
// كل الداتا حقيقية: إحصائيات + أقسام + بورصة property_market_items + مطورين.
// ============================================================================

const alex = Alexandria({ subsets: ['arabic', 'latin'], weight: ['700', '900'], variable: '--font-alex', display: 'swap' })
const ibm = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '700'], variable: '--font-ibm', display: 'swap' })

// (11 Aug 2026) أخضر البراند القياسي للهيدر — نفس #059669 بتاع TopNav/SiteFooter.
// مش نفس INK (الأخضر الغامق الأصلي بتاع التصميم) — ده أخضر تاني مخصص للهيدر بس.
const NAV_GREEN = '#059669'

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

interface Shot { title: string; slug: string; price: number | null; city: string | null; img: string; grp: string | null }

/**
 * صور حقيقية من الإعلانات المنشورة — واحدة لكل مجموعة.
 *
 * (١٦ أغسطس ٢٠٢٦ — محمد: «واجهة فخمة بصور كبيرة» · «حط صور»)
 * الواجهة كانت فيها صورة واحدة حقيقية بس، والباقي إيموجي كبير (🔑 و🛠️)
 * على خلفية لون. ده بيبان «تحت الإنشاء» لزائر أول مرة يدخل. الأقسام
 * عندها ٤١٣ إعلان منشور بصور — مفيش سبب نعرضله إيموجي.
 *
 * ⚠️ بنطلب صف واحد لكل مجموعة (`limit 1` × ٧) مش الجدول كله — الصفحة دي
 *    بتترندر على السيرفر في كل زيارة.
 * ⚠️ لو الاستعلام وقع، بنرجّع مصفوفة فاضية والواجهة بترجع لتصميمها القديم
 *    بدل ما تكسر. الصفحة الرئيسية ماتقعش عشان صورة.
 */
async function getShots(): Promise<Record<string, Shot>> {
  const out: Record<string, Shot> = {}
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb.rpc('home_showcase_shots')
    for (const r of ((data || []) as Shot[])) {
      if (r?.img && r?.grp) out[r.grp] = r
    }
  } catch {
    /* الواجهة بتشتغل من غيرها */
  }
  return out
}

// 🧹 (١٦ أغسطس ٢٠٢٦) اتشالوا من هنا: `ACCENTS` · `TINTS` · `HeroCard` ·
//    `buildGroups`. دول كانوا بيبنوا كروت الهيرو القديمة، والهيرو بقى صورة
//    واحدة بعرض الشاشة — فبقوا كود ميت مالوش أي منادي.
//
// ⚠️ شيلانهم مش مجرد ترتيب: `ACCENTS` كان لسه شايل `#2B4521` (الزيتوني)
//    و`#6D5ACF` (البنفسجي) — نفس الألوان اللي محمد اشتكى من تداخلها. أي
//    حد يرجّع يستعمل المصفوفة دي بيرجّع المشكلة من غير ما ياخد باله.

/**
 * صور مثبّتة يدويًا لكروت الأقسام — من `site_settings`.
 *
 * (١٦ أغسطس ٢٠٢٦ — محمد: «التابات اللي فوق مفيهاش صور ليه؟»)
 * الاختيار الأوتوماتيك بياخد **أغلى** إعلان في القسم، و«أغلى» مش معناها
 * «أحسن صورة»: أغلى عربية طلعت واقفة جنب صندوق زبالة، وأغلى خدمة طلعت
 * منيو مكتوب مش صورة. مفيش طريقة برمجية تحكم على جودة صورة، فالحل إن
 * محمد يقدر يثبّت صورة لأي كارت من `/admin/site-settings`:
 *   home_card_img_sale · home_card_img_rentals · home_card_img_services
 * ولو مفيش مفتاح، بيرجع للاختيار الأوتوماتيك.
 */
async function getPinnedCardImages(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await sb
      .from('site_settings')
      .select('key, value')
      .like('key', 'home_card_img_%')
    for (const r of ((data || []) as Array<{ key: string; value: string }>)) {
      const slug = r.key.replace('home_card_img_', '')
      if (slug && r.value?.startsWith('http')) out[slug] = r.value
    }
  } catch { /* الاختيار الأوتوماتيك بيكفّي */ }
  return out
}

// ============================================================================
// 🎨 (١٦ أغسطس ٢٠٢٦ — محمد: «تداخل الألوان مش عاجبني» · «بنفس درجات
//     الموبايل الأبليكيشن»)
//
// الصفحة كانت فيها **٧ درجات أخضر + بنفسجي**: 0E332C · 059669 · 4ADE80 ·
// 2B4521 · 12261F · 2FA084 · 6D5ACF. والمتغيّر اللي اسمه GOLD كان لونه
// أخضر زيتوني (#2B4521) — يعني الأكسنت اللي التصميم مبني عليه مات.
//
// السبب: `scripts/rebrand-green.js` (١٤ أغسطس) حوّل الهوية من برتقالي
// لأخضر، وحوّل الدهبي لأخضر كمان. فبقى أخضر فوق أخضر من غير أي تباين.
//
// الحل: ناخد **نفس درجات تطبيق الموبايل بالظبط** (MobileHome). دي اللوحة
// المرجع دلوقتي — أي لون جديد يتضاف هنا مش في وسط الكود.
// ============================================================================
const BG = '#FAFAF7'        // خلفية الموبايل نفسها
const DARK = '#14231E'      // الأخضر الغامق
const BRAND = '#059669'     // أخضر البراند — نص وحدود
const BRAND_LIGHT = '#34D399'
const GOLD = '#D4A017'      // الدهبي الحقيقي — الأكسنت الوحيد
const LINE = '#E5DFD3'
const MUTED = '#7C8A84'
const CREAM = BG
const INK = DARK

/**
 * الأقسام الستة — **نفس مفاتيح وألوان تطبيق الموبايل بالحرف**.
 *
 * ⚠️ «مطاعم» كان ناقص من الديسكتوب خالص. الموبايل رجّعه في ١٤ أغسطس
 *    (١٣ تصنيف · ٢٦ مطعم منشور · ١٥٨٤ صنف منيو) والديسكتوب فضل من غيره —
 *    يعني زائر الكمبيوتر مكانش بيشوف المطاعم من الصفحة الرئيسية أصلاً.
 *
 * ⚠️ كل قسم بلونه الخاص من الموبايل. ده اللي بيدّي التنوّع من غير ما
 *    نخترع ألوان جديدة على الديسكتوب.
 */
const SECTIONS = [
  { key: 'products',    name: 'بيع',     desc: 'عقارات · عربيات · منتجات',   href: '/marketplace?track=products',    accent: '#3D7BB6', shot: 'sale-property',  tracks: ['products', 'sales'] },
  { key: 'rentals',     name: 'إيجار',   desc: 'شاليهات · شقق · عربيات',     href: '/marketplace?track=rentals',     accent: '#059669', shot: 'properties',     tracks: ['rentals', 'hybrid'] },
  { key: 'services',    name: 'خدمات',   desc: 'مناسبات · تجميل · صيانة',    href: '/marketplace?track=services',    accent: '#8A6A0F', shot: 'services-events',tracks: ['services'] },
  { key: 'restaurants', name: 'مطاعم',   desc: 'أكل بيتي · توصيل · عروض',    href: '/marketplace?track=restaurants', accent: '#9A3412', shot: 'food',           tracks: ['restaurants'] },
  { key: 'bourse',      name: 'بورصة مضمونة العقارية', desc: 'أسعار السوق لايف', href: '/real-estate/market',       accent: '#059669', shot: '',               tracks: [] },
  // ✍️ «بورصة» كانت غلطة إملائية قديمة (الصح **بورصة**) وكانت ظاهرة للزوار
  //    في النافبار وفي الكارت وفي الفوتر — تلات مرات في نفس الصفحة.
  // 🎨 و`#2B4521` هنا كان آخر بقايا الزيتوني اللي `rebrand-green.js` عمله.
  //    بقى دهبي: هو الأكسنت الوحيد في اللوحة، ومابيتلغبطش مع أخضر البورصة
  //    اللي جنبه.
  { key: 'business',    name: 'بورصة رجال الأعمال',    desc: 'أخبار · عملات · ذهب', href: '/business-lounge',       accent: GOLD,      shot: '',               tracks: [] },
  // 🚗🏗️ (٢٢ أغسطس ٢٠٢٦ — محمد: «مش عايز المطورين وسوق العربيات دي أصلاً
  //    تظهر في أي مكان») — القسمين دول اتضافوا هنا في ١٧ أغسطس وكانوا غلط:
  //      · **سوق العربيات** — العربيات بتتعرض في الماركت بليس وبس. قسم منفصل
  //        ليها معناه إن نفس الإعلان ليه مكانين، والزائر مش عارف يدوّر فين.
  //      · **المطورين** — دول جزء من العقارات، مكانهم جوّه بورصة مضمونة
  //        العقارية مش قسم مستقل على نفس المستوى مع «بيع» و«إيجار».
  //    الصفحتين (/cars و /dev) لسه موجودين بس مش متلينكين من الصفحة الرئيسية.
]

/**
 * 🧭 مجموعات النافبار — منفصلة عن `SECTIONS` بالقصد.
 *
 * `SECTIONS` = الكروت اللي في شبكة الصفحة. النافبار **مش** لازم يعرضهم
 * كلهم — قبل كده كان `SECTIONS.map()` فأي قسم جديد كان بيتحشر في الشريط
 * تلقائيًا، ولما بقوا تمانية بقى الشريط مزنوق ومخلوط.
 *
 * ⚠️ لو ضفت قسم جديد في `SECTIONS`، حطّه في المجموعة اللي بتوصفه هنا.
 *    مش هيبان في النافبار غير كده — وده مقصود، عشان الشريط ما يكبرش لوحده.
 */
const NAV_GROUPS: { label: string; href: string; keys: string[] }[] = [
  { label: 'تسوّق',  href: '/marketplace',        keys: ['products', 'rentals', 'services', 'restaurants'] },
  { label: 'الأسواق', href: '/real-estate/market', keys: ['bourse', 'business'] },
]

export default async function HomeRedesign({ categories, stats, liveCounts, heroImage }: Props) {
  const { tiles, updated } = await getMarketTiles()
  const shots = await getShots()
  const pinned = await getPinnedCardImages()

  const countFor = (tracks: readonly string[]) => {
    if (!tracks.length) return 0
    let n = 0
    for (const c of categories) {
      const key = c.group_slug || c.track || 'other'
      if (tracks.includes(c.track || '')) n += liveCounts[key] || 0
    }
    return n
  }
  const imgFor = (s: typeof SECTIONS[number]) =>
    pinned[s.key] || (s.shot ? shots[s.shot]?.img : undefined) ||
    (s.key === 'bourse' ? '/hero/bourse.jpg' : s.key === 'business' ? '/hero/business-lounge.jpg' : undefined)

  const heroShot = shots['sale-property']
  const money = (n: number | null) => (n == null ? null : Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 0 }))

  // 🖼️ المختارات — إعلانات حقيقية. ⛔ مش نفس الأقسام اللي فوق: دي منتجات
  //    بعينها بسعرها، فوق ده بتستبعد الأقسام اللي اتعرضت في الشبكة كصورة
  //    عشان **مافيش حاجة تتكرر مرتين في نفس الصفحة**.
  const usedShots = new Set(SECTIONS.map(s => s.shot).filter(Boolean))
  const picks = ['sale-vehicles', 'sale-marine', 'home-furniture', 'shop', 'tourism', 'vehicles']
    .filter(k => !usedShots.has(k) && shots[k]?.img)
    .slice(0, 4)
    .map(k => shots[k])

  return (
    <div dir="rtl" className={`${alex.variable} ${ibm.variable}`} style={{ minHeight: '100vh', background: BG, fontFamily: 'var(--font-ibm), sans-serif', color: DARK }}>
      <style dangerouslySetInnerHTML={{ __html: `
@keyframes rzRise { from { opacity:0; transform: translateY(24px) } to { opacity:1; transform:none } }
@keyframes rzMq { from { transform: translateX(0) } to { transform: translateX(-50%) } }
.rz-mq { animation: rzMq 30s linear infinite }
.rz-mq-slow { animation: rzMq 35s linear infinite }
.rz-rise { animation: rzRise .8s ease both }
.rz-rise-2 { animation: rzRise .8s ease .12s both }
.rz-lift { transition: transform .45s cubic-bezier(.2,.7,.3,1), box-shadow .45s ease }
.rz-lift:hover { transform: translateY(-6px); box-shadow: 0 28px 56px -26px rgba(20,35,30,.42) }
.rz-zoom img { transition: transform .8s cubic-bezier(.2,.7,.3,1) }
.rz-zoom:hover img { transform: scale(1.06) }
.rz-navlink { transition: color .2s ease }
.rz-navlink:hover { color:#fff !important }

/* 🧭 (٢٢ أغسطس ٢٠٢٦ — محمد: «تابات اتضافت غلط في نسخة الديسكتوب»)
   النافبار كان بيعمل SECTIONS.map() — يعني أي قسم جديد بيتضاف للشبكة
   كان بيتحشر تلقائيًا كلينك في الشريط. لما اتضافوا «سوق العربيات»
   و«المطورين» في ١٧ أغسطس بقى الشريط ٩ لينكات في سطر واحد، ومخلوط فيه
   تلات أنواع مختلفة: أفعال (بيع/إيجار)، أقسام (خدمات/مطاعم)، وأسواق
   (البورصات/العربيات/المطورين). دلوقتي بقوا مجموعتين + المارد.
   القايمة CSS بالكامل (hover + focus-within) عشان الكومبوننت يفضل سيرفر. */
.rz-navgroup { position: relative; display: flex; align-items: center }
.rz-navtop {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  color: rgba(255,255,255,.78); white-space: nowrap;
}
.rz-navgroup:hover > .rz-navtop, .rz-navgroup:focus-within > .rz-navtop { color:#fff }
.rz-caret { font-size: 9px; opacity: .7; transition: transform .2s ease }
.rz-navgroup:hover .rz-caret { transform: rotate(180deg) }
.rz-dropdown {
  position: absolute; top: 100%; right: 0; margin-top: 10px; min-width: 268px;
  background: #fff; border-radius: 16px; padding: 8px;
  box-shadow: 0 24px 56px -20px rgba(6,26,20,.45); border: 1px solid rgba(6,26,20,.08);
  opacity: 0; visibility: hidden; transform: translateY(-6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s;
}
.rz-navgroup:hover .rz-dropdown, .rz-navgroup:focus-within .rz-dropdown {
  opacity: 1; visibility: visible; transform: none;
}
/* الجسر ده بيمنع القايمة تقفل وإنت نازل بالماوس عليها */
.rz-dropdown::before { content:''; position:absolute; top:-12px; left:0; right:0; height:12px }
.rz-dropitem {
  display: flex; flex-direction: column; gap: 2px; padding: 9px 12px; border-radius: 11px;
  transition: background .15s ease;
}
.rz-dropitem:hover { background: rgba(5,150,105,.09) }
.rz-dropitem b { font-size: 14px; font-weight: 800; color: #0C2B22 }
.rz-dropitem span { font-size: 11.5px; color: #6B7B74 }
.rz-ghost:hover { background: rgba(255,255,255,.14) }
.rz-gold:hover { background:${DARK} !important; color:#fff !important }
a { text-decoration:none }
` }} />

      {/* شعرة دهبي — الأكسنت الوحيد، بيتكرر في الصفحة كخيط رفيع بس */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${GOLD}, ${BRAND} 40%, ${BRAND} 60%, ${GOLD})` }} />

      {/* ═══ الهيدر ═══ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: BRAND, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 48, background: '#fff', borderRadius: '21px 21px 6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 20, paddingTop: 4 }}>م</span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 21, color: '#fff' }}>مضمونة</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.42em', color: 'rgba(255,255,255,.75)' }}>MADMONA</span>
            </span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 30, fontSize: 14, fontWeight: 500 }}>
            {NAV_GROUPS.map(g => (
              <div key={g.label} className="rz-navgroup">
                <Link href={g.href} className="rz-navtop">
                  {g.label}<span className="rz-caret">▼</span>
                </Link>
                <div className="rz-dropdown">
                  {g.keys.map(k => {
                    const s = SECTIONS.find(x => x.key === k)
                    if (!s) return null
                    return (
                      <Link key={k} href={s.href} className="rz-dropitem">
                        <b>{s.name}</b><span>{s.desc}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
            <Link className="rz-navlink" href="/chat/marid" style={{ color: GOLD, fontWeight: 700, whiteSpace: 'nowrap' }}>اسأل المارد</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link className="rz-ghost" href="/auth/login" style={{ height: 42, padding: '0 18px', borderRadius: 999, border: '1.5px solid rgba(255,255,255,.6)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>دخول</Link>
            <Link className="rz-gold" href="/list-your-asset" style={{ height: 42, padding: '0 22px', borderRadius: 999, background: GOLD, color: DARK, fontWeight: 900, fontSize: 13, display: 'inline-flex', alignItems: 'center' }}>ضيف إعلانك</Link>
          </div>
        </div>
      </header>

      {/* ═══ الهيرو — صورة بعرض الشاشة ═══ */}
      {/* ⛔ مفيش كروت أقسام هنا. كانت الصفحة بتعرض بيع/إيجار/خدمات تلات
          مرات: في الهيرو، وفي شبكة الأقسام، وفي المعرض. دلوقتي مرة واحدة. */}
      <section style={{ position: 'relative', minHeight: 620, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <Image src={heroShot?.img || heroImage} alt={heroShot?.title || 'مضمونة'} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
        <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(275deg, ${DARK}F5 0%, ${DARK}D9 44%, ${DARK}26 100%)` }} />
        <div className="rz-rise" style={{ position: 'relative', maxWidth: 1400, margin: '0 auto', padding: '0 32px', width: '100%' }}>
          <div style={{ maxWidth: 660 }}>
            <p style={{ margin: '0 0 22px', display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, letterSpacing: '.28em', color: GOLD }}>
              <span style={{ width: 30, height: 1.5, background: GOLD }} /> سوق مصر المضمون
            </p>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 68, lineHeight: 1.12, letterSpacing: '-.02em', color: '#fff' }}>
              كل حاجة تشتريها<br />أو تأجرها… <span style={{ color: GOLD }}>مضمونة</span>
            </h1>
            <p style={{ margin: '22px 0 34px', maxWidth: 520, fontSize: 17, lineHeight: 1.9, color: 'rgba(255,255,255,.8)' }}>
              كل مورد متوثّق، وكل إعلان بيتراجع قبل ما ينزل. دوّر، قارن، واحجز وانت مطمّن.
            </p>
            <form action="/marketplace" role="search" style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 18, padding: 7, maxWidth: 560, boxShadow: '0 30px 60px -22px rgba(0,0,0,.55)' }}>
              <input type="search" name="q" placeholder="دوّر على شقة، عربية، مطعم، خبيرة ميكب…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15.5, color: DARK, padding: '12px 20px', minWidth: 0, fontFamily: 'inherit' }} />
              <button type="submit" style={{ border: 'none', cursor: 'pointer', height: 50, padding: '0 34px', borderRadius: 13, background: BRAND, color: '#fff', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 15 }}>دوّر</button>
            </form>
            <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 34 }}>
              {[
                { v: `${(stats.suppliers || 0).toLocaleString('ar-EG')}+`, l: 'مورد موثّق' },
                { v: (stats.listings || 0).toLocaleString('ar-EG'), l: 'إعلان نشط' },
                { v: '٤٨ ساعة', l: 'ضمان الاسترداد' },
              ].map((s, i) => (
                <span key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 27, color: '#fff' }}>{s.v}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.62)' }}>{s.l}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <RedesignMarquee />

      {/* ═══ الأقسام الستة — المكان الوحيد اللي بتظهر فيه ═══ */}
      <section style={{ maxWidth: 1400, margin: '0 auto', padding: '90px 32px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 38 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.28em', color: GOLD }}>الأقسام</p>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 46, color: DARK, letterSpacing: '-.02em' }}>اختار مجالك</h2>
          </div>
          <Link href="/marketplace" style={{ fontSize: 14, fontWeight: 700, color: BRAND, borderBottom: `2px solid ${GOLD}`, paddingBottom: 3 }}>كل الأقسام ←</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {SECTIONS.map((s, i) => {
            const img = imgFor(s)
            const n = countFor(s.tracks)
            return (
              <Link key={s.key} className="rz-lift rz-zoom" href={s.href} style={{ position: 'relative', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 20, borderRadius: 18, overflow: 'hidden', background: DARK, animation: `rzRise .8s ease ${i * 0.06}s both` }}>
                {img && <Image src={img} alt={s.name} fill sizes="240px" style={{ objectFit: 'cover' }} />}
                <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${DARK}F2 0%, ${DARK}8C 45%, ${DARK}1F 100%)` }} />
                <span style={{ position: 'absolute', top: 0, insetInline: 0, height: 3, background: s.accent }} />
                <span style={{ position: 'relative' }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 19, color: '#fff', lineHeight: 1.3 }}>{s.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.62)', marginTop: 5 }}>{s.desc}</span>
                  <span style={{ display: 'inline-flex', marginTop: 12, padding: '5px 14px', borderRadius: 999, background: s.accent, color: '#fff', fontSize: 11, fontWeight: 800 }}>
                    {n > 0 ? `${n.toLocaleString('ar-EG')} إعلان` : 'لايف'}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ═══ مختارات — إعلانات بعينها، مش أقسام ═══ */}
      {picks.length >= 3 && (
        <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px 90px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 34 }}>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.28em', color: GOLD }}>معروض دلوقتي</p>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 46, color: DARK, letterSpacing: '-.02em' }}>إعلانات حقيقية</h2>
            </div>
            <Link href="/marketplace" style={{ fontSize: 14, fontWeight: 700, color: BRAND, borderBottom: `2px solid ${GOLD}`, paddingBottom: 3 }}>شوف الكل ←</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {picks.map(sh => (
              <Link key={sh.slug} className="rz-lift rz-zoom" href={`/marketplace/${sh.slug}`} style={{ display: 'block', borderRadius: 20, overflow: 'hidden', background: '#fff', border: `1px solid ${LINE}` }}>
                <span style={{ position: 'relative', display: 'block', height: 260, overflow: 'hidden' }}>
                  <Image src={sh.img} alt={sh.title} fill sizes="330px" style={{ objectFit: 'cover' }} />
                </span>
                <span style={{ display: 'block', padding: '20px 20px 22px' }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 15, lineHeight: 1.6, color: DARK, height: 48, overflow: 'hidden' }}>{sh.title}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 12, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
                    <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 22, color: BRAND }}>{money(sh.price) ?? 'اسأل'}</span>
                    {sh.price != null && <span style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>جنيه</span>}
                    {sh.city && <span style={{ marginInlineStart: 'auto', fontSize: 11.5, color: MUTED }}>{sh.city}</span>}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ بورصة مضمونة — داتا مالهاش تكرار في أي مكان تاني ═══ */}
      {tiles.length > 0 && (
        <section style={{ background: DARK, padding: '86px 32px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 38 }}>
              <div>
                <p style={{ margin: '0 0 10px', display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12, fontWeight: 700, letterSpacing: '.28em', color: GOLD }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND_LIGHT }} /> لايف
                </p>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 46, color: '#fff', letterSpacing: '-.02em' }}>أسعار السوق دلوقتي</h2>
              </div>
              <Link className="rz-gold" href="/real-estate/market" style={{ padding: '13px 28px', borderRadius: 999, background: GOLD, color: DARK, fontWeight: 900, fontSize: 14 }}>كل الأسعار ←</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {tiles.map(t => (
                <div key={t.area} className="rz-lift" style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,.13)', borderRadius: 18, padding: 26 }}>
                  <span style={{ position: 'absolute', inset: 0, backgroundImage: `url(${t.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${DARK}F7, ${DARK}C7)` }} />
                  <span style={{ position: 'relative', display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(255,255,255,.82)' }}>{t.area}</span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 16, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 26, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{t.value}</span>
                  <span style={{ position: 'relative', display: 'block', marginTop: 5, fontSize: 12, color: 'rgba(255,255,255,.68)' }}>{t.label}</span>
                  <span style={{ position: 'relative', display: 'inline-flex', marginTop: 15, padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(52,211,153,.16)', color: BRAND_LIGHT }}>محدث {updated}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ ليه مضمونة ═══ */}
      <section style={{ maxWidth: 1400, margin: '0 auto', padding: '90px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.28em', color: GOLD }}>ليه مضمونة؟</p>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 46, color: DARK, letterSpacing: '-.02em' }}>الضمان مش كلام</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {[
            { n: '٠١', t: 'مورد متوثّق', d: 'كل مورد بيعدّي على مراجعة هوية ونشاط قبل ما إعلانه ينزل السوق. مفيش حسابات وهمية.' },
            { n: '٠٢', t: 'دفع آمن', d: 'فلوسك محجوزة عندنا لحد ما تستلم وتتأكد. لو في مشكلة — استرداد كامل خلال ٤٨ ساعة.' },
            { n: '٠٣', t: 'المارد معاك', d: 'مساعد ذكي بيرد ٢٤ ساعة — بيقارن الأسعار، يرشّح موردين، ويتابع طلبك لحد ما يوصل.' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 22, padding: '42px 34px' }}>
              <span style={{ fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 15, color: GOLD }}>{c.n}</span>
              <h3 style={{ margin: '16px 0 12px', fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 22, color: DARK }}>{c.t}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.95, color: MUTED }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ دعوة المورّدين ═══ */}
      <section style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px 100px' }}>
        <div style={{ position: 'relative', background: DARK, borderRadius: 28, padding: '70px 60px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <span style={{ position: 'absolute', top: -70, insetInlineStart: -70, width: 260, height: 260, borderRadius: '50%', border: `26px solid ${GOLD}22` }} />
          <div style={{ position: 'relative', maxWidth: 600 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 42, lineHeight: 1.3, color: '#fff' }}>عندك منتج أو خدمة؟<br /><span style={{ color: GOLD }}>اعرضها مجاناً</span></h2>
            <p style={{ margin: '16px 0 0', fontSize: 15.5, lineHeight: 1.9, color: 'rgba(255,255,255,.72)' }}>افتح متجرك على مضمونة في دقيقتين، وإعلانك يوصل لعملاء جاهزين يشتروا.</p>
          </div>
          <Link className="rz-lift" href="/list-your-asset" style={{ position: 'relative', padding: '19px 44px', borderRadius: 999, background: GOLD, color: DARK, fontFamily: 'var(--font-alex), sans-serif', fontWeight: 900, fontSize: 17 }}>ابدأ دلوقتي ←</Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
