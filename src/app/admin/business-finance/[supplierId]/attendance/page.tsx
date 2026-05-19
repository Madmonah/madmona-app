'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, ShieldCheck, ShieldAlert, MapPin, Clock,
  LogIn, LogOut, AlertTriangle, Navigation, Filter,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/attendance
   
   Audit dashboard for Mohamed + Ahmed:
   - All clock-in/out events
   - GPS distance from branch
   - Flagged: no_gps, edge_clock_in, far_clock_in
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Audit = {
  log_id: string
  date: string
  employee_id: string
  full_name: string
  role_ar: string
  branch_id: string | null
  branch_name: string | null
  branch_code: string | null
  clock_in_at: string | null
  clock_out_at: string | null
  hours_worked: number | null
  clock_in_distance_m: number | null
  clock_out_distance_m: number | null
  clock_in_flag: 'normal' | 'edge_clock_in' | 'far_clock_in' | 'no_gps'
  clock_in_method: string
}

export default function AttendanceAuditPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplierName, setSupplierName] = useState('')
  const [logs, setLogs] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'flagged'>('all')
  const [days, setDays] = useState(7)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: sup } = await supabase.from('suppliers')
      .select('business_name').eq('id', supplierId).single()
    setSupplierName((sup as any)?.business_name || '')

    // @ts-expect-error
    const { data } = await supabase.rpc('admin_get_attendance_audit', {
      p_supplier_id: supplierId, p_days: days,
    })
    setLogs((data || []) as Audit[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId, days])

  const filtered = useMemo(() => {
    if (filter === 'flagged') return logs.filter((l) => l.clock_in_flag !== 'normal')
    return logs
  }, [logs, filter])

  const stats = useMemo(() => {
    return {
      total: logs.length,
      normal: logs.filter((l) => l.clock_in_flag === 'normal').length,
      edge: logs.filter((l) => l.clock_in_flag === 'edge_clock_in').length,
      far: logs.filter((l) => l.clock_in_flag === 'far_clock_in').length,
      noGps: logs.filter((l) => l.clock_in_flag === 'no_gps').length,
    }
  }, [logs])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}/team`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للفريق
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
            ATTENDANCE AUDIT · GPS VERIFIED
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            حضور وانصراف — {supplierName}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            كل تسجيل بـ GPS موقع — المريبة بـ تظهر باللون الأحمر
          </p>

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200">
              {[
                { v: 'all' as const, l: 'كل الكلوكس' },
                { v: 'flagged' as const, l: '🚩 المريبة فقط' },
              ].map((f) => (
                <button
                  key={f.v} onClick={() => setFilter(f.v)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filter === f.v ? 'bg-[#1F6F5F] text-white' : 'text-[#6B7280]'
                  }`}
                >{f.l}</button>
              ))}
            </div>
            <select
              value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[#1A2E26]"
            >
              <option value={1}>اليوم</option>
              <option value={3}>آخر ٣ أيام</option>
              <option value={7}>الأسبوع</option>
              <option value={30}>الشهر</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="إجمالي الكلوكس" value={stats.total} icon={<Clock className="w-4 h-4" />} primary />
          <StatCard label="✅ عادي (داخل النطاق)" value={stats.normal} icon={<ShieldCheck className="w-4 h-4" />} tone="positive" />
          <StatCard label="⚠️ على الحدود" value={stats.edge} icon={<MapPin className="w-4 h-4" />} tone={stats.edge > 0 ? 'amber' : 'neutral'} />
          <StatCard label="🚩 مريب (بعيد / مفيش GPS)" value={stats.far + stats.noGps} icon={<ShieldAlert className="w-4 h-4" />} tone={(stats.far + stats.noGps) > 0 ? 'negative' : 'neutral'} />
        </section>

        {/* Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
            <Clock className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <h3 className="text-lg font-black text-[#1A2E26] mb-1">
              {filter === 'flagged' ? 'مفيش كلوكس مريبة 👌' : 'لسه ما فيش حضور النهارده'}
            </h3>
            <p className="text-sm text-[#6B7280]">
              {filter === 'flagged' ? 'كل الموظفين سجلوا من جوه الفرع' : 'لما حد يـ scan هـ يظهر هنا'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => <AuditRow key={log.log_id} log={log} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: any) {
  const t = tone === 'positive' ? 'text-[#1F6F5F]'
    : tone === 'negative' ? 'text-red-600'
    : tone === 'amber' ? 'text-amber-600'
    : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#1F6F5F] border-[#1F6F5F] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : t}`}>{value}</p>
    </div>
  )
}

function AuditRow({ log }: { log: Audit }) {
  const isFlagged = log.clock_in_flag !== 'normal'
  const flagLabel = {
    normal: '',
    edge_clock_in: '⚠️ على الحدود',
    far_clock_in: '🚩 بعيد عن الفرع',
    no_gps: '❓ بدون GPS',
  }[log.clock_in_flag]
  const flagColor = {
    normal: '',
    edge_clock_in: 'border-amber-200 bg-amber-50/40',
    far_clock_in: 'border-red-200 bg-red-50/40',
    no_gps: 'border-gray-300 bg-gray-50',
  }[log.clock_in_flag]

  const day = new Date(log.date).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })
  const ti = log.clock_in_at ? new Date(log.clock_in_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'
  const to = log.clock_out_at ? new Date(log.clock_out_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className={`bg-white rounded-2xl border p-4 ${isFlagged ? flagColor : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Employee */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="inline-grid place-items-center w-10 h-10 rounded-xl bg-[#FAFAF7] text-[#1F6F5F] flex-shrink-0 font-black text-sm">
            {log.full_name?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[#1A2E26] truncate">{log.full_name}</h3>
            <p className="text-[11px] text-[#6B7280]">{log.role_ar} · {log.branch_name || log.branch_code}</p>
          </div>
        </div>

        {/* Times */}
        <div className="flex items-center gap-4 text-xs flex-shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1">
              <LogIn className="w-3 h-3" /> دخل
            </p>
            <p className="font-mono font-bold text-[#1A2E26]">{ti}</p>
            {log.clock_in_distance_m !== null && (
              <p className={`text-[10px] mt-0.5 ${
                log.clock_in_flag === 'far_clock_in' ? 'text-red-600 font-bold'
                : log.clock_in_flag === 'edge_clock_in' ? 'text-amber-600'
                : 'text-[#6B7280]'
              }`}>
                <MapPin className="w-2.5 h-2.5 inline" /> {Math.round(log.clock_in_distance_m)}م
              </p>
            )}
            {log.clock_in_distance_m === null && (
              <p className="text-[10px] mt-0.5 text-gray-500">بدون GPS</p>
            )}
          </div>

          <div className="text-center">
            <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1">
              <LogOut className="w-3 h-3" /> خرج
            </p>
            <p className="font-mono font-bold text-[#1A2E26]">{to}</p>
            {log.clock_out_distance_m !== null && (
              <p className="text-[10px] mt-0.5 text-[#6B7280]">
                <MapPin className="w-2.5 h-2.5 inline" /> {Math.round(log.clock_out_distance_m)}م
              </p>
            )}
          </div>

          {log.hours_worked && (
            <div className="text-center">
              <p className="text-[10px] text-[#6B7280]">إجمالي</p>
              <p className="font-mono font-bold text-[#1F6F5F]">{log.hours_worked}س</p>
            </div>
          )}

          <div className="text-left text-[10px] text-[#6B7280] min-w-[60px]">{day}</div>
        </div>
      </div>

      {flagLabel && (
        <div className="mt-2 pt-2 border-t border-current/10 text-[11px] font-bold text-[#1A2E26]">
          {flagLabel} — راجع التسجيل ده مع الموظف
        </div>
      )}
    </div>
  )
}
