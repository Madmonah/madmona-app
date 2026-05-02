import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Sparkles,
  ArrowLeft,
  Building2,
  Compass,
  ShieldCheck,
  Clock,
  Zap,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import InstallPWA from '@/components/InstallPWA'
import FeaturedListings from '@/components/FeaturedListings'
import EconomicNewsHero from '@/components/EconomicNewsHero'
import FinancialTicker from '@/components/FinancialTicker'
import LaunchBanner from '@/components/LaunchBanner'

// ============================================================
// Home page — Premium Editorial Redesign
// "خدمات مضمونة" branding throughout
//
// Layout (top to bottom):
//   1. TopNav (sticky)
//   2. FinancialTicker (live currency + gold)
//   3. LaunchBanner (LAUNCH WEEK 15% off — dismissible)
//   4. Hero with live news ticker
//   5. Categories
//   6. Featured listings
//   7. Showcase cards
//   8. How it works
//   9. Supplier CTA
//   10. Contact
//   11. Footer
// ============================================================

const MADMONA_MAPS_URL = 'https://share.google/QbWskGlQ49AUTJrTc'

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop'
const DEFAULT_MARKETPLACE_IMAGE = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&auto=format&fit=crop'
const DEFAULT_SPACES_IMAGE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85&auto=format&fit=crop'
const DEFAULT_CATEGORY_SPACES_IMG = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'
const DEFAULT_CATEGORY_PROPERTIES_IMG = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop'
const DEFAULT_CATEGORY_VEHICLES_IMG = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&auto=format&fit=crop'
const DEFAULT_CATEGORY_EQUIPMENT_IMG = 'https://images.unsplash.com/photo-1533422902779-aff35862e462?w=600&q=80&auto=format&fit=crop'
const DEFAULT_CATEGORY_EVENTS_IMG = 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&q=80&auto=format&fit=crop'

export const revalidate = 30

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // @ts-expect-error
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')

    type Row = { key: string; value: string }
    const map: Record<string, string> = {}
    ;(data || []).forEach((row: Row) => {
      if (row.value) map[row.key] = row.value
    })
    return map
  } catch (e) {
    return {}
  }
}

export default async function HomePage() {
  const settings = await getSiteSettings()

  const HERO_IMAGE = settings.hero_image_url || DEFAULT_HERO_IMAGE
  const MARKETPLACE_IMAGE = settings.marketplace_image_url || DEFAULT_MARKETPLACE_IMAGE
  const SPACES_IMAGE = settings.spaces_image_url || DEFAULT_SPACES_IMAGE

  const SPACES_CATEGORY_IMG = settings.category_spaces_image_url || DEFAULT_CATEGORY_SPACES_IMG
  const PROPERTIES_IMG = settings.category_properties_image_url || DEFAULT_CATEGORY_PROPERTIES_IMG
  const VEHICLES_IMG = settings.category_vehicles_image_url || DEFAULT_CATEGORY_VEHICLES_IMG
  const EQUIPMENT_IMG = settings.category_equipment_image_url || DEFAULT_CATEGORY_EQUIPMENT_IMG
  const EVENTS_IMG = settings.category_events_image_url || DEFAULT_CATEGORY_EVENTS_IMG

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right overflow-x-hidden pb-20 md:pb-0" dir="rtl">
      <TopNav />

      {/* LIVE Financial Ticker — sticky strip below TopNav */}
      <FinancialTicker />

      {/* LAUNCH WEEK promotional banner — dismissible */}
      <LaunchBanner />

      <main className="relative">
        {/* HERO */}
        <section className="relative pt-6 md:pt-8 pb-12 md:pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="pt-2">
              <InstallPWA />
            </div>

            <div className="flex items-center gap-3 mb-8 mt-6 md:mt-12">
              <div className="h-px w-12 bg-[#1F5F3F]" />
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#1F5F3F]">
                EST. 2026 — CAIRO, EGYPT
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-[#1F5F3F]/30 to-transparent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
              <div className="md:col-span-7 order-2 md:order-1">
                <h1 className="font-black text-gray-900 leading-[0.92] tracking-tight mb-6">
                  <span className="block text-5xl md:text-7xl lg:text-8xl">خدمتك،</span>
                  <span className="block text-5xl md:text-7xl lg:text-8xl gradient-text-green">وقتك،</span>
                  <span className="block text-5xl md:text-7xl lg:text-8xl">
                    <span className="italic font-light">مضمونة</span>
                  </span>
                </h1>

                <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-xl mb-8 md:mb-10">
                  منصة حجز مصرية تجمع كل اللي يتأجر — من موردين معتمدين، بضمان كامل،
                  <span className="text-gray-900 font-medium"> في مكان واحد.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/marketplace" className="group inline-flex items-center justify-center gap-2 bg-[#1F5F3F] text-white px-8 py-4 rounded-full font-bold text-base shadow-elevated hover:shadow-luxe transition-all duration-300 hover:-translate-y-0.5 no-underline">
                    <Compass className="w-5 h-5" />
                    <span>اكتشف الخدمات</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/browse" className="group inline-flex items-center justify-center gap-2 text-gray-900 px-8 py-4 rounded-full font-bold text-base hover:bg-gray-100 transition-all duration-300 no-underline border-b-2 border-gray-900 rounded-b-none rounded-t-full">
                    <span>خدمات مضمونة</span>
                  </Link>
                </div>

                <div className="flex items-center gap-6 md:gap-8 mt-10 flex-wrap">
                  <TrustBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} label="حجز مضمون" />
                  <TrustBadge icon={<Clock className="w-3.5 h-3.5" />} label="رد فوري ٢٤/٧" />
                  <TrustBadge icon={<Star className="w-3.5 h-3.5" />} label="موردين موثّقين" />
                </div>
              </div>

              <div className="md:col-span-5 order-1 md:order-2 relative">
                <EconomicNewsHero fallbackImage={HERO_IMAGE} />
                <div className="absolute -top-3 -left-3 w-20 h-20 border-2 border-[#B8860B]/40 rounded-3xl -z-0 hidden md:block" />
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10 md:mb-14 flex-wrap gap-4">
              <div>
                <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">COLLECTIONS</p>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                  كل اللي
                  <br />
                  <span className="italic font-light gradient-text-green">يتأجر</span>
                </h2>
              </div>
              <Link href="/marketplace" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-[#1F5F3F] transition-colors no-underline">
                <span>شوف الكل</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4">
              <CategoryCard href="/marketplace?category=spaces" image={SPACES_CATEGORY_IMG} label="مساحات عمل" sublabel="WORKSPACES" count="٤ خيارات" className="md:col-span-6 md:row-span-2 aspect-square md:aspect-auto" size="large" />
              <CategoryCard href="/marketplace?category=properties" image={PROPERTIES_IMG} label="عقارات" sublabel="PROPERTIES" className="md:col-span-3 aspect-square" />
              <CategoryCard href="/marketplace?category=vehicles" image={VEHICLES_IMG} label="مركبات" sublabel="VEHICLES" className="md:col-span-3 aspect-square" />
              <CategoryCard href="/marketplace?category=equipment" image={EQUIPMENT_IMG} label="معدات" sublabel="EQUIPMENT" className="md:col-span-3 aspect-square" />
              <CategoryCard href="/marketplace?category=events" image={EVENTS_IMG} label="فعاليات" sublabel="EVENTS" className="md:col-span-3 aspect-square" />
            </div>

            <Link href="/marketplace" className="md:hidden mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-900 no-underline">
              <span>شوف الكل</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FEATURED */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-10 md:mb-14">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">FEATURED</p>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                المختار
                <br />
                <span className="italic font-light gradient-text-green">بعناية</span>
              </h2>
            </div>
            <FeaturedListings />
          </div>
        </section>

        {/* BIG SHOWCASE */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Link href="/marketplace" className="group relative block rounded-3xl overflow-hidden no-underline aspect-[4/5] md:aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MARKETPLACE_IMAGE} alt="Madmona Marketplace" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] bg-[#B8860B] text-white px-3 py-1 rounded-full font-bold tracking-widest uppercase">
                      <Sparkles className="w-3 h-3" />
                      الجديد
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl md:text-5xl font-black text-white mb-3 leading-[0.95]">
                      Madmona
                      <br />
                      <span className="italic font-light">Marketplace</span>
                    </h3>
                    <p className="text-sm md:text-base text-white/85 leading-relaxed mb-6 max-w-md">
                      عقارات، مركبات، معدات، وفعاليات — من موردين معتمدين على المنصة.
                    </p>
                    <div className="inline-flex items-center gap-2 text-white font-bold text-sm group-hover:gap-3 transition-all">
                      <span>اكتشف الكل</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/browse" className="group relative block rounded-3xl overflow-hidden no-underline aspect-[4/5] md:aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SPACES_IMAGE} alt="خدمات مضمونة" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F5F3F]/95 via-[#1F5F3F]/50 to-[#1F5F3F]/20" />
                <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] bg-[#B8860B] text-white px-3 py-1 rounded-full font-bold tracking-widest uppercase">
                      <Star className="w-3 h-3 fill-white" />
                      الأصلي
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl md:text-5xl font-black text-white mb-3 leading-[0.95]">
                      خدمات
                      <br />
                      <span className="italic font-light">مضمونة</span>
                    </h3>
                    <p className="text-sm md:text-base text-white/90 leading-relaxed mb-6 max-w-md">
                      مكاتب فردية، غرف اجتماعات، وجاردن في قلب مصر الجديدة. يومك الأول مجاناً.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <ServiceMini label="مكاتب" sublabel="من ٥٠ ج/ساعة" />
                      <ServiceMini label="اجتماعات" sublabel="من ٢٠٠ ج" />
                      <ServiceMini label="جاردن" sublabel="١٥٠٠ ج/مناسبة" />
                    </div>
                    <div className="inline-flex items-center gap-2 bg-white text-[#1F5F3F] px-5 py-2.5 rounded-full font-bold text-sm group-hover:gap-3 transition-all">
                      <span>احجز دلوقتي</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">THE PROCESS</p>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                ٣ خطوات،
                <br />
                <span className="italic font-light gradient-text-green">حجز مضمون</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Step num="01" title="استكشف" description="اتصفّح الـMarketplace أو ابحث في فئة معينة. شوف الأسعار والصور قبل أي قرار." icon={<Compass className="w-6 h-6" />} iconAccent="text-[#1F5F3F] bg-[#1F5F3F]/10" />
              <Step num="02" title="احجز" description="اختار الوقت اللي يناسبك واحجز فوراً. تأكيد على واتساب من المورد مباشرة." icon={<Zap className="w-6 h-6" />} iconAccent="text-[#B8860B] bg-[#B8860B]/10" />
              <Step num="03" title="استمتع" description="ادفع كاش أو InstaPay. مفيش هيدن فيز. ومتأمن إنك مش هتلاقي مفاجآت." icon={<ShieldCheck className="w-6 h-6" />} iconAccent="text-[#C2410C] bg-[#C2410C]/10" />
            </div>
          </div>
        </section>

        {/* SUPPLIER CTA */}
        <section className="py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative bg-gray-900 text-white rounded-3xl p-8 md:p-16 overflow-hidden shadow-luxe">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#B8860B]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 max-w-2xl">
                <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-4">FOR SUPPLIERS</p>
                <h2 className="text-3xl md:text-6xl font-black mb-5 leading-[0.92]">
                  عندك خدمة؟
                  <br />
                  <span className="italic font-light gradient-text-gold">خلّيها تكسبلك</span>
                </h2>
                <p className="text-sm md:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
                  انضم لـMadmona Marketplace، اعرض خدمتك على آلاف العملاء، واستقبل حجوزات.
                  لوحة كاملة، إشعارات لايف، وعمولة شفافة.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/supplier/register" className="group inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-7 py-3.5 rounded-full font-bold text-sm hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 no-underline">
                    <span>سجّل دلوقتي</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <Link href="/auth/login?redirect=/supplier/marketplace" className="inline-flex items-center justify-center gap-2 border border-white/30 backdrop-blur text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-white/10 transition-all no-underline">
                    عندي حساب
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3 text-center">GET IN TOUCH</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[0.95] text-center mb-10">
              تواصل
              <span className="italic font-light gradient-text-green"> معانا</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">واتساب</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">+20 100 222 9982 · 24/7</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#25D366] group-hover:-translate-x-1 transition-all" />
              </a>

              <a href={MADMONA_MAPS_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">٧ شارع سليمان عَزْمي</p>
                  <p className="text-xs text-gray-500 mt-0.5">النزهة، مصر الجديدة · ٩ ص → ١١ م</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#1F5F3F] group-hover:-translate-x-1 transition-all" />
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center py-12 md:py-16 border-t border-gray-200 bg-white">
          <p className="font-black text-3xl gradient-text-green mb-2">مضمونة</p>
          <p className="text-xs text-gray-500 mb-6 tracking-[0.2em] uppercase">Your service, guaranteed</p>
          <div className="flex justify-center items-center gap-3 text-xs flex-wrap mb-6 px-4">
            <Link href="/about" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">عن مضمونة</Link>
            <span className="text-gray-300">·</span>
            <Link href="/marketplace" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">Marketplace</Link>
            <span className="text-gray-300">·</span>
            <Link href="/privacy" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">الخصوصية</Link>
            <span className="text-gray-300">·</span>
            <Link href="/terms" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">الشروط</Link>
            <span className="text-gray-300">·</span>
            <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">واتساب</a>
          </div>
          <p className="text-[10px] text-gray-400">© 2026 Madmona. جميع الحقوق محفوظة.</p>
        </footer>
      </main>

      <BottomNav />
    </div>
  )
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-[#1F5F3F]">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function CategoryCard({ href, image, label, sublabel, count, className = '', size = 'small' }: { href: string; image: string; label: string; sublabel: string; count?: string; className?: string; size?: 'small' | 'large' }) {
  return (
    <Link href={href} className={`group relative block rounded-2xl overflow-hidden no-underline ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className={`absolute inset-0 flex flex-col justify-end ${size === 'large' ? 'p-6 md:p-8' : 'p-4 md:p-5'}`}>
        <p className={`text-white/70 font-bold tracking-[0.2em] uppercase mb-1 ${size === 'large' ? 'text-[10px] md:text-xs' : 'text-[9px] md:text-[10px]'}`}>{sublabel}</p>
        <h3 className={`font-black text-white leading-tight ${size === 'large' ? 'text-2xl md:text-4xl' : 'text-lg md:text-2xl'}`}>{label}</h3>
        {count && <p className="text-white/80 text-xs mt-2 font-medium">{count}</p>}
      </div>
      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowLeft className="w-4 h-4 text-white" />
      </div>
    </Link>
  )
}

function ServiceMini({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
      <p className="text-xs font-bold text-white">{label}</p>
      <p className="text-[10px] text-white/70 mt-0.5">{sublabel}</p>
    </div>
  )
}

function Step({ num, title, description, icon, iconAccent }: { num: string; title: string; description: string; icon: React.ReactNode; iconAccent: string }) {
  return (
    <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 overflow-hidden">
      <div className="absolute top-4 left-6 text-7xl md:text-8xl font-black text-gray-100 leading-none -z-0 select-none">{num}</div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-2xl ${iconAccent} flex items-center justify-center mb-4`}>{icon}</div>
        <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
