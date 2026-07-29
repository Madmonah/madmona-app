// src/app/real-estate/market/page.tsx
// =====================================================================
// 🏗️ بورصة مشاريع المطوّرين — إعادة تصميم 3a (29 Jul 2026)
// server component خفيف: SEO + جلب الداتا من Supabase (ISR كل ساعة)
// والتفاعل كله (بحث + فلاتر) في MarketExplorer (client).
// ⚠️ بنجيب كل property_market_items (مش المطوّرين بس) — صفوف الريسيل
// egp_per_m2 بتتحسب منها مؤشرات «العاصمة — المتر» و«التجمع — المتر».
// الموبايل: هيدر التطبيق المدمج + BottomNav (تبويب السوق). TopNav على
// الديسكتوب بس.
// =====================================================================
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import MarketExplorer, { type Item, type Opportunity } from './MarketExplorer'
import { PUBLIC_PROJECT_COLUMNS } from '@/lib/projects'

export const revalidate = 3600 // ساعة

export const metadata: Metadata = {
  title: 'بورصة مشاريع المطوّرين — مضمونة | أسعار من المطوّرين مباشرة + بحث وفلاتر',
  description:
    'بورصة مشاريع المطوّرين على مضمونة: ابحث وفلتر في عشرات المشاريع بأسعار محدثة من المطوّرين مباشرة، بروشور وفيديو لكل مشروع، وفرص بيع وإيجار حقيقية بتتجدد يومياً — العاصمة الإدارية، التجمع الخامس، والساحل الشمالي.',
  keywords: [
    'مشروعات المطورين 2026', 'أسعار العقارات في مصر', 'بحث عقارات', 'أسعار العاصمة الإدارية',
    'سعر المتر في العاصمة الإدارية', 'أسعار شقق التجمع الخامس', 'شاليهات الساحل الشمالي',
    'أسعار الساحل 2026', 'كمبوندات العاصمة الإدارية', 'شقق للبيع', 'فرص عقارية',
  ],
  openGraph: {
    title: 'بورصة مشاريع المطوّرين — مضمونة',
    description: 'أسعار من المطوّرين مباشرة · بروشور وفيديو لكل مشروع · فرص بيع وإيجار بتتجدد يومياً.',
    url: 'https://madmonacairo.com/real-estate/market',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
  alternates: { canonical: 'https://madmonacairo.com/real-estate/market' },
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

async function getItems(): Promise<Item[]> {
  try {
    const { data } = await sb()
      .from('property_market_items')
      .select(PUBLIC_PROJECT_COLUMNS)
      .eq('is_active', true)
      .eq('status', 'published')
      .eq('embargoed', false) // ⛔ المشاريع المحظور نشرها (زي أبراج العلمين) مبتظهرش
      .order('sort_order', { ascending: true })
    const rows = (data as unknown as Item[]) || []
    // 🆕 (13 Jul 2026) الصورة هي البطل — المشاريع اللي معاها صورة تظهر الأول،
    // وبعدين اللي معاها بروشور/فيديو، وبعدين الباقي. الترتيب الأصلي بيتحافظ عليه جوه كل مجموعة.
    const rank = (it: Item) => (it.cover_url ? 0 : (it.brochure_url || it.video_url) ? 1 : 2)
    return rows
      .map((it, i) => ({ it, i }))
      .sort((a, b) => rank(a.it) - rank(b.it) || a.i - b.i)
      .map(({ it }) => it)
  } catch {
    return []
  }
}

async function getOpportunities(): Promise<Opportunity[]> {
  try {
    const { data } = await sb()
      .from('property_opportunities')
      .select('id, title, kind, area_label, city, snippet, posted_at, offer_type, price_label')
      .order('posted_at', { ascending: false })
      .limit(48)
    return (data as Opportunity[]) || []
  } catch {
    return []
  }
}

export default async function PropertyMarketPage() {
  const [items, opportunities] = await Promise.all([getItems(), getOpportunities()])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* TopNav للديسكتوب بس — الموبايل ليه هيدر التطبيق المدمج جوه MarketExplorer */}
      <div className="hidden md:block">
        <TopNav />
      </div>
      <MarketExplorer items={items} opportunities={opportunities} />
      <BottomNav />
    </div>
  )
}
