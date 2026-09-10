// ============================================================================
// 🖨️ /poster/<slug> — بوستر QR جاهز للطباعة لكل بيزنس على مضمونة (١٠ سبتمبر ٢٠٢٦)
//
// محمد: «عايز حل للانتشار والترافيك… شوفلي ثغرة ممكن ننتشر منها». الثغرة: ٣١٤ بيزنس عندهم صفحة على
// مضمونة وكل واحد عنده كاشير وترابيزات وفاتورة وواتساب — كل QR متعلّق على الحيط = زوار بيرجعوا كل يوم من
// غير إعلانات. الصفحة دي عامة (من غير دخول) عشان الفريق يبعت لينكها لصاحب البيزنس على واتساب من /crm ويطبعه.
// البيانات المعروضة عامة أصلًا (الاسم · اللوجو · الرابط) — بتتقرا بـservice_role لأن suppliers مقفول لـanon.
// ============================================================================
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { platformAdminDb } from '@/lib/platformAdmin'
import PosterActions from './PosterActions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

const SITE = 'https://www.madmonacairo.com'
const VERB: Record<string, string> = { restaurant: 'امسح واطلب من المنيو', clinic: 'امسح واحجز ميعادك', beauty_salon: 'امسحي واحجزي ميعادك', spa: 'امسح واحجز جلستك', gym: 'امسح واشترك', vehicle_agency: 'امسح وشوف الكتالوج', retail_shop: 'امسح واطلب', contracting: 'امسح وشوف أعمالنا', real_estate: 'امسح وشوف الوحدات' }

export default async function PosterPage({ params }: { params: { slug: string } }) {
  const db = platformAdminDb()
  const { data: s } = await db.from('suppliers').select('id, business_name, logo_url, industry, city, join_slug, status')
    .eq('join_slug', params.slug).maybeSingle()
  const sup = s as { id: string; business_name: string; logo_url: string | null; industry: string | null; city: string | null; join_slug: string; status: string } | null
  if (!sup || sup.status !== 'approved') notFound()
  const url = `${SITE}/s/${sup.join_slug}?utm_source=qr&utm_medium=poster&utm_campaign=storefront`
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 640, color: { dark: '#04352A', light: '#FFFFFF' } })
  const qr = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  const verb = VERB[sup.industry || ''] || 'امسح وشوف صفحتنا'
  const shortUrl = `madmonacairo.com/s/${sup.join_slug}`
  return (
    <main dir="rtl" className="min-h-screen bg-[#EEEBE3] text-[#1A2E26] print:bg-white">
      <PosterActions name={sup.business_name} url={`${SITE}/s/${sup.join_slug}`} posterUrl={`${SITE}/poster/${sup.join_slug}`} />
      <div className="mx-auto max-w-[520px] px-4 py-6 print:p-0 print:max-w-none">
        <div className="bg-white rounded-[28px] print:rounded-none shadow-xl print:shadow-none p-8 text-center border border-[#E4DECE] print:border-0" style={{ aspectRatio: '1 / 1.414' }}>
          <div className="flex flex-col items-center h-full justify-between">
            <div>
              {sup.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sup.logo_url} alt={sup.business_name} className="w-24 h-24 rounded-2xl object-contain mx-auto mb-3 bg-[#FAFAF7]" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#04352A] text-white text-4xl font-black grid place-items-center mx-auto mb-3">{sup.business_name.trim()[0]}</div>
              )}
              <h1 className="text-2xl font-black leading-tight">{sup.business_name}</h1>
              {sup.city && <p className="text-sm text-gray-500 mt-1">{sup.city}</p>}
            </div>
            <div>
              <p className="text-xl font-black text-[#04352A] mb-3">{verb}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" className="w-64 h-64 mx-auto" />
              <p className="text-sm font-bold text-gray-600 mt-3" dir="ltr">{shortUrl}</p>
            </div>
            <div className="text-[11px] text-gray-500">
              <p>الأسعار والمواعيد والحجز — من موبايلك في ثانية</p>
              <p className="mt-1 font-bold text-[#04352A]">مدعوم بـ مضمونة · عندك بيزنس؟ madmonacairo.com/start</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
