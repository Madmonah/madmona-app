'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, FileText, Filter, User, Edit3, Trash2, Plus } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TABLES = [
  { value: null, label: 'الكل' },
  { value: 'branch_expenses', label: 'مصاريف' },
  { value: 'payroll_runs', label: 'مرتبات' },
  { value: 'employee_advances', label: 'سلف' },
  { value: 'cash_reconciliations', label: 'جرد كاش' },
]

const ACTION_LABELS: Record<string, { label: string; icon: any; cls: string }> = {
  insert: { label: 'إضافة', icon: Plus, cls: 'text-[#1F6F5F]' },
  update: { label: 'تعديل', icon: Edit3, cls: 'text-amber-700' },
  delete: { label: 'حذف', icon: Trash2, cls: 'text-red-600' },
}

const TABLE_LABELS: Record<string, string> = {
  branch_expenses: 'مصاريف',
  payroll_runs: 'مرتبات',
  employee_advances: 'سلف',
  cash_reconciliations: 'جرد كاش',
}

export default function AuditLogPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [tableFilter, setTableFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_get_audit_log', { p_table_name: tableFilter })
    setLogs(list || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, tableFilter])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · AUDIT LOG</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">سجل التعديلات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">آخر 7 أيام · {logs.length} حركة</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            {TABLES.map(t => (
              <button key={t.value || 'all'} onClick={() => setTableFilter(t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                tableFilter === t.value ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>{t.label}</button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">مفيش حركات مسجلة</p>
              </div>
            ) : logs.map((l: any) => {
              const action = ACTION_LABELS[l.action] || { label: l.action, icon: FileText, cls: 'text-[#6B7280]' }
              const Icon = action.icon
              const dt = new Date(l.created_at)
              return (
                <div key={l.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                  <div className="col-span-1"><Icon className={`w-4 h-4 ${action.cls}`} /></div>
                  <div className="col-span-2">
                    <p className={`font-bold ${action.cls}`}>{action.label}</p>
                    <p className="text-[10px] text-[#6B7280]">{TABLE_LABELS[l.table_name] || l.table_name}</p>
                  </div>
                  <div className="col-span-4 text-xs text-[#1A2E26]">
                    {l.changed_fields && l.changed_fields.length > 0 && (
                      <p>تعدلت: {l.changed_fields.join('، ')}</p>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center gap-2 text-xs text-[#6B7280]">
                    <User className="w-3 h-3" />
                    <span className="truncate">{l.user_name || 'النظام'}</span>
                  </div>
                  <div className="col-span-2 text-left text-xs text-[#6B7280] font-mono">
                    {dt.toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
