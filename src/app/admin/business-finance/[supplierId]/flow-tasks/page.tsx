'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, ClipboardList, CheckCircle2, Circle, Clock } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const DONE = new Set(['done', 'completed', 'closed'])
const PRIO_COLOR: Record<string, string> = {
  high: 'text-red-600 bg-red-50', medium: 'text-amber-700 bg-amber-50', low: 'text-[#FA8125] bg-[#FA8125]/10',
}

export default function FlowTasksPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [empMap, setEmpMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'open' | 'done'>('open')

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)

    // فروع وموظفي المورّد (daily_tasks مربوطة بالفرع/الموظف مش بالمورّد مباشرة)
    const { data: branches } = await supabase.from('supplier_branches').select('id').eq('supplier_id', supplierId)
    const { data: emps } = await supabase.from('business_employees').select('id, full_name').eq('supplier_id', supplierId)
    const branchIds = (branches || []).map((b: any) => b.id)
    const empIds = (emps || []).map((e: any) => e.id)
    const map: Record<string, string> = {}
    ;(emps || []).forEach((e: any) => { map[e.id] = e.full_name })
    setEmpMap(map)

    const rows: Record<string, any> = {}
    if (branchIds.length) {
      const { data } = await supabase.from('daily_tasks').select('*').in('branch_id', branchIds).order('task_date', { ascending: false }).limit(500)
      ;(data || []).forEach((t: any) => { rows[t.id] = t })
    }
    if (empIds.length) {
      const { data } = await supabase.from('daily_tasks').select('*').in('employee_id', empIds).order('task_date', { ascending: false }).limit(500)
      ;(data || []).forEach((t: any) => { rows[t.id] = t })
    }
    setTasks(Object.values(rows).sort((a: any, b: any) => (b.task_date || '').localeCompare(a.task_date || '')))
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function markDone(id: string) {
    await supabase.from('daily_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (!supplier) return <Loader />

  const open = tasks.filter(t => !DONE.has((t.status || '').toLowerCase()))
  const done = tasks.filter(t => DONE.has((t.status || '').toLowerCase()))
  const shown = tab === 'open' ? open : done

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · TASKS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المهام · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{open.length} مهمة مفتوحة · {done.length} تمّت</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setTab('open')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${tab === 'open' ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>مفتوحة ({open.length})</button>
            <button onClick={() => setTab('done')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${tab === 'done' ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#6B7280]'}`}>تمّت ({done.length})</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
        ) : shown.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <ClipboardList className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">{tab === 'open' ? 'مفيش مهام مفتوحة' : 'مفيش مهام متمّة'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shown.map(t => {
              const prio = (t.priority || '').toLowerCase()
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                  <button onClick={() => tab === 'open' && markDone(t.id)} className="mt-0.5 shrink-0" title="تعليم كمنجزة">
                    {tab === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-[#6B7280] hover:text-[#FA8125]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-[#1A2E26]">{t.title_ar || t.task_kind || 'مهمة'}</h3>
                      {prio && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIO_COLOR[prio] || 'text-[#6B7280] bg-[#FAFAF7]'}`}>{prio === 'high' ? 'عاجل' : prio === 'medium' ? 'متوسط' : 'عادي'}</span>}
                    </div>
                    {t.description && <p className="text-xs text-[#6B7280] mt-1">{t.description}</p>}
                    <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-3 flex-wrap">
                      {t.task_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(t.task_date).toLocaleDateString('ar-EG')}{t.due_time ? ` · ${t.due_time}` : ''}</span>}
                      {t.employee_id && empMap[t.employee_id] && <span>👤 {empMap[t.employee_id]}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
