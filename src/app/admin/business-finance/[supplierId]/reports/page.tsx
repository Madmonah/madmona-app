'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, Download, FileSpreadsheet, DollarSign, Users, Receipt, Package, Calendar } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

// Convert array of objects to CSV with BOM for Arabic Excel support
function toCSV(rows: any[], headers: { key: string; label: string }[]): string {
  const headerLine = headers.map(h => `"${h.label}"`).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h.key]
      if (val === null || val === undefined) return '""'
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )
  return '\uFEFF' + [headerLine, ...dataLines].join('\n')  // BOM for Arabic
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const now = new Date()
  const [supplier, setSupplier] = useState<any>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      // @ts-expect-error
      const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
      setSupplier(s)
    })()
  }, [supplierId])

  function periodRange() {
    const from = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const to = new Date(year, month, 0).toISOString().slice(0, 10)
    return { from, to }
  }

  async function exportEmployees() {
    setExporting('employees')
    // @ts-expect-error
    const { data } = await supabase.from('business_employees')
      .select('full_name, role_ar, pin_code, salary_egp, status, supplier_branches(name)')
      .eq('supplier_id', supplierId)
      .order('salary_egp', { ascending: false })
    const rows = (data || []).map((e: any) => ({
      name: e.full_name, role: e.role_ar, pin: e.pin_code,
      salary: e.salary_egp, branch: e.supplier_branches?.name || '', status: e.status,
    }))
    downloadCSV(toCSV(rows, [
      { key: 'name', label: 'الاسم' }, { key: 'role', label: 'الوظيفة' },
      { key: 'pin', label: 'PIN' }, { key: 'salary', label: 'المرتب' },
      { key: 'branch', label: 'الفرع' }, { key: 'status', label: 'الحالة' },
    ]), `موظفين_${supplier?.business_name}_${Date.now()}.csv`)
    setExporting(null)
  }

  async function exportExpenses() {
    setExporting('expenses')
    const { from, to } = periodRange()
    // @ts-expect-error
    const { data } = await supabase.from('branch_expenses')
      .select('expense_date, category, amount_egp, payment_method, vendor_name, notes, supplier_branches(name)')
      .eq('supplier_id', supplierId)
      .gte('expense_date', from).lte('expense_date', to)
      .order('expense_date', { ascending: false })
    const rows = (data || []).map((e: any) => ({
      date: e.expense_date, category: e.category, amount: e.amount_egp,
      method: e.payment_method, vendor: e.vendor_name || '', branch: e.supplier_branches?.name || '', notes: e.notes || '',
    }))
    downloadCSV(toCSV(rows, [
      { key: 'date', label: 'التاريخ' }, { key: 'category', label: 'الفئة' },
      { key: 'amount', label: 'المبلغ' }, { key: 'method', label: 'الدفع' },
      { key: 'vendor', label: 'المورد' }, { key: 'branch', label: 'الفرع' }, { key: 'notes', label: 'ملاحظات' },
    ]), `مصاريف_${MONTHS_AR[month-1]}_${year}.csv`)
    setExporting(null)
  }

  async function exportBookings() {
    setExporting('bookings')
    const { from, to } = periodRange()
    // @ts-expect-error
    const { data } = await supabase.from('branch_bookings')
      .select('scheduled_at, customer_name, customer_phone, service_name_snapshot, price_egp, status, supplier_branches(name)')
      .eq('supplier_id', supplierId)
      .gte('scheduled_at', from).lte('scheduled_at', to + 'T23:59:59')
      .order('scheduled_at', { ascending: false })
    const rows = (data || []).map((b: any) => ({
      date: new Date(b.scheduled_at).toLocaleString('ar-EG'),
      customer: b.customer_name || '', phone: b.customer_phone || '',
      service: b.service_name_snapshot || '', price: b.price_egp, status: b.status,
      branch: b.supplier_branches?.name || '',
    }))
    downloadCSV(toCSV(rows, [
      { key: 'date', label: 'الموعد' }, { key: 'customer', label: 'العميل' },
      { key: 'phone', label: 'الموبايل' }, { key: 'service', label: 'الخدمة' },
      { key: 'price', label: 'السعر' }, { key: 'status', label: 'الحالة' }, { key: 'branch', label: 'الفرع' },
    ]), `حجوزات_${MONTHS_AR[month-1]}_${year}.csv`)
    setExporting(null)
  }

  async function exportInventory() {
    setExporting('inventory')
    // @ts-expect-error
    const { data } = await supabase.from('inventory_products')
      .select('name_ar, category, current_stock, cost_price_egp, selling_price_egp, reorder_threshold')
      .eq('supplier_id', supplierId)
      .order('name_ar')
    const rows = (data || []).map((p: any) => ({
      name: p.name_ar, category: p.category, stock: p.current_stock,
      cost: p.cost_price_egp, price: p.selling_price_egp,
      value: (p.current_stock * (p.cost_price_egp || 0)).toFixed(2), reorder: p.reorder_threshold,
    }))
    downloadCSV(toCSV(rows, [
      { key: 'name', label: 'المنتج' }, { key: 'category', label: 'الفئة' },
      { key: 'stock', label: 'المخزون' }, { key: 'cost', label: 'التكلفة' },
      { key: 'price', label: 'سعر البيع' }, { key: 'value', label: 'قيمة المخزون' }, { key: 'reorder', label: 'حد إعادة الطلب' },
    ]), `مخزون_${supplier?.business_name}_${Date.now()}.csv`)
    setExporting(null)
  }

  async function exportCustomers() {
    setExporting('customers')
    // @ts-expect-error
    const { data } = await supabase.from('customers')
      .select('full_name, phone, customer_tier, total_visits, total_spent_egp, loyalty_points')
      .eq('supplier_id', supplierId)
      .order('total_spent_egp', { ascending: false })
    const rows = (data || []).map((c: any) => ({
      name: c.full_name, phone: c.phone || '', tier: c.customer_tier,
      visits: c.total_visits, spent: c.total_spent_egp, points: c.loyalty_points,
    }))
    downloadCSV(toCSV(rows, [
      { key: 'name', label: 'الاسم' }, { key: 'phone', label: 'الموبايل' },
      { key: 'tier', label: 'التصنيف' }, { key: 'visits', label: 'الزيارات' },
      { key: 'spent', label: 'إجمالي الصرف' }, { key: 'points', label: 'نقاط الولاء' },
    ]), `عملاء_${supplier?.business_name}_${Date.now()}.csv`)
    setExporting(null)
  }

  if (!supplier) return <Loader />

  const reports = [
    { id: 'employees', label: 'الموظفين والمرتبات', desc: 'كل الموظفين + مرتباتهم + فروعهم', icon: <Users />, action: exportEmployees, hasPeriod: false },
    { id: 'expenses', label: 'المصاريف', desc: 'مصاريف الشهر المحدد', icon: <DollarSign />, action: exportExpenses, hasPeriod: true },
    { id: 'bookings', label: 'الحجوزات', desc: 'حجوزات الشهر المحدد', icon: <Calendar />, action: exportBookings, hasPeriod: true },
    { id: 'inventory', label: 'المخزون', desc: 'كل المنتجات + قيمتها', icon: <Package />, action: exportInventory, hasPeriod: false },
    { id: 'customers', label: 'العملاء', desc: 'قاعدة العملاء كاملة', icon: <Receipt />, action: exportCustomers, hasPeriod: false },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · REPORTS EXPORT</p>
            <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">تصدير التقارير · {supplier?.business_name}</h1>
            <p className="text-sm text-[#6B7280] mt-1">صدّر بياناتك Excel/CSV — يفتح في Excel و Google Sheets بالعربي</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Period for time-based reports */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 flex-wrap items-center">
          <p className="text-[10px] font-bold uppercase text-[#6B7280]">الفترة (للمصاريف والحجوزات):</p>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-bold">
            {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-bold font-mono">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center"><div className="w-5 h-5">{r.icon}</div></div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-[#1A2E26]">{r.label}</h3>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{r.desc}</p>
                </div>
              </div>
              {r.hasPeriod && <p className="text-[10px] text-[#FA8125] font-bold mb-2">📅 {MONTHS_AR[month-1]} {year}</p>}
              <button onClick={r.action} disabled={exporting === r.id} className="w-full py-2.5 rounded-xl bg-[#FA8125] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {exporting === r.id ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التصدير...</> : <><Download className="w-4 h-4" /> تصدير CSV</>}
              </button>
            </div>
          ))}
        </section>

        <section className="bg-[#FA8125]/5 border border-[#FA8125]/20 rounded-2xl p-4 text-xs text-[#1A2E26]">
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#FA8125] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">📊 الملفات بـ صيغة CSV:</p>
              <p className="text-[#6B7280]">تفتح مباشرة في Microsoft Excel و Google Sheets و Numbers. النصوص العربية بـ تظهر صح (UTF-8 BOM). تقدر تطبعها أو تبعتها للمحاسب.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
