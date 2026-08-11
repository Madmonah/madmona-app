'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Lock, Unlock, CreditCard, AlertTriangle, Search } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('admin_list_subscriptions')
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function suspend(id: string, name: string) {
    const reason = window.prompt(`سبب إيقاف "${name}"؟ (اختياري)`, 'اشتراك متأخر')
    if (reason === null) return
    setBusy(id)
    // @ts-expect-error rpc typing
    const { error } = await supabase.rpc('admin_suspend_supplier', { p_supplier_id: id, p_reason: reason || null })
    setBusy(null)
    if (error) return alert('فشل الإيقاف: ' + error.message)
    load()
  }

  async function reactivate(id: string, name: string) {
    const paid = window.prompt(`إعادة تفعيل "${name}". تاريخ السداد لحد امتى؟ (YYYY-MM-DD اختياري)`, '')
    if (paid === null) return
    setBusy(id)
    // @ts-expect-error rpc typing
    const { error } = await supabase.rpc('admin_reactivate_supplier', { p_supplier_id: id, p_paid_until: paid || null })
    setBusy(null)
    if (error) return alert('فشل التفعيل: ' + error.message)
    load()
  }

  const filtered = rows.filter(r => !q || (r.business_name || '').toLowerCase().includes(q.toLowerCase()))
  const suspended = rows.filter(r => r.subscription_status === 'suspended')

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin/business-partners" className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للشركاء
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">ADMIN · SUBSCRIPTIONS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">إدارة الاشتراكات</h1>
              <p className="text-sm text-[#6B7280] mt-1">{rows.length} حساب B2B · {suspended.length} موقوف</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="mt-3 relative max-w-xs">
            <Search className="w-4 h-4 text-[#6B7280] absolute right-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث باسم الحساب..." className="w-full pr-9 pl-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const isSusp = r.subscription_status === 'suspended'
              return (
                <div key={r.supplier_id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 flex-wrap ${isSusp ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-[#1A2E26]">{r.business_name}</h3>
                      {isSusp
                        ? <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" /> موقوف</span>
                        : <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">نشط</span>}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-3 flex-wrap">
                      {r.paid_until && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> مسدّد لحد {r.paid_until}</span>}
                      {isSusp && r.suspended_reason && <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" /> {r.suspended_reason}</span>}
                      <Link href={`/admin/business-finance/${r.supplier_id}`} className="text-[#2B4521] font-bold">فتح اللوحة ↗</Link>
                    </div>
                  </div>
                  {isSusp ? (
                    <button onClick={() => reactivate(r.supplier_id, r.business_name)} disabled={busy === r.supplier_id} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                      {busy === r.supplier_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} تفعيل
                    </button>
                  ) : (
                    <button onClick={() => suspend(r.supplier_id, r.business_name)} disabled={busy === r.supplier_id} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                      {busy === r.supplier_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} قفل
                    </button>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && <div className="py-12 text-center bg-white rounded-2xl border border-gray-100 text-sm font-bold text-[#1A2E26]">مفيش نتائج</div>}
          </div>
        )}
      </main>
    </div>
  )
}
