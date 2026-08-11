'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Lock, RefreshCw, LogOut, ArrowRight, Phone, Clock, User,
  CreditCard, Banknote, CheckCircle, XCircle, AlertCircle,
  ShoppingBag, MessageCircle, Loader2, Copy, MapPin, FileText,
} from 'lucide-react'

// ============================================================================
// /admin/marketplace-orders
// Admin page to verify InstaPay payments for marketplace_orders.
// Mirrors /admin/marketplace-bookings pattern: sessionStorage + X-Admin-Password.
// Default filter: pending_payment (the work queue for admin).
// ============================================================================

type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

interface OrderItem {
  id: string
  name_snapshot: string
  unit_price: number
  quantity: number
  line_total: number
}

interface Order {
  id: string
  reference_code: string
  order_type: 'food' | 'product'
  status: OrderStatus
  currency: string
  subtotal_amount: number
  delivery_fee: number
  total_amount: number
  commission_amount: number
  supplier_payout: number
  customer_id: string | null
  guest_name: string | null
  guest_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_district: string | null
  delivery_phone: string | null
  delivery_notes: string | null
  customer_notes: string | null
  payment_method: 'instapay' | 'cod' | null
  payment_reference: string | null
  cancellation_reason: string | null
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  supplier: { id: string; business_name: string | null; profile: { phone: string | null } | null } | null
  customer: { full_name: string | null; phone: string | null } | null
  items: OrderItem[]
}

type Tab = 'pending_payment' | 'paid' | 'all' | 'cancelled'

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending_payment: { label: 'بانتظار الدفع', bg: 'bg-amber-100', fg: 'text-amber-800' },
  paid: { label: 'الدفع تم', bg: 'bg-blue-100', fg: 'text-blue-800' },
  accepted: { label: 'مقبول', bg: 'bg-blue-100', fg: 'text-blue-800' },
  preparing: { label: 'بيتجهّز', bg: 'bg-indigo-100', fg: 'text-indigo-800' },
  ready: { label: 'جاهز', bg: 'bg-indigo-100', fg: 'text-indigo-800' },
  out_for_delivery: { label: 'في الطريق', bg: 'bg-purple-100', fg: 'text-purple-800' },
  delivered: { label: 'وصل', bg: 'bg-green-100', fg: 'text-green-800' },
  completed: { label: 'مكتمل', bg: 'bg-green-100', fg: 'text-green-700' },
  cancelled: { label: 'متلغي', bg: 'bg-red-100', fg: 'text-red-800' },
  refunded: { label: 'مستردّ', bg: 'bg-red-100', fg: 'text-red-800' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'دلوقتي'
  if (mins < 60) return `من ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `من ${hours} س`
  const days = Math.floor(hours / 24)
  if (days < 30) return `من ${days} يوم`
  return new Date(iso).toLocaleDateString('ar-EG')
}

export default function AdminMarketplaceOrdersPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('pending_payment')
  const [orders, setOrders] = useState<Order[]>([])
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [refModalId, setRefModalId] = useState<string | null>(null)
  const [refInput, setRefInput] = useState('')
  const [cancelModalId, setCancelModalId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('madmona_admin_pw')
    if (stored) {
      setPassword(stored)
      tryFetch(stored, tab, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authed) tryFetch(password, tab, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const tryFetch = async (pw: string, currentTab: Tab, silent = false) => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/marketplace-orders', window.location.origin)
      if (currentTab !== 'all') url.searchParams.set('status', currentTab)
      const res = await fetch(url.toString(), { headers: { 'x-admin-password': pw } })
      if (res.status === 401) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem('madmona_admin_pw')
        setAuthed(false)
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (!silent) setAuthError(j.error || 'فشل التحميل')
        return
      }
      const data = await res.json()
      setOrders(data.orders || [])
      setAuthed(true)
      sessionStorage.setItem('madmona_admin_pw', pw)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    tryFetch(password, tab)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('madmona_admin_pw')
    setAuthed(false)
    setPassword('')
    setOrders([])
  }

  const verifyPayment = async (orderId: string, reference: string | null) => {
    setActioningId(orderId)
    try {
      const res = await fetch('/api/admin/marketplace-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: orderId, action: 'verify_payment', payment_reference: reference }),
      })
      if (res.ok) {
        await tryFetch(password, tab, true)
        setRefModalId(null)
        setRefInput('')
      } else {
        const j = await res.json().catch(() => ({}))
        alert('فشل: ' + (j.error || 'unknown'))
      }
    } finally {
      setActioningId(null)
    }
  }

  const cancelOrder = async (orderId: string, reason: string) => {
    setActioningId(orderId)
    try {
      const res = await fetch('/api/admin/marketplace-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: orderId, action: 'cancel', cancellation_reason: reason }),
      })
      if (res.ok) {
        await tryFetch(password, tab, true)
        setCancelModalId(null)
        setCancelReason('')
      } else {
        const j = await res.json().catch(() => ({}))
        alert('فشل: ' + (j.error || 'unknown'))
      }
    } finally {
      setActioningId(null)
    }
  }

  const copyToClipboard = (text: string) => {
    try { navigator.clipboard?.writeText(text) } catch {}
  }

  // ---- Login screen ----
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-[#FA8125]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#FA8125]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">تأكيد دفعات Orders</h1>
          <p className="text-xs text-gray-500 text-center mb-6">marketplace_orders</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة سر الإدارة"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FA8125]/30 focus:border-[#FA8125] text-right"
              autoFocus
            />
            {authError && <p className="text-sm text-red-600 text-center">{authError}</p>}
            <button
              type="submit" disabled={loading || !password}
              className="w-full bg-[#FA8125] text-white py-3 rounded-xl font-semibold hover:bg-[#FA8125]/90 disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---- Main ----
  const pendingCount = orders.filter((o) => o.status === 'pending_payment').length

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">تأكيد دفعات Orders</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {orders.length} {tab === 'pending_payment' ? '· بانتظار التأكيد' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => tryFetch(password, tab)} disabled={loading} className="p-2 hover:bg-gray-50 rounded-full">
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-50 rounded-full">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {(['pending_payment', 'paid', 'all', 'cancelled'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                tab === t ? 'bg-[#FA8125] text-white shadow-card' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {t === 'pending_payment' ? `بانتظار التأكيد ${pendingCount > 0 && tab === t ? `(${pendingCount})` : ''}` :
                t === 'paid' ? 'تم تأكيد دفعتها' :
                t === 'cancelled' ? 'ملغية' :
                'الكل'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش orders هنا</h3>
            <p className="text-sm text-gray-500">
              {tab === 'pending_payment' ? 'مفيش دفعات بانتظار التأكيد دلوقتي 🎉' : 'مفيش orders بالفلتر ده'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const meta = STATUS_META[o.status]
              const customerName = o.customer?.full_name || o.guest_name || 'عميل'
              const customerPhone = o.customer?.phone || o.guest_phone || ''
              const customerPhoneClean = customerPhone.replace(/\D/g, '')
              const isInstaPay = o.payment_method === 'instapay'
              const isCOD = o.payment_method === 'cod'
              const isPending = o.status === 'pending_payment'

              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <button
                          onClick={() => copyToClipboard(o.reference_code)}
                          className="font-mono text-sm font-bold text-gray-900 inline-flex items-center gap-1 group"
                          dir="ltr"
                        >
                          {o.reference_code}
                          <Copy className="w-3 h-3 text-gray-400 group-hover:text-[#FA8125]" />
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.fg}`}>
                          {meta.label}
                        </span>
                        {o.order_type === 'food' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🍽️ أكل</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🛍️ منتج</span>
                        )}
                        {isInstaPay ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> InstaPay
                          </span>
                        ) : isCOD ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                            <Banknote className="w-3 h-3" /> كاش
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500">{timeAgo(o.created_at)}</p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-lg font-bold text-[#FA8125] tabular">
                        {o.total_amount.toLocaleString('ar-EG')}
                        <span className="text-[10px] font-normal text-gray-500 ms-1">ج.م</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {o.items.length} صنف · للمورد: {o.supplier_payout.toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>

                  {/* Customer + supplier */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 p-3 bg-[#FAFAF7] rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-bold text-gray-700">{customerName}</span>
                      {!o.customer_id && <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">ضيف</span>}
                    </div>
                    {customerPhone && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span dir="ltr" className="tabular">{customerPhone}</span>
                      </div>
                    )}
                    {o.supplier && (
                      <div className="flex items-center gap-1.5 text-[#2FA084] col-span-full">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="font-bold truncate">{o.supplier.business_name}</span>
                      </div>
                    )}
                    {o.delivery_district && (
                      <div className="flex items-center gap-1.5 text-gray-700 col-span-full">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">
                          {[o.delivery_district, o.delivery_city].filter(Boolean).join('، ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Items preview */}
                  <details className="text-xs mb-3 group">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 select-none">
                      <FileText className="w-3 h-3" />
                      الأصناف ({o.items.length})
                    </summary>
                    <div className="mt-2 space-y-1 ps-4">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-gray-700">
                          <span className="truncate">
                            {it.name_snapshot} <span className="text-gray-400 tabular">×{it.quantity}</span>
                          </span>
                          <span className="font-bold tabular flex-shrink-0">
                            {it.line_total.toLocaleString('ar-EG')} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Payment reference if set */}
                  {o.payment_reference && (
                    <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 mb-3">
                      <strong>مرجع التحويل:</strong> <span dir="ltr">{o.payment_reference}</span>
                    </div>
                  )}

                  {/* Cancellation reason if cancelled */}
                  {o.status === 'cancelled' && o.cancellation_reason && (
                    <div className="text-xs bg-red-50 border border-red-100 rounded-lg p-2 mb-3">
                      <strong>سبب الإلغاء:</strong> {o.cancellation_reason}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                    {customerPhoneClean && (
                      <a
                        href={`https://wa.me/${customerPhoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#25D366]/10 text-[#1a8a45] rounded-lg text-xs font-medium hover:bg-[#25D366]/20 flex items-center gap-1 no-underline"
                      >
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </a>
                    )}
                    <div className="flex-1" />

                    {isPending && isInstaPay && (
                      <>
                        <button
                          onClick={() => { setRefModalId(o.id); setRefInput('') }}
                          disabled={actioningId === o.id}
                          className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-bold hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          أكّد الدفع
                        </button>
                        <button
                          onClick={() => { setCancelModalId(o.id); setCancelReason('') }}
                          disabled={actioningId === o.id}
                          className="px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          ارفض
                        </button>
                      </>
                    )}
                    {isPending && isCOD && (
                      <button
                        onClick={() => verifyPayment(o.id, 'COD')}
                        disabled={actioningId === o.id}
                        className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-bold hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actioningId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        دفعه مؤكّد (كاش)
                      </button>
                    )}
                    {!isPending && o.status !== 'cancelled' && o.status !== 'completed' && o.status !== 'refunded' && (
                      <button
                        onClick={() => { setCancelModalId(o.id); setCancelReason('') }}
                        disabled={actioningId === o.id}
                        className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Payment reference modal */}
      {refModalId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setRefModalId(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1 text-center">أكّد دفع الأوردر</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              ممكن تكتب مرجع تحويل InstaPay (اختياري) عشان يبقى في السجل
            </p>
            <input
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="مرجع InstaPay (اختياري)"
              dir="ltr"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FA8125] focus:ring-2 focus:ring-[#FA8125]/20 outline-none text-sm mb-4 text-right tabular"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRefModalId(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200"
              >
                ابقى لأ
              </button>
              <button
                onClick={() => verifyPayment(refModalId!, refInput.trim() || null)}
                disabled={actioningId === refModalId}
                className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold text-sm shadow-card hover:bg-green-700 disabled:opacity-60"
              >
                {actioningId === refModalId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'أكّد الدفع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModalId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setCancelModalId(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 text-center">إلغاء الأوردر</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              اكتب السبب عشان يتسجل ويظهر للعميل والمورد
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="مثلا: العميل ما حوّلش، إيصال غير صحيح، ..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm mb-4 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCancelModalId(null); setCancelReason('') }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200"
              >
                ابقى لأ
              </button>
              <button
                onClick={() => cancelOrder(cancelModalId!, cancelReason)}
                disabled={!cancelReason.trim() || actioningId === cancelModalId}
                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold text-sm shadow-card hover:bg-red-700 disabled:opacity-60"
              >
                {actioningId === cancelModalId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'أكّد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
