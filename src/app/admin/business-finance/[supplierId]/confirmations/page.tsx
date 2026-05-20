'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, RefreshCw, Gift, ShoppingCart, UserPlus,
  Check, X, Phone, Wallet, Building2, CheckCircle2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const fmt = (n: any) => Number(n || 0).toLocaleString('ar-EG')
const localPhone = (p: string) => (p ? '0' + String(p).slice(-10) : '')

export default function ConfirmationsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [tips, setTips] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [joins, setJoins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)

  const load = useCallback(async () => {
    setLoading(true)
    const t = token()
    if (!t) { setLoading(false); return }
    const [tp, od, jn] = await Promise.all([
      // @ts-expect-error rpc typing
      supabase.rpc('admin_list_pending_tips', { p_token: t, p_supplier_id: supplierId }),
      // @ts-expect-error rpc typing
      supabase.rpc('admin_list_pending_orders', { p_token: t, p_supplier_id: supplierId }),
      // @ts-expect-error rpc typing
      supabase.rpc('admin_list_employee_join_requests', { p_token: t, p_supplier_id: supplierId }),
    ])
    setTips(tp.data?.ok ? tp.data.tips : [])
    setOrders(od.data?.ok ? od.data.orders : [])
    setJoins(jn.data?.ok ? jn.data.requests : [])
    setLoading(false)
  }, [supplierId])

  useEffect(() => { load() }, [load])

  async function confirmTip(id: string, approve: boolean) {
    setBusy('tip-' + id)
    // @ts-expect-error rpc typing
    await supabase.rpc('admin_confirm_tip', { p_token: token(), p_tip_id: id, p_approve: approve })
    await load(); setBusy(null)
  }
  async function confirmOrder(id: string, approve: boolean) {
    setBusy('order-' + id)
    // @ts-expect-error rpc typing
    await supabase.rpc('admin_confirm_order', { p_token: token(), p_order_id: id, p_approve: approve })
    await load(); setBusy(null)
  }
  async function reviewJoin(id: string, action: 'approve' | 'reject') {
    setBusy('join-' + id)
    // @ts-expect-error rpc typing
    await supabase.rpc('admin_review_employee_join', { p_token: token(), p_request_id: id, p_action: action })
    await load(); setBusy(null)
  }

  const totalPending = tips.length + orders.length + joins.length

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · CONFIRMATIONS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">التأكيدات</h1>
              <p className="text-sm text-[#6B7280] mt-1">{totalPending} حاجة بانتظار التأكيد</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-7 h-7 text-[#1F6F5F] animate-spin inline" /></div>
        ) : totalPending === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#1F6F5F] opacity-40 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش حاجة بانتظار التأكيد</p>
            <p className="text-xs text-[#6B7280] mt-1">كله متظبط 👌</p>
          </div>
        ) : (
          <>
            {/* TIPS */}
            <Section icon={<Gift className="w-4 h-4" />} title="بقشيش بانتظار التأكيد" count={tips.length}>
              {tips.map((t) => (
                <Card key={t.id}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26]">{fmt(t.amount)} ج · لـ {t.employee}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" /> {t.method === 'instapay' ? 'إنستاباي' : 'كاش'}</span>
                      {t.branch && <span>· {t.branch}</span>}
                      {t.customer_name && <span>· {t.customer_name}</span>}
                    </p>
                  </div>
                  <Actions
                    busy={busy === 'tip-' + t.id}
                    onYes={() => confirmTip(t.id, true)} yesLabel="أكّد الاستلام"
                    onNo={() => confirmTip(t.id, false)}
                  />
                </Card>
              ))}
            </Section>

            {/* ORDERS */}
            <Section icon={<ShoppingCart className="w-4 h-4" />} title="طلبات منتجات" count={orders.length}>
              {orders.map((o) => (
                <Card key={o.id}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26]">{fmt(o.total)} ج · {o.customer_name || 'عميل'}</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {(o.items || []).map((it: any) => `${it.name} ×${it.qty}`).join(' · ')}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> <span dir="ltr">{localPhone(o.customer_phone)}</span> · {o.method === 'instapay' ? 'إنستاباي' : 'كاش'}
                    </p>
                  </div>
                  <Actions
                    busy={busy === 'order-' + o.id}
                    onYes={() => confirmOrder(o.id, true)} yesLabel="أكّد + اخصم المخزون"
                    onNo={() => confirmOrder(o.id, false)}
                  />
                </Card>
              ))}
            </Section>

            {/* JOIN REQUESTS */}
            <Section icon={<UserPlus className="w-4 h-4" />} title="طلبات انضمام موظفين" count={joins.length}>
              {joins.map((j) => (
                <Card key={j.id}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A2E26] flex items-center gap-2">
                      {j.full_name}
                      {j.name_match && <span className="text-[9px] font-bold bg-[#1F6F5F]/10 text-[#1F6F5F] px-1.5 py-0.5 rounded">مطابق للمرتبات ✓</span>}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span dir="ltr">{localPhone(j.phone)}</span>
                      {j.job_title && <span>· {j.job_title}</span>}
                      {j.branch_name && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {j.branch_name}</span>}
                    </p>
                  </div>
                  <Actions
                    busy={busy === 'join-' + j.id}
                    onYes={() => reviewJoin(j.id, 'approve')} yesLabel="وافق"
                    onNo={() => reviewJoin(j.id, 'reject')}
                  />
                </Card>
              ))}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}

function Section({ icon, title, count, children }: any) {
  if (count === 0) return null
  return (
    <section>
      <h2 className="text-sm font-bold text-[#1A2E26] mb-3 flex items-center gap-2">
        <span className="text-[#1F6F5F]">{icon}</span> {title}
        <span className="text-[10px] font-bold bg-[#1F6F5F] text-white px-2 py-0.5 rounded-full">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Card({ children }: any) {
  return <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap">{children}</div>
}

function Actions({ busy, onYes, onNo, yesLabel }: any) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button onClick={onYes} disabled={busy} className="px-3 py-2 rounded-xl bg-[#1F6F5F] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {yesLabel}
      </button>
      <button onClick={onNo} disabled={busy} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-[#6B7280] text-xs font-bold flex items-center gap-1 disabled:opacity-50 border border-gray-200">
        <X className="w-3.5 h-3.5" /> رفض
      </button>
    </div>
  )
}
