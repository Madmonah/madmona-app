// ============================================================================
// 🖨️ /admin/posters — قايمة كل بيزنس ببوستره ورسالة واتساب جاهزة لصاحبه (١٠ سبتمبر ٢٠٢٦)
//
// الفريق بيبعت الرسالة بإيده (زرار wa.me — مفيش إرسال من السيرفر، قاعدة ثابتة) لصاحب كل بيزنس
// عندنا: «صفحتك جاهزة — ده الـQR اطبعه على الكاشير/الترابيزة». كل QR اتعلّق = زوار كل يوم.
// محمد (١٠/٩): «عايز حل للانتشار… شوفلي ثغرة» — الثغرة إن ٣١٤ بيزنس هما شبكة التوزيع بتاعتنا.
// ============================================================================
import { platformAdminDb } from '@/lib/platformAdmin'

export const dynamic = 'force-dynamic'
const SITE = 'https://www.madmonacairo.com'

type Row = { id: string; business_name: string; contact_phone: string | null; industry: string | null; city: string | null; join_slug: string; created_at: string }

export default async function PostersAdminPage({ searchParams }: { searchParams?: { q?: string; ind?: string } }) {
  const db = platformAdminDb()
  let q = db.from('suppliers').select('id, business_name, contact_phone, industry, city, join_slug, created_at')
    .eq('status', 'approved').not('join_slug', 'is', null).order('created_at', { ascending: false }).limit(400)
  if (searchParams?.ind) q = q.eq('industry', searchParams.ind)
  const { data } = await q
  const rows = ((data || []) as Row[]).filter((r) => !searchParams?.q || r.business_name.includes(searchParams.q))
  const msg = (r: Row) => encodeURIComponent(`أهلًا ${r.business_name} 👋\nصفحتكم على مضمونة جاهزة: ${SITE}/s/${r.join_slug}\nده بوستر QR جاهز للطباعة — اطبعوه وعلّقوه على الكاشير أو الترابيزة وعملاءكم يفتحوا الأسعار والحجز من موبايلهم:\n${SITE}/poster/${r.join_slug}\nولو حابين تشاركوا الصفحة على واتساب، الزرار موجود في نفس اللينك.`)
  const wa = (p: string | null) => { const d = (p || '').replace(/\D/g, ''); if (!d) return null; return d.startsWith('20') ? d : d.startsWith('0') ? '2' + d : d.length === 10 ? '20' + d : d }
  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26] p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-black mb-1">🖨️ بوسترات QR — {rows.length} بيزنس</h1>
        <p className="text-xs text-gray-500 mb-4">ابعت لصاحب البيزنس رسالته بإيدك (زرار واتساب) — الرسالة فيها صفحته وبوستره. كل بوستر اتعلّق = زوار كل يوم.</p>
        <form className="flex gap-2 mb-4">
          <input name="q" defaultValue={searchParams?.q || ''} placeholder="ابحث بالاسم" className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white" />
          <select name="ind" defaultValue={searchParams?.ind || ''} className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white">
            <option value="">كل الأنشطة</option>
            {['restaurant', 'clinic', 'beauty_salon', 'spa', 'gym', 'retail_shop', 'vehicle_agency', 'contracting', 'real_estate', 'other'].map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <button className="rounded-xl bg-[#04352A] text-white px-4 py-2 text-sm font-bold">فلتر</button>
        </form>
        <div className="space-y-2">
          {rows.map((r) => {
            const p = wa(r.contact_phone)
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-sm">{r.business_name}</p>
                  <p className="text-[11px] text-gray-500">{r.industry || '—'} · {r.city || '—'} · <span dir="ltr">{r.contact_phone || 'بدون رقم'}</span></p>
                </div>
                <a href={`/poster/${r.join_slug}`} target="_blank" className="text-xs font-bold text-[#059669] border border-[#059669]/30 rounded-xl px-3 py-2 no-underline">البوستر</a>
                <a href={`/s/${r.join_slug}`} target="_blank" className="text-xs font-bold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 no-underline">الصفحة</a>
                {p ? <a href={`https://wa.me/${p}?text=${msg(r)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-white bg-[#25D366] rounded-xl px-3 py-2 no-underline">ابعت له واتساب</a> : <span className="text-[11px] text-gray-400">مفيش رقم</span>}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
