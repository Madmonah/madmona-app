import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Compass, ShieldCheck, Clock, Zap, MapPin, MessageCircle, Star,
  Plus, ShoppingBag, Sparkles,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import DownloadAppBig from '@/components/DownloadAppBig'
import FeaturedListings from '@/components/FeaturedListings'
import FinancialTicker from '@/components/FinancialTicker'
import CompactNewsTabs from '@/components/CompactNewsTabs'
import NewsStories from '@/components/NewsStories'
import SocialLinks from '@/components/SocialLinks'
import MUACampaignBanner from '@/components/MUACampaignBanner'
import CategoryTrackTabs from '@/components/CategoryTrackTabs'
import DailyMessageCard from '@/components/retention/DailyMessageCard'
import T from '@/components/T'
import MadmonaShowcase from '@/components/MadmonaShowcase'
import PropertyMarketHomeSection from '@/components/PropertyMarketHomeSection'

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
// ⛔ (16 يوليو 2026) اتشال `DEFAULT_CATEGORY_FALLBACK` — كان نفس صورة ممر
//    المكتب اللي كانت بتتحط على «خضار وفاكهة» و«إكسسوارات عربيات». كان معرَّف
//    هنا ومش مستخدم أصلاً؛ بشيله عشان محدش يوصّله بحاجة تاني.
//    الفئة اللي مالهاش صورة بقت تاخد كارت بأيقونتها — شوف CategoryTrackTabs.

type DBCategory = {
  id: string
  name_ar: string
  name_en: string | null
  slug: string
  icon: string | null
  image_url: string | null
  display_order: number
  track: string | null
  group_slug?: string | null
  group_name_ar?: string | null
  group_emoji?: string | null
  group_display_order?: number | null
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
      .select('id, name_ar, name_en, slug, icon, image_url, display_order, track, group_slug, group_name_ar, group_emoji, group_display_order')
      .is('parent_id', null)
      .eq('is_active', true)
      .not('slug', 'eq', 'properties') // Hide legacy all-in-one properties cat
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

async function getSiteStats(): Promise<{ listings: number; categories: number; suppliers: number; cities: number }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    // @ts-expect-error untyped rpc
    const { data } = await supabase.rpc('home_stats')
    const s = (data || {}) as { listings?: number; categories?: number; suppliers?: number; cities?: number }
    return {
      listings: s.listings || 0,
      categories: s.categories || 0,
      suppliers: s.suppliers || 0,
      cities: s.cities || 0,
    }
  } catch (e) {
    return { listings: 0, categories: 0, suppliers: 0, cities: 0 }
  }
}

export default async function HomePage() {
  const [settings, rootCategories, stats] = await Promise.all([
    getSiteSettings(),
    getRootCategories(),
    getSiteStats(),
  ])

  const HERO_IMAGE = settings.hero_image_url || DEFAULT_HERO_IMAGE

  return (
    <div className="min-h-screen bg-[#FAFAF7] overflow-x-hidden pb-20 md:pb-0">
      <TopNav />
      <MUACampaignBanner />
      <FinancialTicker />

      <main className="relative">
        {/* 🔴 NEWS HUB — فوق خالص، بعرض ماجازين (27 Jul 2026) */}
        <section className="pt-4 md:pt-5 pb-3">
          <div className="max-w-7xl mx-auto px-4">
            {/* موبايل: ستوري */}
            <NewsStories />
            {/* ديسكتوب: ماجازين */}
            <div className="hidden md:block">
              <CompactNewsTabs />
            </div>
          </div>
        </section>

        {/* قسم الواجهة المتحرك — Hero + 5 chips + counters */}
        <MadmonaShowcase stats={stats} />

        {/* 📊 بورصة عقارات مضمونة — بعد الأصناف الـ5 مباشرة (27 Jul 2026).
            Server component بيقرأ property_market_items + شريط لوجوهات المطورين، وبيخفي نفسه لو مفيش داتا. */}
        <PropertyMarketHomeSection />

        {/* 📥 ZAR واحد كبير لتحميل التطبيق — استبدل الـ dual CTAs المكررة */}
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <DownloadAppBig />
        </div>

        {/* 📅 Daily message card — retention feature (Phase X, May 18 2026).
            Renders a tappable card with greeting/tip/announcement.
            Hides itself if no message available or user dismissed it.
            Logged-in users get rotating personalized messages; anonymous
            users get weighted-random from active pool. */}
        <div className="max-w-7xl mx-auto px-4">
          <DailyMessageCard />
        </div>

        {/* (الأخبار اتنقلت لفوق خالص — أول قسم في main، بعرض ماجازين) */}

        {/* CATEGORIES */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-10 md:mb-14 flex-wrap gap-4">
              <div>
                <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2FA084] mb-3">COLLECTIONS</p>
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                  <span className="block"><T k="home.cats.title1" /></span>
                  <span className="block italic font-light gradient-text-green"><T k="home.cats.title2" /></span>
                </h2>
              </div>
              <Link href="/marketplace" className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-[#1F6F5F] transition-colors no-underline">
                <span><T k="home.see_all" /></span>
                <ArrowLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </div>

            {rootCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <T k="home.cats.empty" /> <Link href="/marketplace" className="text-[#1F6F5F] font-bold no-underline"><T k="home.see_all" /></Link>
              </div>
            ) : (
              <CategoryTrackTabs categories={rootCategories} />
            )}

            <Link href="/marketplace" className="md:hidden mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-900 no-underline">
              <span><T k="home.see_all" /></span>
              <ArrowLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </div>
        </section>

        {/* FEATURED */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <FeaturedListings />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2FA084] mb-3">THE PROCESS</p>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95]">
                <span className="block"><T k="home.how.title1" /></span>
                <span className="block italic font-light gradient-text-green"><T k="home.how.title2" /></span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Step num="01" title={<T k="home.how.s1.title" />} description={<T k="home.how.s1.desc" />} icon={<Compass className="w-6 h-6" />} iconAccent="text-[#1F6F5F] bg-[#1F6F5F]/10" />
              <Step num="02" title={<T k="home.how.s2.title" />} description={<T k="home.how.s2.desc" />} icon={<Zap className="w-6 h-6" />} iconAccent="text-[#2FA084] bg-[#2FA084]/10" />
              <Step num="03" title={<T k="home.how.s3.title" />} description={<T k="home.how.s3.desc" />} icon={<ShieldCheck className="w-6 h-6" />} iconAccent="text-[#6FCF97] bg-[#6FCF97]/10" />
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2FA084] mb-3 text-center">GET IN TOUCH</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[0.95] text-center mb-10">
              <T k="home.contact.title1" />
              <span className="italic font-light gradient-text-green"> <T k="home.contact.title2" /></span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
              <Link href="/chat" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">شات مضمونة — رد فوري</p>
                  <p className="text-xs text-gray-500 mt-0.5">كلّمنا مباشر على الموقع · متاح 24/7</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#25D366] group-hover:-translate-x-1 transition-all" />
              </Link>

              <a href={MADMONA_MAPS_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900"><T k="home.contact.address" /></p>
                  <p className="text-xs text-gray-500 mt-0.5"><T k="home.contact.address_sub" /></p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#1F6F5F] group-hover:-translate-x-1 transition-all" />
              </a>

              {/* Rate us on Google */}
              <a href={MADMONA_GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-5 bg-[#FAFAF7] rounded-2xl hover:bg-white hover:shadow-card transition-all duration-300 no-underline border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-[#FBBC04] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900"><T k="home.contact.rate" /></p>
                  <p className="text-xs text-gray-500 mt-0.5"><T k="home.contact.rate_sub" /></p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#FBBC04] group-hover:-translate-x-1 transition-all" />
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 md:py-16 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="font-black text-3xl gradient-text-green mb-2"><T k="common.brand" /></p>
            <p className="text-xs text-gray-500 mb-6 tracking-[0.2em] uppercase"><T k="footer.tagline" /></p>

            {/* Social media icons (smart-hide if URL empty) */}
            <div className="mb-8">
              <SocialLinks variant="default" />
            </div>

            <div className="flex justify-center items-center gap-3 text-xs flex-wrap mb-6 px-4">
              <Link href="/about" className="text-gray-600 hover:text-[#1F6F5F] font-medium no-underline transition-colors"><T k="footer.about_link" /></Link>
              <span className="text-gray-300">·</span>
              <Link href="/marketplace" className="text-gray-600 hover:text-[#1F6F5F] font-medium no-underline transition-colors"><T k="footer.services_link" /></Link>
              <span className="text-gray-300">·</span>
              <Link href="/privacy" className="text-gray-600 hover:text-[#1F6F5F] font-medium no-underline transition-colors"><T k="footer.privacy" /></Link>
              <span className="text-gray-300">·</span>
              <Link href="/terms" className="text-gray-600 hover:text-[#1F6F5F] font-medium no-underline transition-colors"><T k="footer.terms" /></Link>
              <span className="text-gray-300">·</span>
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1F6F5F] font-medium no-underline transition-colors"><T k="footer.whatsapp" /></a>
            </div>
            <p className="text-[10px] text-gray-400"><T k="footer.copyright" /></p>
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
      <span className="text-[#1F6F5F]">{icon}</span>
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

function Step({ num, title, description, icon, iconAccent }: { num: string; title: React.ReactNode; description: React.ReactNode; icon: React.ReactNode; iconAccent: string }) {
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
