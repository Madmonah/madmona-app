import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Compass, ShieldCheck, Clock, Zap, MapPin, MessageCircle, Star,
  Plus, ShoppingBag, Sparkles,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import DownloadAppBig from '@/components/DownloadAppBig'
import FeaturedListings from '@/components/FeaturedListings'
import SocialLinks from '@/components/SocialLinks'
import MUACampaignBanner from '@/components/MUACampaignBanner'
import CategoryTrackTabs from '@/components/CategoryTrackTabs'
import DailyMessageCard from '@/components/retention/DailyMessageCard'
import T from '@/components/T'
import MadmonaShowcase from '@/components/MadmonaShowcase'
import PropertyMarketHomeSection from '@/components/PropertyMarketHomeSection'
import MobileHome from '@/components/MobileHome'
import HomeRedesign from '@/components/redesign/HomeRedesign'

// ============================================================
// Home page — Single brand: "خدمات مضمونة"
// ⚠️ (11 أغسطس 2026) الأخبار وأسعار العملات/الذهب اتنقلوا بالكامل لتاب
// "بورصة رجال الأعمال" (/business-lounge) — FinancialTicker/CompactNewsTabs/
// NewsStories متشالوش من هنا لأنهم أصلاً كانوا imports ميتة (مش متستخدمين
// في الـJSX) قبل التعديل ده.
//
// Layout (top to bottom):
//   1. TopNav
//   2. Simple dual tabs (أجر مننا + أجر معانا)
//   3. Categories grid
//   4. Featured listings
//   5. How it works
//   6. Contact
//   7. Footer
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
  name_i18n?: Record<string, string> | null
  group_name_i18n?: Record<string, string> | null
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
    const { data } = await supabase
      .from('categories')
      .select('id, name_ar, name_en, name_i18n, slug, icon, image_url, display_order, track, group_slug, group_name_ar, group_name_i18n, group_emoji, group_display_order')
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

// (29 Jul 2026) عدّاد الإعلانات المنشورة لكل قسم رئيسي — لشارة «قريبًا» تحت 5
async function getGroupLiveCounts(): Promise<Record<string, number>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase.rpc('home_group_live_counts')
    const out: Record<string, number> = {}
    for (const row of (data || []) as { gkey: string; live: number }[]) out[row.gkey] = Number(row.live)
    return out
  } catch (e) {
    return {}
  }
}

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
  const [settings, rootCategories, stats, liveCounts] = await Promise.all([
    getSiteSettings(),
    getRootCategories(),
    getSiteStats(),
    getGroupLiveCounts(),
  ])

  const HERO_IMAGE = settings.hero_image_url || DEFAULT_HERO_IMAGE

  return (
    <div className="min-h-screen bg-[#FAFAF7] overflow-x-hidden pb-20 md:pb-0">
      {/* 📱 MOBILE — new "2a" focused home (30 يوليو 2026). الديسكتوب تحت من غير تغيير. */}
      {/* ⚠️ (6 Aug 2026) MUACampaignBanner بيستخدم useSearchParams — لازم Suspense حواليه
          وإلا Next بتحقن BAILOUT_TO_CLIENT_SIDE_RENDERING في الـHTML الستاتيك وبتكسر الـhydration */}
      <div className="md:hidden"><Suspense fallback={null}><MUACampaignBanner /></Suspense></div>
      <MobileHome categories={rootCategories} liveCounts={liveCounts} />

      {/* DESKTOP - New design (7 Aug 2026) from Madmona Redesign file */}
      <div className="hidden md:block">
        <HomeRedesign categories={rootCategories} stats={stats} liveCounts={liveCounts} heroImage={HERO_IMAGE} />
        {/* 🔗 (8 Aug 2026) قسم «تواصل معانا» + أيقونات السوشيال رجع للديسكتوب —
            كان اتشال بالغلط مع الريدزاين (الدالة كانت موجودة بس محدش بيرندرها) */}
        <ContactSection />
      </div>

      <BottomNav />
    </div>
  )
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-[#059669]">{icon}</span>
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


function ContactSection() {
  return (
    <section className="py-7 md:py-9 bg-white">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2FA084] mb-2">GET IN TOUCH</p>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-[0.95] mb-5">
          تواصل <span className="italic font-light gradient-text-green">معانا</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
          <a href="/chat" title="شات مضمونة — رد فوري" aria-label="شات مضمونة" className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline"><MessageCircle className="w-5 h-5" /></a>
          <a href={MADMONA_MAPS_URL} target="_blank" rel="noopener noreferrer" title="مكاننا — النزهة، مصر الجديدة" aria-label="مكاننا" className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline"><MapPin className="w-5 h-5" /></a>
          <a href={MADMONA_GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" title="قيّمنا على جوجل" aria-label="قيّمنا على جوجل" className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#FBBC04] text-white flex items-center justify-center shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all no-underline"><Star className="w-5 h-5 fill-white" /></a>
          <span className="w-px h-7 bg-gray-200 mx-1" />
          <SocialLinks variant="default" />
        </div>
      </div>
    </section>
  )
}
