import { createClient } from '@supabase/supabase-js'

// ============================================================================
// /admin/traffic — (٧ أغسطس ٢٠٢٦، طلب محمد)
// اللوج الكامل في مكان واحد: زوار الويب (site_events) + المارد على الواتساب
// + البورصة + آخر الأحداث لايف. محمي بحارس /admin في الميدلوير.
// البيانات من دالة admin_traffic_report() (service role، توقيت القاهرة).
// ============================================================================

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Report = {
  generated_at: string
  today: Record<string, number>
  daily: Array<{ day: string; web: number; wa: number }>
  top_pages: Array<{ page: string; visitors: number }>
  sources: Array<{ source: string; visitors: number }>
  devices: Array<{ device: string; visitors: number }>
  recent: Array<{ at: string; page: string; event: string; device: string; src: string }>
}

async function getReport(): Promise<Report | null> {
  try {
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data, error } = await supa.rpc('admin_traffic_report')
    if (error) return null
    return data as unknown as Report
  } catch {
    return null
  }
}

function Card({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[11px] font-bold text-gray-500">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Bar({ v, max, color }: { v: number; max: number; color: string }) {
  const w = max > 0 ? Math.max(2, Math.round((v / max) * 100)) : 2
  return <div className={`h-2 rounded-full ${color}`} style={{ width: `${w}%` }} />
}

export default async function AdminTrafficPage() {
  const r = await getReport()
  if (!r) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-8 text-center" dir="rtl">
        <p className="font-bold text-red-600">مش قادر أجيب التقرير — جرّب ريفريش</p>
      </div>
    )
  }
  const t = r.today
  const maxWeb = Math.max(...r.daily.map(d => d.web), 1)
  const maxWa = Math.max(...r.daily.map(d => d.wa), 1)
  const maxPage = Math.max(...r.top_pages.map(p => p.visitors), 1)

  const pageLabel = (p: string) => {
    if (p === '/') return '🏠 الهوم (فيها البورصة)'
    if (p.includes('marid')) return `🧞 ${p}`
    if (p.includes('real-estate')) return `📈 ${p}`
    if (p.startsWith('/marketplace')) return `🛍️ ${p}`
    if (p.startsWith('/claim')) return `🔗 ${p}`
    return p
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-16" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-900">📊 اللوج الكامل — مضمونة</h1>
            <p className="text-[11px] text-gray-500">
              ويب + مارد واتساب + بورصة · توقيت القاهرة · اتولّد {new Date(r.generated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <a href="/admin/traffic" className="text-xs font-bold text-[#04352A] bg-[#34D399] px-4 py-2 rounded-full">🔄 تحديث</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* كروت النهاردة */}
        <section>
          <h2 className="text-sm font-black text-gray-700 mb-3">النهاردة</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card label="👥 زوار الموقع" value={t.web_visitors} hint={`${t.web_sessions} جلسة · ${t.web_events} حدث`} />
            <Card label="🧞 محادثات واتساب واردة" value={t.wa_convos} hint={`${t.wa_in_msgs} رسالة واردة · ${t.wa_out_msgs} صادرة`} />
            <Card label="📈 شافوا البورصة/الهوم" value={t.borsa_web} hint={`صفحة المارد ويب: ${t.marid_web}`} />
            <Card label="🆕 إعلانات جديدة" value={t.new_listings} />
            <Card label="👤 حسابات جديدة" value={t.new_profiles} />
          </div>
        </section>

        {/* آخر 14 يوم */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-700 mb-4">آخر 14 يوم — زوار الويب 🟢 مقابل محادثات الواتساب 🟡</h2>
          <div className="space-y-2">
            {r.daily.map(d => (
              <div key={d.day} className="grid grid-cols-[70px_1fr_1fr_90px] items-center gap-3 text-[11px]">
                <span className="font-bold text-gray-500 tabular-nums">{String(d.day).slice(5, 10)}</span>
                <div className="flex items-center gap-2"><Bar v={d.web} max={maxWeb} color="bg-[#2FA084]" /><span className="tabular-nums font-bold text-gray-700 w-8">{d.web}</span></div>
                <div className="flex items-center gap-2"><Bar v={d.wa} max={maxWa} color="bg-amber-400" /><span className="tabular-nums font-bold text-gray-700 w-8">{d.wa}</span></div>
                <span className="text-gray-400">= {d.web + d.wa} إجمالي</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {/* أكتر الصفحات */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-gray-700 mb-4">أكتر الصفحات زيارة النهاردة</h2>
            <div className="space-y-2">
              {r.top_pages.map(p => (
                <div key={p.page} className="grid grid-cols-[1fr_60px_40px] items-center gap-2 text-[11px]">
                  <span className="font-bold text-gray-700 truncate" dir="ltr">{pageLabel(p.page)}</span>
                  <Bar v={p.visitors} max={maxPage} color="bg-[#34D399]" />
                  <span className="tabular-nums font-bold text-gray-500">{p.visitors}</span>
                </div>
              ))}
            </div>
          </section>

          {/* مصادر وأجهزة */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div>
              <h2 className="text-sm font-black text-gray-700 mb-3">مصادر الزيارات النهاردة</h2>
              <div className="flex flex-wrap gap-2">
                {r.sources.map(s => (
                  <span key={s.source} className="text-[11px] font-bold bg-gray-100 rounded-full px-3 py-1">
                    {s.source === 'wa' ? '🟢 واتساب' : s.source === 'fb' ? '🔵 فيسبوك' : s.source} · {s.visitors}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-700 mb-3">الأجهزة</h2>
              <div className="flex flex-wrap gap-2">
                {r.devices.map(d => (
                  <span key={d.device} className="text-[11px] font-bold bg-gray-100 rounded-full px-3 py-1">
                    {d.device === 'mobile' ? '📱 موبايل' : d.device === 'desktop' ? '💻 كمبيوتر' : d.device === 'tablet' ? '📟 تابلت' : d.device} · {d.visitors}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* آخر الأحداث لايف */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-700 mb-4">آخر 30 حدث على الموقع (لايف)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-400 font-bold text-right border-b border-gray-100">
                  <th className="py-2 pl-3">الوقت</th>
                  <th className="py-2 pl-3">الصفحة</th>
                  <th className="py-2 pl-3">الحدث</th>
                  <th className="py-2 pl-3">الجهاز</th>
                  <th className="py-2">المصدر</th>
                </tr>
              </thead>
              <tbody>
                {r.recent.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 pl-3 tabular-nums font-bold text-gray-500">{e.at}</td>
                    <td className="py-1.5 pl-3 font-bold text-gray-800 max-w-[280px] truncate" dir="ltr">{e.page}</td>
                    <td className="py-1.5 pl-3 text-gray-500">{e.event}</td>
                    <td className="py-1.5 pl-3">{e.device === 'mobile' ? '📱' : e.device === 'desktop' ? '💻' : e.device || '—'}</td>
                    <td className="py-1.5 text-gray-500">{e.src === 'wa' ? '🟢 واتساب' : e.src || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            💡 ملاحظة: الأرقام دي من التتبع الداخلي (site_events) وبتشمل كل الزوار — أعلى من فيرسل لأن مانعات الإعلانات بتحجب سكريبت فيرسل عن ~30-40% من الناس، وفيرسل مش بيشوف محادثات الواتساب أصلًا.
          </p>
        </section>
      </main>
    </div>
  )
}
