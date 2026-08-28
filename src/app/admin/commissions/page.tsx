'use client'
// ============================================================================
// 💰 /admin/commissions — الصورة الكاملة للعمولات
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «كنت عايز أعرف الجزء بتاع العمولة ده موجود فين؟»
//   الرؤية كانت مبعثرة: عمولة مضمونة في الأوردرات، ونسبة كل مورد مالهاش
//   شاشة تعديل، ومفيش رقم بيقول «كام دخل الشهر ده».
//
// الشاشة دي بتجمع:
//   ① إيراد مضمونة من العمولات (شهريًا)
//   ② نسبة كل مورد — وتقدر تعدّلها من هنا
//   ③ كام راح للفريق كعمولات موظفين
// ============================================================================
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Coins, Loader2, RefreshCw, Check, X, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const money = (n: unknown) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 })
const MADMONA = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

type Rev = { mo: string; orders_n: number; gross_sales: number; madmona_commission: number; supplier_payouts: number; avg_rate: number }
type Sup = {
  id: string; business_name: string; account_type: string | null; kyc_status: string
  commission_rate: number; live_listings: number; paid_orders: number
  commission_earned: number; gross_sales: number
}

export default function CommissionsPage() {
  const [rev, setRev] = useState<Rev[]>([])
  const [sups, setSups] = useState<Sup[]>([])
  const [team, setTeam] = useState<{ earned: number; pending: number }>({ earned: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('v_commission_revenue').select('*').order('mo', { ascending: false }).limit(6),
      supabase.from('v_supplier_commission').select('*').order('commission_earned', { ascending: false }),
      supabase.from('commission_entries').select('amount_egp, status').eq('supplier_id', MADMONA),
    ])
    setRev((r as Rev[]) || [])
    setSups((s as Sup[]) || [])
    const ce = (c as { amount_egp: number; status: string }[]) || []
    setTeam({
      earned: ce.filter((x) => x.status === 'earned' || x.status === 'paid').reduce((a, x) => a + Number(x.amount_egp), 0),
      pending: ce.filter((x) => x.status === 'pending').reduce((a, x) => a + Number(x.amount_egp), 0),
    })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveRate(id: string) {
    const v = Number(draft)
    if (!Number.isFinite(v) || v < 0 || v > 100) { alert('النسبة لازم تكون بين ٠ و١٠٠'); return }
    setBusy(true)
    const { error } = await supabase.rpc('set_supplier_commission' as never, { p_supplier_id: id, p_rate: v } as never)
    setBusy(false)
    if (error) { alert(error.message); return }
    setSups((list) => list.map((x) => (x.id === id ? { ...x, commission_rate: v } : x)))
    setEditing(null)
  }

  const thisMonth = rev[0]
  const totalCommission = sups.reduce((a, s) => a + Number(s.commission_earned || 0), 0)

  return (
    <div className="max-w-6xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#059669]" /> عمولات مضمونة
        </h1>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#F1EEE6] text-sm font-bold flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> حدّث
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : (
        <>
          {/* ① الأرقام الكبيرة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Stat label="عمولة الشهر ده" v={thisMonth?.madmona_commission || 0} strong />
            <Stat label="إجمالي العمولات" v={totalCommission} />
            <Stat label="راح للفريق" v={team.earned} bad />
            <Stat label="صافي لمضمونة" v={totalCommission - team.earned} good />
          </div>

          {/* ② الإيراد شهريًا */}
          <h2 className="text-sm font-black text-gray-900 mb-2">📊 الإيراد شهريًا</h2>
          {rev.length === 0 ? (
            <div className="rounded-xl bg-amber-50 text-amber-900 text-xs font-bold p-3 mb-4">
              مفيش أوردرات متحصّلة لسه — العمولة بتتحسب على الأوردرات المدفوعة فقط.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white mb-5">
              <table className="w-full text-xs">
                <thead className="bg-[#F5F4F0] text-gray-600">
                  <tr><Th>الشهر</Th><Th>أوردرات</Th><Th>إجمالي المبيعات</Th><Th>عمولة مضمونة</Th><Th>للموردين</Th><Th>متوسط النسبة</Th></tr>
                </thead>
                <tbody>
                  {rev.map((r) => (
                    <tr key={r.mo} className="border-t border-gray-100">
                      <td className="px-2.5 py-2.5 font-bold">{r.mo?.slice(0, 7)}</td>
                      <td className="px-2.5 py-2.5 tabular">{r.orders_n}</td>
                      <td className="px-2.5 py-2.5 tabular">{money(r.gross_sales)}</td>
                      <td className="px-2.5 py-2.5 tabular font-black text-[#059669]">{money(r.madmona_commission)}</td>
                      <td className="px-2.5 py-2.5 tabular text-gray-500">{money(r.supplier_payouts)}</td>
                      <td className="px-2.5 py-2.5 tabular">{r.avg_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ③ نسبة كل مورد — قابلة للتعديل */}
          <h2 className="text-sm font-black text-gray-900 mb-1">🏪 نسبة كل مورد</h2>
          <p className="text-[11px] text-gray-500 mb-2">اضغط على النسبة عشان تعدّلها — التغيير بيسري على الأوردرات الجديدة بس.</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-[#F5F4F0] text-gray-600">
                <tr><Th>المورد</Th><Th>النسبة</Th><Th>إعلانات</Th><Th>أوردرات</Th><Th>مبيعات</Th><Th>عمولة جابها</Th></tr>
              </thead>
              <tbody>
                {sups.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-2.5 py-2.5 font-bold text-gray-900">{s.business_name}</td>
                    <td className="px-2.5 py-2.5">
                      {editing === s.id ? (
                        <span className="flex items-center gap-1">
                          <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
                            className="w-16 border border-gray-300 rounded-lg px-1.5 py-1 text-xs tabular" />
                          <button onClick={() => saveRate(s.id)} disabled={busy} className="text-[#059669]"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(null)} className="text-gray-400"><X className="w-4 h-4" /></button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditing(s.id); setDraft(String(s.commission_rate)) }}
                          className="tabular font-bold text-gray-800 flex items-center gap-1 hover:text-[#059669]">
                          {s.commission_rate}% <Pencil className="w-3 h-3 opacity-40" />
                        </button>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 tabular">{s.live_listings}</td>
                    <td className="px-2.5 py-2.5 tabular">{s.paid_orders}</td>
                    <td className="px-2.5 py-2.5 tabular text-gray-500">{money(s.gross_sales)}</td>
                    <td className="px-2.5 py-2.5 tabular font-bold text-[#059669]">{money(s.commission_earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            «راح للفريق» = عمولات الموظفين المستحقة بعد التحصيل (١٠٪ من ربح مضمونة، تتقسم بين
            اللي ضاف واللي باع). التفاصيل في <b>المرتبات والعمولات</b>.
            {team.pending > 0 && <> فيه <b>{money(team.pending)} ج.م</b> عمولات لسه ما اتحصّلتش.</>}
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
