'use client'

/* Owner-facing approvals for employee self-service requests (leave + advances).
   Lists pending items for this supplier and lets the owner approve/reject.
   - Approving an advance books the cash-out once (admin_approve_advance_request).
   - Approving leave deducts from the right balance bucket (admin_approve_leave_request).
   Auth is handled by the parent layout (owner token OR Madmona platform admin). */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { ClipboardCheck, ChevronLeft, Loader2, RefreshCw, CalendarDays, Wallet, Check, X, Inbox } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const money0 = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const fdate = (d: string | null) => d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const leaveTypeAr = (t: string) => t === 'annual' ? 'سنوية' : t === 'casual' ? 'عارضة' : t === 'sick' ? 'مرضية' : t

export default function RequestsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [leave, setLeave] = useState<any[]>([])
  const [advances, setAdvances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_list_pending_requests', { p_supplier_id: supplierId })
    setLeave(data?.leave || [])
    setAdvances(data?.advances || [])
    setLoading(false)
  }
  useEffect(() => {
    (async () => {
      try { const { data } = await supabaseBrowser.auth.getUser(); setReviewer(data?.user?.id || null) } catch { /* owner-token path: no auth uid */ }
      load()
    })()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [supplierId])

  async function decideLeave(id: string, approve: boolean) {
    setBusyId(id)
    await rpcSafe(supabase, 'admin_approve_leave_request', { p_request_id: id, p_approve: approve, p_reviewed_by: reviewer })
    setBusyId(null); load()
  }
  async function decideAdvance(id: string, approve: boolean) {
    setBusyId(id)
    await rpcSafe(supabase, 'admin_approve_advance_request', { p_request_id: id, p_approve: approve, p_recorded_by: reviewer })
    setBusyId(null); load()
  }

  const total = leave.length + advances.length

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">الموارد البشرية</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] flex items-center gap-2"><ClipboardCheck className="w-7 h-7 text-[#FA8125]" /> طلبات الموظفين</h1>
              <p className="text-sm text-[#6B7280] mt-1">{total} طلب في انتظار ردّك</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26]"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {total === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Inbox className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm text-[#6B7280]">مفيش طلبات معلّقة دلوقتي 👌</p>
          </div>
        )}

        {/* Leave requests */}
        {leave.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-[#FA8125]" /> إجازات ({leave.length})</h2>
            <div className="space-y-2">
              {leave.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-black text-[#1A2E26]">{r.employee}</p>
                      <p className="text-[13px] text-[#6B7280] mt-0.5">إجازة {leaveTypeAr(r.type)} · {r.days} يوم</p>
                      <p className="text-[12px] text-[#6B7280] mt-0.5 font-mono" dir="ltr">{fdate(r.start)} → {fdate(r.end)}</p>
                      {r.reason && <p className="text-[12px] text-[#1A2E26] mt-1">السبب: {r.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => decideLeave(r.id, true)} disabled={busyId === r.id} className="px-3 py-2 rounded-xl bg-[#FA8125] text-white text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} قبول</button>
                      <button onClick={() => decideLeave(r.id, false)} disabled={busyId === r.id} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50"><X className="w-4 h-4" /> رفض</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Advance requests */}
        {advances.length > 0 && (
          <section>
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#6B7280] mb-3 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-[#FA8125]" /> سُلف ({advances.length})</h2>
            <div className="space-y-2">
              {advances.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-black text-[#1A2E26]">{r.employee}</p>
                      <p className="text-[15px] font-black text-[#FA8125] mt-0.5" dir="ltr">{money0(r.amount)} ج</p>
                      {r.reason && <p className="text-[12px] text-[#1A2E26] mt-1">السبب: {r.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => decideAdvance(r.id, true)} disabled={busyId === r.id} className="px-3 py-2 rounded-xl bg-[#FA8125] text-white text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} قبول وصرف</button>
                      <button onClick={() => decideAdvance(r.id, false)} disabled={busyId === r.id} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50"><X className="w-4 h-4" /> رفض</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-2 inline-block">القبول هيسجّل صرف كاش في حسابات الشركة</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
