'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  LogIn, LogOut, Users, Calendar, Filter,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function AttendancePage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [view, setView] = useState<'today' | 'summary' | 'logs'>('today')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    const { data: att } = await supabase.rpc('admin_get_attendance', {
      p_supplier_id: supplierId,
      p_branch_id: branchFilter,
    })
    setData(att)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, branchFilter])

  if (!supplier) return <Loader />
  
  const today = data?.today || {}
  const logs = (data?.logs || []).filter((l: any) => l.date === new Date().toISOString().slice(0, 10))

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">B2B PARTNER · ATTENDANCE</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الحضور · {supplier?.business_name}</h1>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Today stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="حاضر اليوم" value={today.present || 0} icon={<CheckCircle2 />} tone="positive" />
          <StatCard label="غايب اليوم" value={today.absent || 0} icon={<AlertTriangle />} tone={today.absent > 5 ? 'danger' : 'warning'} />
          <StatCard label="لسه في الشغل" value={today.still_in || 0} icon={<LogIn />} primary />
          <StatCard label="ساعات اليوم" value={Math.round(today.total_hours || 0)} icon={<Clock />} />
        </section>

        {/* Branch filter */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setBranchFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              !branchFilter ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26]'
            }`}>كل الفروع</button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                branchFilter === b.id ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>{b.name}</button>
            ))}
          </div>
        </section>

        {/* View tabs */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <TabBtn active={view === 'today'} onClick={() => setView('today')}>اليوم</TabBtn>
            <TabBtn active={view === 'summary'} onClick={() => setView('summary')}>ملخص الشهر</TabBtn>
            <TabBtn active={view === 'logs'} onClick={() => setView('logs')}>سجل كامل</TabBtn>
          </div>

          {view === 'today' && (
            <div className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#6B7280]">مفيش حضور مسجل اليوم</p>
              ) : logs.map((l: any) => (
                <AttendanceRow key={l.log_id} log={l} />
              ))}
            </div>
          )}

          {view === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAF7]">
                  <tr className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
                    <th className="text-right px-4 py-3">الموظف</th>
                    <th className="text-right px-4 py-3">الفرع</th>
                    <th className="text-center px-4 py-3">أيام الحضور</th>
                    <th className="text-center px-4 py-3">ساعات الشهر</th>
                    <th className="text-center px-4 py-3">أيام تأخير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.employee_summary || []).map((e: any) => (
                    <tr key={e.employee_id}>
                      <td className="px-4 py-2">
                        <p className="font-bold text-[#1A2E26]">{e.employee_name}</p>
                        <p className="text-[10px] text-[#6B7280]">{e.role_ar}</p>
                      </td>
                      <td className="px-4 py-2 text-[#6B7280]">{e.branch_name || '—'}</td>
                      <td className="px-4 py-2 text-center font-bold">{e.days_present}</td>
                      <td className="px-4 py-2 text-center font-black text-[#059669] font-mono">{Math.round(e.total_hours || 0)}</td>
                      <td className="px-4 py-2 text-center">
                        {e.late_days > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-bold">{e.late_days}</span>
                        ) : <span className="text-[#6B7280]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'logs' && (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {(data?.logs || []).map((l: any) => (
                <AttendanceRow key={l.log_id} log={l} showDate />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function AttendanceRow({ log, showDate }: { log: any; showDate?: boolean }) {
  const inTime = log.clock_in_at ? new Date(log.clock_in_at) : null
  const outTime = log.clock_out_at ? new Date(log.clock_out_at) : null
  const isLate = log.is_late

  return (
    <div className="px-4 py-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1A2E26]">{log.employee_name}</p>
        <p className="text-[10px] text-[#6B7280]">{log.role_ar} · {log.branch_name || '—'}</p>
      </div>
      {showDate && <span className="text-xs text-[#6B7280]">{log.date}</span>}
      <div className="flex items-center gap-3 text-xs">
        {inTime && (
          <div className={`flex items-center gap-1 ${isLate ? 'text-amber-700' : 'text-[#059669]'}`}>
            <LogIn className="w-3.5 h-3.5" />
            <span className="font-bold">{inTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        {outTime ? (
          <div className="flex items-center gap-1 text-[#1A2E26]">
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-bold">{outTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ) : inTime && (
          <span className="px-2 py-0.5 rounded bg-[#34D399]/10 text-[#059669] text-[10px] font-bold">في الشغل</span>
        )}
        {log.hours_worked && (
          <span className="text-[#6B7280] font-mono">{log.hours_worked}س</span>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: any) {
  const toneClass = tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-red-600' : tone === 'positive' ? 'text-[#059669]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        <div className="w-4 h-4">{icon}</div>
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
      active ? 'bg-[#34D399]/5 text-[#059669] border-b-2 border-[#059669]' : 'text-[#6B7280] hover:text-[#1A2E26]'
    }`}>{children}</button>
  )
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>
}
