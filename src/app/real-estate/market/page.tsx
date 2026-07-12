// src/app/real-estate/market/page.tsx
// =====================================================================
// 📊 بورصة عقارات مضمونة — مرجع العقارات في مصر (يوليو 2026)
// server component خفيف: SEO + جلب الداتا من Supabase (ISR كل ساعة)
// والتفاعل كله (بحث + فلاتر) في MarketExplorer (client).
// الداتا: property_market_items + property_opportunities — بتتجدد
// يومياً تلقائياً (pg_cron → olx-scraper → refresh_property_opportunities).
// =====================================================================
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import TopNav from '@/components/TopNav'
import MarketExplorer, { type Item, type Opportunity } from './MarketExplorer'

export const revalidate = 3600 // ساعة

export const metadata: Metadata = {
  title: 'بورصة عقارات مضمونة — أسعار العاصمة والتجمع والساحل + بحث وفلاتر',
  description:
    'مرجع العقارات في مصر: ابحث وفلتر في عشرات مشروعات المطورين بأسعار محدثة، الريسيل، الإيجارات، وفرص بيع وإيجار حقيقية بتتجدد يومياً — العاصمة الإدارية، التجمع الخامس، والساحل الشمالي.',
  keywords: [
    'أسعار العقارات في مصر', 'بحث عقارات', 'أسعار العاصمة الإدارية', 'سعر المتر في العاصمة الإدارية',
    'أسعار شقق التجمع الخامس', 'شاليهات الساحل الشمالي', 'أسعار الساحل 2026', 'إيجار شاليهات الساحل',
    'ريسيل العاصمة الإدارية', 'إيجارات التجمع الخامس', 'مشروعات المطورين 2026', 'شقق للبيع', 'شقق للإيجار',
  ],
  openGraph: {
    title: 'بورصة عقارات مضمونة — مرجع العقارات في مصر',
    description: 'ابحث وفلتر: مشروعات المطورين · الريسيل · الإيجارات · فرص بيع وإيجار بتتجدد يومياً.',
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
      .select(
        'id, slug, area, area_label, city, segment, developer, title, unit_label, ' +
        'price_from, price_to, price_unit, note, payment_plan, delivery_label, ' +
        'cover_url, brochure_url, video_url, media, sort_order, updated_at',
      )
      .eq('is_active', true)
      .eq('status', 'published')
      .eq('embargoed', false) // ⛔ المشاريع المحظور نشرها (زي أبراج العلمين) مبتظهرش
      .order('sort_order', { ascending: true })
    return (data as unknown as Item[]) || []
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
      <TopNav />
      <MarketExplorer items={items} opportunities={opportunities} />
    </div>
  )
}
