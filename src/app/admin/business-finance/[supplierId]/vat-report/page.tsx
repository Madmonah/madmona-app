'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Receipt, TrendingUp, TrendingDown, Calculator, Printer } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

export default function VATReportPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const now = new Date()
  const [supplier, setSupplier] = useState<any>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    const { data: result } = await supabase.rpc('admin_get_vat_report', {
      p_supplier_id: supplierId,
      p_month: month,
      p_year: year,
    })
    setData(result)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, month, year])

  if (!supplier) return <Loader />

  const outputVat = data?.output_vat || {}
  const inputVat = data?.input_vat || {}
  const inventoryVat = data?.inventory_vat || {}
  const totalInputVat = Number(inputVat.vat_paid || 0) + Number(inventoryVat.vat_on_purchases || 0)
  const vatPayable = Number(outputVat.vat_collected || 0) - totalInputVat

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · VAT REPORT</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">تقرير ضريبة القيمة المضافة · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">حساب VAT 14% (المعدل المصري) — للإقرار الشهري</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-sm font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> طباعة
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Period selector */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 flex-wrap items-center print:hidden">
          <p className="text-[10px] font-bold uppercase text-[#6B7280]">الفترة:</p>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-bold">
            {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-bold font-mono">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </section>

        {/* Print header (only visible in print) */}
        <div className="hidden print:block text-center mb-5">
          <h1 className="text-2xl font-black">{supplier?.business_name}</h1>
          <p className="text-sm">تقرير ضريبة القيمة المضافة — {MONTHS_AR[month - 1]} {year}</p>
        </div>

        {/* VAT Payable Hero */}
        <section className={`rounded-3xl p-6 border-2 ${vatPayable > 0 ? 'bg-amber-50 border-amber-300' : 'bg-[#FA8125]/5 border-[#FA8125]/30'}`}>
          <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280] mb-2">المستحق سدادها للمصلحة</p>
          <p className={`text-5xl font-black font-mono ${vatPayable > 0 ? 'text-amber-800' : 'text-[#FA8125]'}`}>
            {vatPayable.toLocaleString()} ج
          </p>
          <p className="text-sm text-[#6B7280] mt-2">
            = VAT المحصلة ({Number(outputVat.vat_collected || 0).toLocaleString()}) 
            − VAT المدفوعة ({totalInputVat.toLocaleString()})
          </p>
          {vatPayable > 0 ? (
            <p className="text-xs text-amber-800 mt-2 font-bold">⚠️ مستحق على الشركة</p>
          ) : (
            <p className="text-xs text-[#FA8125] mt-2 font-bold">✓ المصلحة مدينة لك (استرداد)</p>
          )}
        </section>

        {/* Output VAT (Revenue) */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FA8125]" /> VAT المحصلة (Output VAT)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KV label="إجمالي الإيرادات" value={`${Number(outputVat.total_revenue || 0).toLocaleString()} ج`} />
            <KV label="القيمة قبل الضريبة" value={`${Number(outputVat.taxable_amount || 0).toLocaleString()} ج`} />
            <KV label="VAT 14%" value={`${Number(outputVat.vat_collected || 0).toLocaleString()} ج`} highlight />
            <KV label="عدد الحجوزات" value={outputVat.bookings_count || 0} />
          </div>
        </section>

        {/* Input VAT (Expenses) */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#1A2E26]" /> VAT المدفوعة - مصاريف (Input VAT)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <KV label="إجمالي المصاريف" value={`${Number(inputVat.total_expenses || 0).toLocaleString()} ج`} />
            <KV label="القيمة قبل الضريبة" value={`${Number(inputVat.taxable_amount || 0).toLocaleString()} ج`} />
            <KV label="VAT 14%" value={`${Number(inputVat.vat_paid || 0).toLocaleString()} ج`} highlight />
            <KV label="عدد المصاريف" value={inputVat.expenses_count || 0} />
          </div>
        </section>

        {/* Inventory VAT */}
        {Number(inventoryVat.total_purchases || 0) > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#1A2E26]" /> VAT المدفوعة - مشتريات مخزون
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <KV label="إجمالي المشتريات" value={`${Number(inventoryVat.total_purchases || 0).toLocaleString()} ج`} />
              <KV label="VAT 14%" value={`${Number(inventoryVat.vat_on_purchases || 0).toLocaleString()} ج`} highlight />
            </div>
          </section>
        )}

        {/* Per branch breakdown */}
        {(data?.by_branch || []).length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-[#FAFAF7] border-b border-gray-100">
              <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">VAT حسب الفرع</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
                  <th className="text-right px-4 py-2">الفرع</th>
                  <th className="text-center px-4 py-2">الإيرادات</th>
                  <th className="text-center px-4 py-2">VAT المحصلة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.by_branch || []).map((b: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-bold text-[#1A2E26]">{b.branch}</td>
                    <td className="px-4 py-2 text-center font-mono">{Number(b.revenue || 0).toLocaleString()} ج</td>
                    <td className="px-4 py-2 text-center font-mono font-bold text-[#FA8125]">{Number(b.vat_collected || 0).toLocaleString()} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="bg-[#FAFAF7] border border-gray-200 rounded-2xl p-4 text-xs text-[#6B7280]">
          <p className="font-bold mb-1 text-[#1A2E26]">📌 ملحوظة:</p>
          <p>التقرير ده تقديري. الإقرار الرسمي محتاج المحاسب يراجعه. VAT في مصر = 14% من القيمة. الحساب: VAT = (السعر شامل الضريبة × 14) ÷ 114.</p>
        </section>
      </main>
    </div>
  )
}

function KV({ label, value, highlight }: any) {
  return (
    <div className={`p-3 rounded-xl ${highlight ? 'bg-[#FA8125]/5 border border-[#FA8125]/20' : 'bg-[#FAFAF7]'}`}>
      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">{label}</p>
      <p className={`text-lg font-black font-mono mt-1 ${highlight ? 'text-[#FA8125]' : 'text-[#1A2E26]'}`}>{value}</p>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
