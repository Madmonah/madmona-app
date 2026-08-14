// app/admin/sponsorships/page.tsx
// =====================================================================
// ADMIN SPONSORSHIPS — Mohamed's revenue ops dashboard (May 16 2026)
// Mohamed: "انا اقصى عمولة باخدها 10% — ادفع من جيبي ولا اقولة ليك اعلان بريميوم؟"
//
// Answers Mohamed's question by surfacing 3 revenue streams clearly:
//   1. Rate card — what to charge brands for paid placements
//   2. Active sponsorships — who's paying right now (revenue dashboard)
//   3. Curated picks — Madmona's editorial picks (no money, just visibility)
//
// This isn't a sales tool. It's a transparency tool for Mohamed to know:
//   - How much revenue is locked in from sponsored ads
//   - Which slots are open and at what price
//   - Which deals are supplier-funded (no Madmona expense) vs sponsored
// =====================================================================

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface RateCardItem {
  slug: string;
  name_ar: string;
  description_ar: string;
  duration: string;
  price_egp: number;
  placement: string;
  display_order: number;
}

interface FeaturedDeal {
  id: string;
  title_ar: string;
  sponsorship_type: 'supplier_promo' | 'sponsored_ad' | 'madmona_curated';
  monthly_fee_egp: number | null;
  payment_status: string | null;
  paid_until: string | null;
  placement_tier: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  brand: { name_ar: string } | null;
}

async function loadData(): Promise<{ rateCard: RateCardItem[]; deals: FeaturedDeal[] }> {
  const [rateCardRes, dealsRes] = await Promise.all([
    supabase.from('ad_rate_card').select('*').eq('is_active', true).order('display_order'),
    supabase
      .from('featured_deals')
      .select(`
        id, title_ar, sponsorship_type, monthly_fee_egp, payment_status,
        paid_until, placement_tier, starts_at, ends_at, is_active,
        brand:featured_brands(name_ar)
      `)
      .eq('is_active', true)
      .order('display_order'),
  ]);

  return {
    rateCard: (rateCardRes.data || []) as RateCardItem[],
    deals: (dealsRes.data || []) as unknown as FeaturedDeal[],
  };
}

export default async function AdminSponsorshipsPage() {
  const { rateCard, deals } = await loadData();

  // Revenue calculations
  const activeSponsored = deals.filter(d => d.sponsorship_type === 'sponsored_ad' && d.payment_status === 'paid');
  const monthlyRevenue = activeSponsored.reduce((sum, d) => sum + (d.monthly_fee_egp || 0), 0);
  const supplierPromos = deals.filter(d => d.sponsorship_type === 'supplier_promo').length;
  const editorialPicks = deals.filter(d => d.sponsorship_type === 'madmona_curated').length;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0] bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link href="/admin" className="text-xs text-[#6B7280]">← لوحة الأدمن</Link>
              <h1 className="text-xl font-semibold mt-1">الإعلانات والرعاية</h1>
            </div>
            <span className="text-[10px] font-bold text-[#059669] bg-[#34D399]/8 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Revenue Ops
            </span>
          </div>
          <p className="text-sm text-[#6B7280]">
            الـ Featured Deals والـ Daily Drops ما بتاخدش من جيب مضمونة — كلها إعلانات مدفوعة، خصومات من البائع نفسه، أو اختيارات تحريرية.
          </p>
        </div>
      </header>

      <main className="px-5 py-6 max-w-5xl mx-auto space-y-6">
        {/* Revenue snapshot */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RevenueCard
            label="إعلانات مدفوعة شغالة"
            value={activeSponsored.length}
            sublabel={`${monthlyRevenue.toLocaleString('ar-EG')} ج.م/شهر`}
            tone="green"
            emoji="💰"
          />
          <RevenueCard
            label="عروض البائعين"
            value={supplierPromos}
            sublabel="مفيش تكلفة على مضمونة"
            tone="blue"
            emoji="🤝"
          />
          <RevenueCard
            label="اختيارات تحريرية"
            value={editorialPicks}
            sublabel="عرض مجاني للـ branding"
            tone="amber"
            emoji="🌟"
          />
        </section>

        {/* Rate card */}
        <section className="bg-white rounded-2xl border border-[#E5E5E0] overflow-hidden">
          <header className="px-5 py-4 border-b border-[#F5F4F0] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">قائمة الأسعار</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">المبالغ اللي البراند بيدفعها لك مقابل الظهور</p>
            </div>
            <Link
              href="/admin/sponsorships/new"
              className="text-xs bg-[#34D399] text-[#04352A] px-3 py-1.5 rounded-lg font-bold hover:bg-[#34D399]/90"
            >
              + بيع slot جديد
            </Link>
          </header>
          <div className="divide-y divide-[#F5F4F0]">
            {rateCard.map(item => (
              <div key={item.slug} className="px-5 py-4 flex items-center gap-4 hover:bg-[#FAFAF7]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">{item.name_ar}</span>
                    <span className="text-[9px] font-bold text-[#059669] bg-[#34D399]/8 px-1.5 py-0.5 rounded uppercase tracking-widest">
                      {item.placement.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280]">{item.description_ar}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-[#059669]">
                    {item.price_egp.toLocaleString('ar-EG')}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]">ج.م / {item.duration === 'daily' ? 'يوم' : item.duration === 'weekly' ? 'أسبوع' : 'شهر'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active placements */}
        <section className="bg-white rounded-2xl border border-[#E5E5E0] overflow-hidden">
          <header className="px-5 py-4 border-b border-[#F5F4F0]">
            <h2 className="text-base font-bold">العروض الشغالة دلوقتي</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">إجمالي {deals.length} عرض على المنصة</p>
          </header>
          <div className="divide-y divide-[#F5F4F0]">
            {deals.map(d => (
              <div key={d.id} className="px-5 py-4 hover:bg-[#FAFAF7]">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26] truncate">{d.title_ar}</p>
                    {d.brand && (
                      <p className="text-xs text-[#6B7280] mt-0.5">📍 {d.brand.name_ar}</p>
                    )}
                  </div>
                  <SponsorshipBadge type={d.sponsorship_type} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                  {d.sponsorship_type === 'sponsored_ad' && d.monthly_fee_egp ? (
                    <span className="font-bold text-emerald-600">
                      💰 {Number(d.monthly_fee_egp).toLocaleString('ar-EG')} ج.م/شهر
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">— مفيش تكلفة على مضمونة</span>
                  )}
                  {d.placement_tier && (
                    <span>📍 {d.placement_tier.replace('_', ' ')}</span>
                  )}
                  {d.payment_status && d.payment_status !== 'free' && (
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      d.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      d.payment_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {d.payment_status === 'paid' ? 'مدفوع' : d.payment_status === 'pending' ? 'في انتظار الدفع' : 'منتهي'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Business rationale (educational) */}
        <section className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200/50">
          <h3 className="font-bold text-sm mb-2">💡 ليه ٣ أنواع؟</h3>
          <div className="space-y-2 text-xs text-[#1A2E26] leading-relaxed">
            <p><strong className="text-emerald-700">إعلان مدفوع (sponsored_ad):</strong> البراند بيدفعلك مقابل الـ slot. مكسب صافي مستقل عن أي bookings.</p>
            <p><strong className="text-blue-700">عرض البائع (supplier_promo):</strong> البائع نفسه بيقدم الخصم — مضمونة بتاخد عمولتها 10% من السعر بعد الخصم. مفيش فلوس بتنزل من جيبك.</p>
            <p><strong className="text-amber-700">اختيار تحريري (madmona_curated):</strong> اختيار بناءً على جودة العرض، بدون مقابل مالي. للـ branding وللعلاقات مع كبار البائعين.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function RevenueCard({
  label, value, sublabel, tone, emoji,
}: {
  label: string;
  value: number | string;
  sublabel: string;
  tone: 'green' | 'blue' | 'amber';
  emoji: string;
}) {
  const colors = {
    green: 'from-emerald-50 to-emerald-100/50 border-emerald-200/50 text-emerald-900',
    blue:  'from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-900',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200/50 text-amber-900',
  }[tone];
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors} border`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[11px] opacity-75 mt-1">{sublabel}</div>
    </div>
  );
}

function SponsorshipBadge({ type }: { type: string }) {
  const config = {
    sponsored_ad:    { label: 'إعلان مدفوع',   bg: 'bg-emerald-100 text-emerald-700' },
    supplier_promo:  { label: 'عرض البائع',     bg: 'bg-blue-100 text-blue-700' },
    madmona_curated: { label: 'اختيار تحريري',  bg: 'bg-amber-100 text-amber-700' },
  }[type] || { label: type, bg: 'bg-gray-100 text-gray-700' };

  return (
    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${config.bg}`}>
      {config.label}
    </span>
  );
}
