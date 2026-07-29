'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Loader2, MapPin, Calendar, ChevronLeft, Scissors, Clock, Sparkles, User,
  ChevronDown, MessageCircle, ShieldCheck, Image as ImageIcon, Crown, Wind,
  Brush, Hand, Flower2, Building2, Stethoscope, Utensils, Briefcase,
  Wrench, Car, ShoppingBag,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')

// gallery items can be plain url strings or { url, caption }
const galUrl = (g: any) => (typeof g === 'string' ? g : g?.url || '')
const galCap = (g: any) => (typeof g === 'string' ? '' : g?.caption || '')

/* ============================================================
 * PER-MERCHANT THEME LAYER  (added 20 Jun 2026)
 * نفس الستورفرنت بيدعم أكتر من هوية بصرية. الافتراضي = هوية مضمونة
 * (كريمي/أخضر). ثيم 'dark' = أسود/أحمر أوتوموتيف (سعداوي جراج).
 * ربط التاجر بالثيم عن طريق slug (TODO: ينتقل للداتا لاحقًا = dynamic).
 * تغيير الثيم لتاجر = سطر واحد هنا، من غير ما يلمس باقي العملاء.
 * ============================================================ */
type ThemeKey = 'default' | 'dark'
const THEME_BY_SLUG: Record<string, ThemeKey> = { sa3dawy: 'dark' }

interface Theme {
  pageBg: string
  barBg: string; barBorder: string; barText: string; barTag: string
  accent: string; accentSoft: string
  gCta: string; gCover: string; gSoft: string; heroOverlay: string
  trustBg: string; trustBorder: string; trustText: string; trustStrong: string; trustIcoBg: string; trustIco: string
}

const THEMES: Record<ThemeKey, Theme> = {
  // هوية مضمونة الافتراضية — مطابقة للقديم بالظبط
  default: {
    pageBg: '#FAFAF7',
    barBg: '#FFFFFF', barBorder: 'rgba(31,111,95,.10)', barText: '#1F6F5F', barTag: '#1F6F5F',
    accent: '#1F6F5F', accentSoft: 'rgba(31,111,95,.10)',
    gCta: 'linear-gradient(100deg,#d4a017 0%,#2FA084 55%,#1F6F5F 100%)',
    gCover: 'linear-gradient(135deg,#1d6253 0%,#2FA084 70%,#6FCF97 100%)',
    gSoft: 'linear-gradient(135deg,rgba(31,111,95,.10),rgba(212,160,23,.13))',
    heroOverlay: 'linear-gradient(180deg,rgba(8,26,21,.18) 0%,rgba(8,26,21,.10) 35%,rgba(8,26,21,.80) 100%)',
    trustBg: '#FFFFFF', trustBorder: 'rgba(31,111,95,.15)', trustText: '#6B7280', trustStrong: '#1A2E26',
    trustIcoBg: 'rgba(31,111,95,.10)', trustIco: '#1F6F5F',
  },
  // هوية سعداوي — أسود/أحمر أوتوموتيف
  dark: {
    pageBg: '#FFFFFF',
    barBg: '#0A0A0A', barBorder: '#1f1f22', barText: '#FFFFFF', barTag: '#9a9a9e',
    accent: '#E4002B', accentSoft: 'rgba(228,0,43,.12)',
    gCta: 'linear-gradient(90deg,#E4002B 0%,#b00020 100%)',
    gCover: 'radial-gradient(120% 90% at 80% 0%, rgba(228,0,43,.22), transparent 55%), linear-gradient(180deg,#121214 0%,#0A0A0A 60%,#0A0A0A 100%)',
    gSoft: 'linear-gradient(135deg,rgba(228,0,43,.12),rgba(228,0,43,.05))',
    heroOverlay: 'linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.10) 35%,rgba(0,0,0,.82) 100%)',
    trustBg: '#101012', trustBorder: '#1f1f22', trustText: '#cfcfd4', trustStrong: '#FFFFFF',
    trustIcoBg: 'rgba(228,0,43,.16)', trustIco: '#E4002B',
  },
}

/* ============================================================
 * VERTICAL-AWARE STOREFRONT  (page created 7 Jun 2026 — vertical-aware 9 Jun 2026)
 * نفس الصفحة بتخدم كل المجالات: صالون / عيادة / مطعم / مركبات / عام.
 * بتتفرّع حسب suppliers.industry — الـ RPC public_salon_landing عام.
 * ============================================================ */

interface VerticalCfg {
  kicker: string
  heroCta: string
  heroCtaIcon: any
  waCta: string
  bookChip: string
  unitWord: string
  galleryHeading: string
  galleryTiles: string[]
  branchesHeading: string
  branchCta: string
  servicesHeading: string
  servicesIcon: any
  teamHeading: string
  accountSub: string
  coverBadge: string
  catLabels: Record<string, string>
  catIcons: Record<string, any>
}

// salon-specific category maps (used only by the beauty_salon preset)
const SALON_CAT_LABELS: Record<string, string> = {
  hair_cut: 'قص شعر', hair_color: 'صبغة', hair_treatment: 'علاج شعر', styling: 'سشوار / تسريحة', hair: 'شعر وصبغة',
  makeup: 'مكياج', bridal: 'عرايس', nails: 'منيكير وبديكير', skin: 'بشرة', spa: 'سبا ومساج',
  package: 'باقات', waxing: 'إزالة شعر', general: 'عام', عام: 'عام',
}
const SALON_CAT_ICONS: Record<string, any> = {
  bridal: Crown, hair: Wind, hair_cut: Scissors, hair_color: Wind, hair_treatment: Wind,
  styling: Wind, makeup: Brush, nails: Hand, skin: Sparkles, spa: Flower2, package: Crown,
}

const VERTICALS: Record<string, VerticalCfg> = {
  // صالون تجميل — صيغة مؤنثة (Elite وأمثالها)
  beauty_salon: {
    kicker: 'صالون تجميل وسبا',
    heroCta: 'احجزي موعدك', heroCtaIcon: Calendar, waCta: 'تواصلي',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'معرض الصالون',
    galleryTiles: ['الريسبشن', 'الشغل', 'السبا', 'المكان'],
    branchesHeading: 'احجزي في أقرب فرع ليكي', branchCta: 'احجزي',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Scissors,
    teamHeading: 'فريقنا',
    accountSub: 'شوفي حجوزاتك، قيّمي، وكرّمي اللي خدمك',
    coverBadge: 'صورة غلاف الصالون',
    catLabels: SALON_CAT_LABELS, catIcons: SALON_CAT_ICONS,
  },
  // عيادة / مركز طبي — صيغة محايدة
  polyclinic: {
    kicker: 'عيادة ومركز طبي',
    heroCta: 'احجز كشف', heroCtaIcon: Calendar, waCta: 'تواصل معنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور العيادة',
    galleryTiles: ['الاستقبال', 'العيادة', 'الانتظار', 'المكان'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'التخصصات والأسعار', servicesIcon: Stethoscope,
    teamHeading: 'الأطباء',
    accountSub: 'شوف حجوزاتك، قيّم، وتابع كشوفاتك',
    coverBadge: 'صورة غلاف العيادة',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
  // مطعم — صيغة محايدة (منيو + حجز ترابيزة)
  restaurant: {
    kicker: 'مطعم',
    heroCta: 'احجز ترابيزة', heroCtaIcon: Calendar, waCta: 'اطلب دلفري',
    bookChip: 'حجز فوري', unitWord: 'صنف',
    galleryHeading: 'صور من المطعم',
    galleryTiles: ['المكان', 'من جوه', 'الأطباق', 'الأجواء'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'المنيو والأسعار', servicesIcon: Utensils,
    teamHeading: 'الشيف والفريق',
    accountSub: 'شوف حجوزاتك وطلباتك وقيّم تجربتك',
    coverBadge: 'صورة غلاف المطعم',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
  // توكيلات / جراجات المركبات — موتوسيكلات وعربيات (بيع / صيانة / إكسسوارات)
  vehicle_agency: {
    kicker: 'صيانة وخدمات الموتوسيكلات',
    heroCta: 'احجز ميعاد', heroCtaIcon: Calendar, waCta: 'كلّمنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور من المكان',
    galleryTiles: ['الجراج', 'الورشة', 'الشغل', 'المكان'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Wrench,
    teamHeading: 'الفنيين',
    accountSub: 'شوف حجوزاتك وقيّم الخدمة',
    coverBadge: 'صورة غلاف المكان',
    catLabels: { 'صيانة': 'صيانة وإصلاح', 'تجهيز': 'تجهيز وتلميع', 'بيع': 'بيع مركبات', general: 'عام', 'عام': 'عام' },
    catIcons: { 'صيانة': Wrench, 'تجهيز': Sparkles, 'بيع': Car },
  },
  // مقاولات وتشطيبات — طلب عرض سعر بدل الحجز
  contracting: {
    kicker: 'مقاولات وتشطيبات',
    heroCta: 'اطلب عرض سعر', heroCtaIcon: Briefcase, waCta: 'كلّمنا',
    bookChip: 'عرض سعر مجاني', unitWord: 'خدمة',
    galleryHeading: 'معرض أعمالنا',
    galleryTiles: ['مشاريع', 'تشطيبات', 'تنفيذ', 'تسليم'],
    branchesHeading: 'مكاتبنا', branchCta: 'تواصل',
    servicesHeading: 'خدماتنا والأسعار', servicesIcon: Building2,
    teamHeading: 'الفريق',
    accountSub: 'تابع عروض الأسعار والمشاريع',
    coverBadge: 'صورة من أعمالنا',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },

  // بيع منتجات (أثاث / منزل / إلكترونيات) — تسوّق بدل حجز
  retail: {
    kicker: 'تسوّق أونلاين',
    heroCta: 'اتفرّج على المنتجات', heroCtaIcon: ShoppingBag, waCta: 'اسأل عن منتج',
    bookChip: 'شحن وتوصيل', unitWord: 'منتج',
    galleryHeading: 'من المعرض',
    galleryTiles: ['المنتجات', 'المعرض', 'تفاصيل', 'الجودة'],
    branchesHeading: 'فروعنا', branchCta: 'زور',
    servicesHeading: 'منتجاتنا وأسعارها', servicesIcon: ShoppingBag,
    teamHeading: 'الفريق',
    accountSub: 'تابع طلباتك ومشترياتك',
    coverBadge: 'صورة المعرض',
    catLabels: { general: 'عام', 'عام': 'عام' }, catIcons: {},
  },
  // أي مجال تاني (تكنولوجيا / غير محدد) — محايد عام
  default: {
    kicker: 'احجز أونلاين',
    heroCta: 'احجز الآن', heroCtaIcon: Calendar, waCta: 'تواصل معنا',
    bookChip: 'حجز فوري', unitWord: 'خدمة',
    galleryHeading: 'صور',
    galleryTiles: ['المكان', 'من جوه', 'تفاصيل', 'أجواء'],
    branchesHeading: 'احجز في أقرب فرع ليك', branchCta: 'احجز',
    servicesHeading: 'الخدمات والأسعار', servicesIcon: Briefcase,
    teamHeading: 'الفريق',
    accountSub: 'شوف حجوزاتك وقيّم تجربتك',
    coverBadge: 'صورة الغلاف',
    catLabels: { general: 'عام', عام: 'عام' }, catIcons: {},
  },
}

function getVertical(industry: string | null | undefined): VerticalCfg {
  if (industry === 'beauty_salon') return VERTICALS.beauty_salon
  if (industry === 'polyclinic' || industry === 'clinic') return VERTICALS.polyclinic
  if (industry === 'restaurant' || industry === 'restaurants') return VERTICALS.restaurant
  if (industry === 'vehicle_agency' || industry === 'auto') return VERTICALS.vehicle_agency
  if (industry === 'contracting' || industry === 'construction') return VERTICALS.contracting
  if (industry === 'retail' || industry === 'furniture' || industry === 'shop') return VERTICALS.retail
  return VERTICALS.default
}

export default function StorefrontPage({ params }: { params: { slug: string } }) {
  const { slug } = params

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    (async () => {
      // @ts-expect-error rpc typing
      const { data: d } = await supabase.rpc('public_salon_landing', { p_slug: slug })
      setData(d)
      setLoading(false)
    })()
  }, [slug])

  // PER-MERCHANT THEME — data-driven (suppliers.theme → RPC) with legacy map / default fallback.
  // إضافة عميل جديد بثيم = صف في الداتا (admin_provision_storefront)، مفيش كود.
  const dbTheme = (data?.theme as Theme | undefined) || undefined
  const fallbackKey: ThemeKey = THEME_BY_SLUG[slug] || 'default'
  const t: Theme = dbTheme || THEMES[fallbackKey]
  const dk = dbTheme ? Boolean((dbTheme as any).dark) : fallbackKey === 'dark'

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBg }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: t.accent }} /></div>

  if (!data?.ok) return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl" style={{ background: t.pageBg }}>
      <div className="text-center"><MapPin className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="font-bold text-[#1A2E26]">الصفحة مش موجودة</p></div>
    </div>
  )

  // اختيار صيغة المجال حسب نوع المورّد
  const v = getVertical(data.industry)
  const HeroCtaIcon = v.heroCtaIcon
  const ServicesIcon = v.servicesIcon

  const branches: any[] = data.branches || []
  const services: any[] = data.services || []
  const team: any[] = data.team || []
  const gallery: any[] = (data.gallery || []).filter((g: any) => galUrl(g))
  const cover: string = data.cover_url || ''
  const loc = branches[0]?.district || branches[0]?.address || 'القاهرة'
  // WhatsApp goes to Madmona's business line (AI auto-responder)
  const WA = '201002229982'

  // generated placeholder tiles used until real photos are uploaded
  const galleryTiles = gallery.length
    ? gallery.map((g, i) => ({ url: galUrl(g), cap: galCap(g) || `صورة ${i + 1}` }))
    : v.galleryTiles.map((cap) => ({ url: '', cap }))

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: t.pageBg }}>

      {/* ===== MADMONA CO-BRAND TOP BAR ===== */}
      <div style={{ background: t.barBg, borderBottom: `1px solid ${t.barBorder}` }}>
        <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between">
          <a href="https://madmonacairo.com" className="flex items-center gap-1.5">
            {dk ? (
              <span className="text-sm font-black flex items-center gap-1.5" style={{ color: t.barText }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: t.accent, display: 'inline-block' }} /> مضمونة
              </span>
            ) : (
              <img src="https://res.cloudinary.com/duxfgqioc/image/upload/madmona/logo-official.png" alt="مضمونة" className="h-5 w-auto object-contain" />
            )}
          </a>
          <span className="text-[10px] font-bold tracking-wide" style={{ color: t.barTag }}>معاملاتك مضمونة</span>
        </div>
      </div>

      {/* ===== COVER HERO ===== */}
      <header className="relative text-white overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: cover ? `url(${cover})` : t.gCover, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0" style={{ backgroundImage: t.heroOverlay }} />
        {!cover && <span className="absolute top-3 right-3 z-10 text-[10px] font-bold text-white/85 bg-black/30 px-2.5 py-1 rounded-full">{v.coverBadge}</span>}

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-7 min-h-[330px] flex flex-col justify-end">
          {data.logo_url && logoOk ? (
            <div className="mb-3 w-[110px] rounded-2xl overflow-hidden ring-1 ring-white/25 bg-black/30 backdrop-blur-sm" style={{ aspectRatio: '460 / 177' }}>
              <img src={data.logo_url} alt={data.business_name} className="w-full h-full object-contain" onError={() => setLogoOk(false)} />
            </div>
          ) : (
            <div className="mb-3 w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 grid place-items-center backdrop-blur-sm"><Sparkles className="w-7 h-7 text-white" /></div>
          )}
          <p className="text-[11px] font-bold tracking-[0.22em] text-white/80 mb-1">{v.kicker}</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">{data.business_name}</h1>
          <p className="text-sm text-white/90 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {loc}</p>

          <div className="flex flex-wrap gap-2 mt-3.5">
            {[branches.length > 0 ? `${fmt(branches.length)} فروع` : null, `${fmt(data.industry === 'retail' ? data.product_count : data.service_count)} ${v.unitWord}`, v.bookChip].filter(Boolean).map((s: any) => (
              <span key={s} className="text-xs font-bold bg-white/14 ring-1 ring-white/25 px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>

          <div className="flex gap-2.5 mt-4">
            <a href={data.industry === 'retail' ? '#products' : '#book'} className="flex-[1.4] h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg" style={{ backgroundImage: t.gCta }}>
              <HeroCtaIcon className="w-4 h-4" /> {v.heroCta}
            </a>
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener" className="flex-1 h-12 rounded-2xl bg-white/14 ring-1 ring-white/28 text-white font-bold text-sm flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> {v.waCta}
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* trust strip */}
        <div className="rounded-2xl shadow-sm p-3.5 flex items-center gap-3 -mt-9 relative z-20" style={{ background: t.trustBg, border: `1px solid ${t.trustBorder}` }}>
          <div className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0" style={{ background: t.trustIcoBg }}><ShieldCheck className="w-5 h-5" style={{ color: t.trustIco }} /></div>
          <p className="text-[11.5px] leading-relaxed" style={{ color: t.trustText }}>الحجز والدفع <b style={{ color: t.trustStrong }}>مؤمّن عن طريق مضمونة</b> — تأكيد على واتساب وتقييم بعد الزيارة.</p>
        </div>

        {/* products → marketplace (filtered to this merchant) */}
        {data.product_count > 0 && (
          <Link id="products" href={`/marketplace?supplier=${data.supplier_id}`} className="rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all" style={{ backgroundImage: t.gSoft, border: `1px solid ${t.trustBorder}` }}>
            <div className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0" style={{ background: t.accentSoft }}><ShoppingBag className="w-5 h-5" style={{ color: t.accent }} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#1A2E26]">{data.industry === 'vehicle_agency' ? 'قطع غيار وإكسسوارات موتوسيكلات' : 'المنتجات'}</p>
              <p className="text-[11px] text-[#6B7280]">{fmt(data.product_count)} منتج للبيع · مضمون عن طريق مضمونة</p>
            </div>
            <span className="font-bold text-sm flex items-center gap-0.5 flex-shrink-0" style={{ color: t.accent }}>تسوّق <ChevronLeft className="w-4 h-4" /></span>
          </Link>
        )}

        {/* gallery */}
        <section>
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><ImageIcon className="w-4 h-4" style={{ color: t.accent }} /> {v.galleryHeading}</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {galleryTiles.map((tile, i) => (
              <div key={i} className="relative flex-shrink-0 w-[140px] h-[104px] rounded-2xl overflow-hidden ring-1 ring-black/5">
                {tile.url ? (
                  <img src={tile.url} alt={tile.cap} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ backgroundImage: t.gCover }}>
                    <ImageIcon className="w-6 h-6 text-white/70" />
                    <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-white bg-black/35 px-2 py-0.5 rounded-full">{tile.cap}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* team */}
        {team.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4" style={{ color: t.accent }} /> {v.teamHeading}</h2>
            <div className="flex gap-3.5 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {team.map((m: any) => (
                <div key={m.id} className="flex-shrink-0 w-[76px] text-center">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.full_name} className="w-[68px] h-[68px] rounded-full object-cover mx-auto ring-2 ring-black/5" />
                  ) : (
                    <div className="w-[68px] h-[68px] rounded-full grid place-items-center mx-auto text-white font-black text-xl ring-2 ring-white" style={{ backgroundImage: t.gCover }}>
                      {m.avatar_initial || (m.full_name || '?').charAt(0)}
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-[#1A2E26] mt-1.5 truncate">{m.full_name}</p>
                  {m.role_ar && <p className="text-[9px] text-[#6B7280] truncate">{m.role_ar}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* branches → book */}
        {branches.length > 0 && (
        <section id="book">
          <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: t.accent }} /> {v.branchesHeading}</h2>
          <div className="space-y-2.5">
            {branches.map((b: any) => (
              <Link key={b.id} href={`/book/${b.code}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 flex items-center gap-3 hover:border-gray-300 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center" style={{ backgroundImage: t.gSoft }}><Building2 className="w-5 h-5" style={{ color: t.accent }} /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#1A2E26] truncate">{b.name}</p>
                  {(b.address || b.district) && <p className="text-[11px] text-[#6B7280] truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.address || b.district}</p>}
                </div>
                <span className="font-bold text-sm flex items-center gap-0.5 flex-shrink-0" style={{ color: t.accent }}>{v.branchCta} <ChevronLeft className="w-4 h-4" /></span>
              </Link>
            ))}
          </div>
        </section>

        )}

        {/* services / menu */}
        {services.length > 0 && (
          <section>
            <h2 className="text-sm font-black text-[#1A2E26] mb-3 flex items-center gap-1.5"><ServicesIcon className="w-4 h-4" style={{ color: t.accent }} /> {v.servicesHeading}</h2>
            <div className="space-y-2.5">
              {services.map((cat: any) => {
                const isOpen = openCat === cat.category
                const Icon = v.catIcons[cat.category] || v.servicesIcon
                return (
                  <div key={cat.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button onClick={() => setOpenCat(isOpen ? null : cat.category)} className="w-full px-3.5 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style={{ backgroundImage: t.gSoft }}><Icon className="w-5 h-5" style={{ color: t.accent }} /></div>
                      <span className="font-black text-[#1A2E26] text-sm flex-1 text-right">{v.catLabels[cat.category] || cat.category}</span>
                      <span className="text-[10px] font-bold text-[#6B7280]">{fmt(cat.items.length)} {v.unitWord}</span>
                      <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 border-t border-gray-100">
                        {cat.items.map((s: any, i: number) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-[#1A2E26] truncate">{s.name}</p>
                              {s.duration > 0 && <p className="text-[10px] text-[#6B7280] flex items-center gap-1"><Clock className="w-3 h-3" /> {fmt(s.duration)} دقيقة</p>}
                            </div>
                            <span className="font-black font-mono text-sm flex-shrink-0" style={{ color: t.accent }}>{fmt(s.price)} ج</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* account access */}
        <Link href="/login" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: t.accentSoft }}><User className="w-5 h-5" style={{ color: t.accent }} /></div>
            <div>
              <p className="font-black text-[#1A2E26]">حسابك على مضمونة</p>
              <p className="text-[11px] text-[#6B7280]">{v.accountSub}</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </Link>

        <p className="text-center text-[10px] text-[#6B7280] pt-2">powered by <b style={{ color: t.accent }}>مضمونة</b> · madmonacairo.com</p>
      </main>
    </div>
  )
}
