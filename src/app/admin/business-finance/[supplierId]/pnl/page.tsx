'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { TrendingUp, ChevronLeft, Loader2, RefreshCw, BarChart3 } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const num = (v: any) => Number(v) || 0
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')

type Row = { id: string; code: string; name: string; revenue: number; cost: number; profit: number; margin: number; collected: number; expenses: number; subs: number; equip: number }

export default function PnlPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: projects } = await supabase.from('bz_projects').select('id, code, name, contract_value').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    // @ts-expect-error
    const { data: certs } = await supabase.from('bz_payment_certificates').select('project_id, gross_cumulative, seq').eq('supplier_id', supplierId)
    // @ts-expect-error
    const { data: exp } = await supabase.from('bz_expenses').select('project_id, amount').eq('supplier_id', supplierId)
    // @ts-expect-error
    const { data: subs } = await supabase.from('bz_subcontractors').select('project_id, paid_to_date').eq('supplier_id', supplierId)
    // @ts-expect-error
    const { data: equip } = await supabase.from('bz_equipment').select('id, project_id').eq('supplier_id', supplierId)
    // @ts-expect-error
    const { data: eqLogs } = await supabase.from('bz_equipment_logs').select('equipment_id, cost').eq('supplier_id', supplierId)
    // @ts-expect-error
    const { data: cols } = await supabase.from('bz_collections').select('project_id, amount').eq('supplier_id', supplierId)

    const eqProject: Record<string, string | null> = {}
    ;(equip || []).forEach((e: any) => { eqProject[e.id] = e.project_id })
    const eqCostByProject: Record<string, number> = {}
    ;(eqLogs || []).forEach((l: any) => { const pid = eqProject[l.equipment_id]; if (pid) eqCostByProject[pid] = (eqCostByProject[pid] || 0) + num(l.cost) })

    const latestGross: Record<string, { seq: number; g: number }> = {}
    ;(certs || []).forEach((c: any) => { if (!c.project_id) return; const cur = latestGross[c.project_id]; if (!cur || num(c.seq) > cur.seq) latestGross[c.project_id] = { seq: num(c.seq), g: num(c.gross_cumulative) } })

    const sumBy = (arr: any[], key: string, field: string) => { const m: Record<string, number> = {}; (arr || []).forEach((x) => { if (!x[key]) return; m[x[key]] = (m[x[key]] || 0) + num(x[field]) }); return m }
    const expByP = sumBy(exp || [], 'project_id', 'amount')
    const subsByP = sumBy(subs || [], 'project_id', 'paid_to_date')
    const colsByP = sumBy(cols || [], 'project_id', 'amount')

    const result: Row[] = (projects || []).map((p: any) => {
      const revenue = latestGross[p.id]?.g || 0
      const expenses = expByP[p.id] || 0
      const subsPaid = subsByP[p.id] || 0
      const equipCost = eqCostByProject[p.id] || 0
      const cost = expenses + subsPaid + equipCost
      const profit = revenue - cost
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0
      return { id: p.id, code: p.code, name: p.name, revenue, cost, profit, margin, collected: colsByP[p.id] || 0, expenses, subs: subsPaid, equip: equipCost }
    })
    setRows(result)
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  const tRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const tCost = rows.reduce((s, r) => s + r.cost, 0)
  const tProfit = tRevenue - tCost
  const tMargin = tRevenue > 0 ? (tProfit / tRevenue) * 100 : 0
  const tCollected = rows.reduce((s, r) => s + r.collected, 0)

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">مقاولات · الربحية</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><BarChart3 className="w-7 h-7 text-[#FA8125]" /> ربحية المشاريع</h1>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="إجمالي الإيراد (أعمال منفّذة)" value={`${money0(tRevenue)} ج`} />
          <Stat label="إجمالي التكاليف" value={`${money0(tCost)} ج`} />
          <Stat label="صافي الربح" value={`${money0(tProfit)} ج`} primary />
          <Stat label="هامش الربح" value={`${tMargin.toFixed(1)}%`} />
          <Stat label="المحصّل فعليًا" value={`${money0(tCollected)} ج`} />
        </div>

        <div className="bg-[#FA8125]/5 border border-[#FA8125]/15 rounded-2xl p-4 text-xs text-[#1A2E26] leading-relaxed">
          <b>طريقة الحساب:</b> الإيراد = إجمالي الأعمال المنفّذة من آخر مستخلص لكل مشروع · التكاليف = مصروفات المشروع المباشرة + المدفوع لمقاولي الباطن + تكاليف المعدات (صيانة/سولار) · صافي الربح = الإيراد − التكاليف.
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><BarChart3 className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش مشاريع لحساب ربحيتها</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF7] border-b border-gray-100 text-right"><tr><Th>المشروع</Th><Th className="text-left">الإيراد</Th><Th className="text-left">مصروفات</Th><Th className="text-left">باطن</Th><Th className="text-left">معدات</Th><Th className="text-left">إجمالي التكلفة</Th><Th className="text-left">صافي الربح</Th><Th className="text-left">الهامش</Th><Th className="text-left">المحصّل</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#FAFAF7]/50">
                    <td className="px-3 py-2.5"><Link href={`/admin/business-finance/${supplierId}/projects/${r.id}`} className="font-bold text-[#1A2E26] hover:text-[#FA8125]">{r.name}</Link><span className="block text-[10px] text-[#6B7280] font-mono">{r.code}</span></td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#1A2E26]">{money0(r.revenue)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(r.expenses)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(r.subs)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(r.equip)}</td>
                    <td className="px-3 py-2.5 text-left font-mono text-red-600">{money0(r.cost)}</td>
                    <td className={`px-3 py-2.5 text-left font-mono font-black ${r.profit >= 0 ? 'text-[#FA8125]' : 'text-red-600'}`}>{money0(r.profit)}</td>
                    <td className={`px-3 py-2.5 text-left font-mono font-bold ${r.margin >= 0 ? 'text-[#FA8125]' : 'text-red-600'}`}>{r.margin.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-left font-mono text-[#6B7280]">{money0(r.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function Th({ children, className = '' }: { children?: ReactNode; className?: string }) { return <th className={`px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-[#6B7280] ${className}`}>{children}</th> }
function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}><p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/80' : 'text-[#6B7280]'}`}>{label}</p><p className={`text-lg md:text-2xl font-black mt-1 ${primary ? 'text-white' : 'text-[#1A2E26]'}`}>{value}</p></div>
}
