'use client'

/* Owner-facing attendance device manager.
   Each employee is bound to ONE personal device for clocking (anti buddy-punch).
   Owner can see who's bound and reset a device (lost/changed phone) so the
   employee's next clock-in re-enrolls their new phone.
   Auth handled by the parent layout. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Smartphone, ChevronLeft, Loader2, RefreshCw, ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }) : '—'
const ftime = (d: string | null) => d ? new Date(d).toLocaleString('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AttendanceDevicesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('admin_list_employee_devices', { p_supplier_id: supplierId })
    setRows(data?.devices || [])
    setLoading(false)
  }
  useEffect(() => {
    (async () => {
      try { const { data } = await supabaseBrowser.auth.getUser(); setReviewer(data?.user?.id || null) } catch { /* owner-token path */ }
      load()
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  async function reset(employeeId: string, name: string) {
    if (!confirm(`reset جهاز ${name}؟ هيقدر يربط تليفون جديد أول ما يبصم تاني.`)) return
    setBusyId(employeeId)
    await rpcSafe(supabase, 'admin_reset_employee_device', { p_employee_id: employeeId, p_reviewed_by: reviewer })
    setBusyId(null); load()
  }

  const bound = rows.filter((r) => r.has_device).length

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">الحضور · مكافحة التحايل</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><Smartphone className="w-7 h-7 text-[#FA8125]" /> أجهزة البصم</h1>
              <p className="text-sm text-[#6B7280] mt-1">{bound} من {rows.length} موظف مربوطين بأجهزتهم</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        <div className="bg-[#FA8125]/8 border border-[#FA8125]/15 rounded-2xl p-4 text-[13px] text-[#1A2E26] leading-relaxed">
          كل موظف مربوط بتليفون واحد بس للبصم — مايقدرش حد يبصم لزميله. لو موظف غيّر موبايله، اعمل <span className="font-black">reset</span> وأول ما يبصم من الجديد يتربط أوتوماتيك.
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><Smartphone className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-sm text-[#6B7280]">مفيش موظفين</p></div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.employee_id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center ${r.has_device ? 'bg-[#FA8125]/10 text-[#FA8125]' : 'bg-amber-50 text-amber-600'}`}>
                    {r.has_device ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#1A2E26] truncate">{r.employee}</p>
                    {r.has_device
                      ? <p className="text-[11px] text-[#6B7280] truncate">مربوط من {fdate(r.bound_at)} · آخر بصمة {ftime(r.last_seen)}</p>
                      : <p className="text-[11px] text-amber-600">مفيش جهاز مربوط لسه — أول بصمة هتربط تليفونه</p>}
                  </div>
                </div>
                {r.has_device && (
                  <button onClick={() => reset(r.employee_id, r.employee)} disabled={busyId === r.employee_id}
                    className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-[13px] font-bold flex items-center gap-1.5 hover:bg-gray-100 disabled:opacity-50">
                    {busyId === r.employee_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} reset
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
