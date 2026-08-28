'use client'
// ============================================================================
// 💼 /admin/payroll — اقتراح مرتب الشهر
//
// (٢٧ أغسطس ٢٠٢٦) محمد: «هنربط عدد ساعات الحضور ونسبة إنجاز التاسكات
//   والسلف بالمرتب، وهيكون عندنا نسبة تانية للكوميشن… ١٠٪ من ربح مضمونة
//   على حسب كل قسم».
//
// ⚠️ ده **اقتراح للمراجعة مش صرف تلقائي**. أي غلط في معادلة على فلوس
//    الناس بيولّد مشاكل مع الفريق أصعب بكتير من دقيقة مراجعة.
//    الشاشة بتوضّح كل بند جه منين عشان المحاسب يراجع قبل ما يعتمد.
// ============================================================================
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Wallet, Loader2, RefreshCw, AlertTriangle, Info } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const money = (n: unknown) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })
const pct = (n: unknown) => `${Number(n || 0).toFixed(1)}%`

type Row = {
  employee_id: string; full_name: string; department: string | null; base_salary: number
  expected_hours: number; actual_hours: number; attendance_pct: number; base_after_attendance: number
  tasks_total: number; tasks_done: number; tasks_pct: number; tasks_adjustment: number
  commissions: number; advances_outstanding: number; advances_deduct: number
  net_amount: number; rule_source: string
}

const MADMONA = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

export default function PayrollPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr(null)
    const { data, error } = await supabase.rpc('preview_payroll' as never, {
      p_supplier_id: MADMONA, p_year: year, p_month: month,
    } as never)
    if (error) setErr(error.message)
    setRows((data as Row[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [year, month])

  const totals = rows.reduce((a, r) => ({
    base: a.base + Number(r.base_after_attendance || 0),
    comm: a.comm + Number(r.commissions || 0),
    adv: a.adv + Number(r.advances_deduct || 0),
    net: a.net + Number(r.net_amount || 0),
  }), { base: 0, comm: 0, adv: 0, net: 0 })

  // 🚩 تحذير: حضور منخفض جدًا = بيانات مشكوك فيها مش تقصير
  const lowAttendance = rows.filter((r) => Number(r.attendance_pct) < 40).length

  return (
    <div className="max-w-6xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#059669]" /> اقتراح مرتب الشهر
        </h1>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-200 rounded-xl px-2.5 py-2 text-sm font-bold">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-200 rounded-xl px-2.5 py-2 text-sm font-bold">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-[#F1EEE6] text-sm font-bold flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> حدّث
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 text-blue-900 text-xs font-bold p-3 mb-3 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>ده <b>اقتراح للمراجعة</b> — مش صرف تلقائي. راجع كل بند قبل ما تعتمد الصرف.</span>
      </div>

      {lowAttendance > 0 && (
        <div className="rounded-xl bg-amber-50 text-amber-900 text-xs font-bold p-3 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            ⚠️ فيه <b>{lowAttendance}</b> موظف حضوره أقل من ٤٠٪ — ده غالبًا بيانات ناقصة
            (جلسات بتفصل) مش غياب حقيقي. راجع سجل الحضور قبل ما تعتمد الخصم.
          </span>
        </div>
      )}

      {err && <div className="rounded-xl bg-red-50 text-red-700 text-sm font-bold p-3 mb-3">{err}</div>}

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-500 font-bold">مفيش موظفين نشطين في الشهر ده.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Stat label="إجمالي الأساسي" v={totals.base} />
            <Stat label="إجمالي العمولات" v={totals.comm} good />
            <Stat label="خصم السلف" v={totals.adv} bad />
            <Stat label="الصافي المستحق" v={totals.net} strong />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-[#F5F4F0] text-gray-600">
                <tr>
                  <Th>الموظف</Th><Th>القسم</Th><Th>الأساسي</Th>
                  <Th>الحضور</Th><Th>الأساسي بعد الحضور</Th>
                  <Th>التاسكات</Th><Th>تعديل</Th>
                  <Th>عمولات</Th><Th>سلف</Th><Th>الصافي</Th><Th>القاعدة</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employee_id} className="border-t border-gray-100">
                    <td className="px-2.5 py-2.5 font-bold text-gray-900 whitespace-nowrap">{r.full_name}</td>
                    <td className="px-2.5 py-2.5 text-gray-600 whitespace-nowrap">{r.department || '—'}</td>
                    <td className="px-2.5 py-2.5 tabular">{money(r.base_salary)}</td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap">
                      <span className={Number(r.attendance_pct) < 40 ? 'text-amber-700 font-black' : 'text-gray-700'}>
                        {pct(r.attendance_pct)}
                      </span>
                      <span className="text-gray-400"> ({money(r.actual_hours)}/{money(r.expected_hours)}س)</span>
                    </td>
                    <td className="px-2.5 py-2.5 tabular font-bold">{money(r.base_after_attendance)}</td>
                    <td className="px-2.5 py-2.5 whitespace-nowrap">{pct(r.tasks_pct)} <span className="text-gray-400">({r.tasks_done}/{r.tasks_total})</span></td>
                    <td className={`px-2.5 py-2.5 tabular ${Number(r.tasks_adjustment) < 0 ? 'text-red-600' : Number(r.tasks_adjustment) > 0 ? 'text-[#059669]' : 'text-gray-400'}`}>
                      {Number(r.tasks_adjustment) === 0 ? '—' : money(r.tasks_adjustment)}
                    </td>
                    <td className="px-2.5 py-2.5 tabular text-[#059669] font-bold">{Number(r.commissions) ? money(r.commissions) : '—'}</td>
                    <td className="px-2.5 py-2.5 tabular text-red-600">{Number(r.advances_deduct) ? '-' + money(r.advances_deduct) : '—'}</td>
                    <td className="px-2.5 py-2.5 tabular font-black text-gray-900">{money(r.net_amount)}</td>
                    <td className="px-2.5 py-2.5 text-[10px] text-gray-400 whitespace-nowrap">{r.rule_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            العمولات المعروضة هي <b>المستحقة بعد التحصيل فقط</b> — الصفقات اللي لسه ما اتحصّلتش مش بتظهر.
            لو أوردر اترجع بعد الصرف، العمولة بتترد تلقائيًا في الشهر اللي بعده.
          </p>
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">{children}</th>
}
function Stat({ label, v, good, bad, strong }: { label: string; v: number; good?: boolean; bad?: boolean; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`tabular font-black ${strong ? 'text-gray-900 text-lg' : good ? 'text-[#059669]' : bad ? 'text-red-600' : 'text-gray-800'}`}>
        {money(v)} <span className="text-[11px] font-bold text-gray-400">ج.م</span>
      </p>
    </div>
  )
}
