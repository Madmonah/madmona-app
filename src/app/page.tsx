import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Compass, ShieldCheck, Clock, Zap, MapPin, MessageCircle, Star,
  Building2, ShoppingBag, Sparkles,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import InstallPWA from '@/components/InstallPWA'
import FeaturedListings from '@/components/FeaturedListings'
import FinancialTicker from '@/components/FinancialTicker'
import CompactNewsTabs from '@/components/CompactNewsTabs'
import SocialLinks from '@/components/SocialLinks'

// ============================================================
// Home page — Single brand: "خدمات مضمونة"
//
// Layout (top to bottom):
//   1. TopNav
//   2. FinancialTicker
//   3. Simple dual tabs (أجر مننا + أجر معانا)
//   4. NEWS HUB
//   5. Categories grid
//   6. Featured listings
//   7. How it works
//   8. Contact
//   9. Footer
// ============================================================

const MADMONA_MAPS_URL = 'https://share.google/QbWskGlQ49AUTJrTc'
const MADMONA_GOOGLE_REVIEW_URL = 'https://share.google/QbWskGlQ49AUTJrTc'

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop'
const DEFAULT_CATEGORY_FALLBACK = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'

type DBCategory = {
  id: string
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  image_url: string | null
  display_order: number
}

async function getRootCategories(): Promise<DBCategory[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // @ts-expect-error
    const { data } = await supabase
      .from('categories')
      .select('id, name_ar, name_en, slug, icon, image_url, display_order')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    return (data || []) as DBCategory[]
  } catch (e) {
    return []
  }
}

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
  const [settings, rootCategories] = await Promise.all([
    getSiteSettings(),
    getRootCategories(),
  ])

  const HERO_IMAGE = settings.hero_image_url || DEFAULT_HERO_IMAGE

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right overflow-x-hidden pb-20 md:pb-0" dir="rtl">
      <TopNav />
      <FinancialTicker />

      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <InstallPWA />
        </div>

        {/* 🎯 Simple dual tabs - above news */}
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <Link
              href="/marketplace"
              className="flex items-center justify-center gap-2 py-3 md:py-4 bg-[#1F5F3F] text-white text-sm md:text-base font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>أجر مننا</span>
            </Link>
            <Link
              href="/supplier/register"
              className="flex items-center justify-center gap-2 py-3 md:py-4 bg-[#B8860B] text-white text-sm md:text-base font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
            >
              <Building2 className="w-4 h-4" />
              <span>أجر معانا</span>
            </Link>
          </div>
        </div>

        {/* 🔥 NEWS HUB - Top of page, full prominence */}
        <section className="relative pt-4 md:pt-6 pb-8 md:pb-10">
          <div className="max-w-7xl mx-auto px-4">
            {/* Section header - clear title for the news block */}
            <div className="flex items-end justify-between mb-5 md:mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1F5F3F] text-white flex items-center justify-center shadow-soft">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                  </span>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#1F5F3F]">LIVE · EST. 2026</p>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">آخر الأخبار</h2>
                </div>
              </div>
              <p className="text-[11px] md:text-xs text-gray-500 max-w-md leading-relaxed">
                أخبار لحظية من أفضل المصادر المصرية والعالمية · تتجدد كل ٣ دقايق
              </p>
            </div>
            <CompactNewsTabs />
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10 md:mb-14 flex-wrap gap-4">
              <div>
                <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">COLLECTIONS</p>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                  <span className="block">كل اللي</span>
                  <span className="block italic font-light gradient-text-green">يتأجر</span>
                </h2>
              </div>
              <Link href="/marketplace" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-[#1F5F3F] transition-colors no-underline">
                <span>شوف الكل</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>

            {rootCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                لسه مفيش فئات. <Link href="/marketplace" className="text-[#1F5F3F] font-bold no-underline">شوف الكل</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4">
                {rootCategories.map((cat, idx) => {
                  const isFirst = idx === 0
                  // First item: large hero (spans 6 cols, 2 rows)
                  // Rest: small (spans 3 cols)
                  const sizeClass = isFirst
                    ? 'md:col-span-6 md:row-span-2 aspect-square md:aspect-auto'
                    : 'md:col-span-3 aspect-square'
                  return (
                    <CategoryCard
                      key={cat.id}
                      href={`/marketplace?category=${cat.slug}`}
                      image={cat.image_url || DEFAULT_CATEGORY_FALLBACK}
                      label={cat.name_ar}
                      sublabel={(cat.name_en || cat.slug).toUpperCase()}
                      icon={cat.icon || null}
                      className={sizeClass}
                      size={isFirst ? 'large' : 'small'}
                    />
                  )
                })}
              </div>
            )}

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
                <span className="block">المختار</span>
                <span className="block italic font-light gradient-text-green">بعناية</span>
              </h2>
            </div>
            <FeaturedListings />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">THE PROCESS</p>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                <span className="block">٣ خطوات،</span>
                <span className="block italic font-light gradient-text-green">حجز مضمون</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Step num="01" title="استكشف" description="اتصفّح الخدمات أو ابحث في فئة معينة. شوف الأسعار والصور قبل أي قرار." icon={<Compass className="w-6 h-6" />} iconAccent="text-[#1F5F3F] bg-[#1F5F3F]/10" />
              <Step num="02" title="احجز" description="اختار الوقت اللي يناسبك واحجز فوراً. تأكيد على واتساب من أجر معانا مباشرة." icon={<Zap className="w-6 h-6" />} iconAccent="text-[#B8860B] bg-[#B8860B]/10" />
              <Step num="03" title="استمتع" description="ادفع كاش أو InstaPay. مفيش هيدن فيز. ومتأمن إنك مش هتلاقي مفاجآت." icon={<ShieldCheck className="w-6 h-6" />} iconAccent="text-[#C2410C] bg-[#C2410C]/10" />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
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

              {/* Rate us on Google */}
              <a href={MADMONA_GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-[#FBBC04] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">قيّمنا على جوجل</p>
                  <p className="text-xs text-gray-500 mt-0.5">رأيك بيفرق معانا</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#FBBC04] group-hover:-translate-x-1 transition-all" />
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 md:py-16 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="font-black text-3xl gradient-text-green mb-2">مضمونة</p>
            <p className="text-xs text-gray-500 mb-6 tracking-[0.2em] uppercase">Your service, guaranteed · احنا بتوع الإيجار</p>

            {/* Social media icons (smart-hide if URL empty) */}
            <div className="mb-8">
              <SocialLinks variant="default" />
            </div>

            <div className="flex justify-center items-center gap-3 text-xs flex-wrap mb-6 px-4">
              <Link href="/about" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">عن مضمونة</Link>
              <span className="text-gray-300">·</span>
              <Link href="/marketplace" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">خدمات مضمونة</Link>
              <span className="text-gray-300">·</span>
              <Link href="/privacy" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">الخصوصية</Link>
              <span className="text-gray-300">·</span>
              <Link href="/terms" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">الشروط</Link>
              <span className="text-gray-300">·</span>
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">واتساب</a>
            </div>
            <p className="text-[10px] text-gray-400">© 2026 Madmona. جميع الحقوق محفوظة.</p>
          </div>
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

function CategoryCard({ href, image, label, sublabel, count, icon, className = '', size = 'small' }: { href: string; image: string; label: string; sublabel: string; count?: string; icon?: string | null; className?: string; size?: 'small' | 'large' }) {
  return (
    <Link href={href} className={`group relative block rounded-2xl overflow-hidden no-underline ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className={`absolute inset-0 flex flex-col justify-end ${size === 'large' ? 'p-6 md:p-8' : 'p-4 md:p-5'}`}>
        {icon && (
          <span className={`mb-2 ${size === 'large' ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>{icon}</span>
        )}
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
