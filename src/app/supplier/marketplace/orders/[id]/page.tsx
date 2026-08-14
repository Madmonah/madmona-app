'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, AlertCircle, CheckCircle, Clock, ChefHat, Package,
  Truck, Home, X, MapPin, Phone, MessageCircle, CreditCard, Banknote,
  Image as ImageIcon, ShoppingBag, User, FileText, Copy,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/orders/[id]
// Order detail page for suppliers. Shows full order + offers status actions
// via the set_order_status RPC. Lifecycle:
//   pending_payment -> [admin] -> paid -> accepted -> preparing
//   -> ready -> out_for_delivery -> delivered -> completed
// At any non-terminal state, supplier can cancel with a reason.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'not-found' | 'no-permission' | 'wrong-supplier' | 'ready'

type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

interface OrderItem {
  id: string
  listing_id: string
  menu_item_id: string | null
  name_snapshot: string
  description_snapshot: string | null
  photo_snapshot: string | null
  unit_price: number
  quantity: number
  line_total: number
  item_notes: string | null
}

interface OrderFull {
  id: string
  reference_code: string
  supplier_id: string
  status: OrderStatus
  order_type: 'food' | 'product'
  currency: string
  subtotal_amount: number
  delivery_fee: number
  tax_amount: number | null
  total_amount: number
  commission_rate: number
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
  supplier_notes: string | null
  payment_method: 'instapay' | 'cod' | null
  cancellation_reason: string | null
  created_at: string
  paid_at: string | null
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  customer: { phone: string | null; full_name: string | null } | null
  items: OrderItem[]
}

const STATUS_META: Record<OrderStatus, { label: string; bg: string; fg: string; icon: typeof Clock }> = {
  pending_payment: { label: 'بانتظار الدفع', bg: 'bg-amber-100', fg: 'text-amber-800', icon: CreditCard },
  paid: { label: 'الدفع تم', bg: 'bg-blue-100', fg: 'text-blue-800', icon: CheckCircle },
  accepted: { label: 'مقبول', bg: 'bg-blue-100', fg: 'text-blue-800', icon: CheckCircle },
  preparing: { label: 'بيتجهّز', bg: 'bg-indigo-100', fg: 'text-indigo-800', icon: ChefHat },
  ready: { label: 'جاهز', bg: 'bg-indigo-100', fg: 'text-indigo-800', icon: Package },
  out_for_delivery: { label: 'في الطريق', bg: 'bg-purple-100', fg: 'text-purple-800', icon: Truck },
  delivered: { label: 'وصل', bg: 'bg-green-100', fg: 'text-green-800', icon: Home },
  completed: { label: 'مكتمل', bg: 'bg-green-100', fg: 'text-green-700', icon: CheckCircle },
  cancelled: { label: 'متلغي', bg: 'bg-red-100', fg: 'text-red-800', icon: X },
  refunded: { label: 'مستردّ', bg: 'bg-red-100', fg: 'text-red-800', icon: X },
}

// Action mapping: from current status, which transition action(s) does the supplier see?
const SUPPLIER_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: typeof CheckCircle }>> = {
  paid:             { next: 'accepted',         label: 'اقبل الأوردر',     icon: CheckCircle },
  accepted:         { next: 'preparing',        label: 'ابدأ التحضير',     icon: ChefHat },
  preparing:        { next: 'ready',            label: 'الأوردر جاهز',     icon: Package },
  ready:            { next: 'out_for_delivery', label: 'خرج للتوصيل',      icon: Truck },
  out_for_delivery: { next: 'delivered',        label: 'وصل للعميل',       icon: Home },
  delivered:        { next: 'completed',        label: 'اكتمل (مغلق)',    icon: CheckCircle },
}

const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'refunded']
const CANCELABLE_STATUSES: OrderStatus[] = ['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery']

export default function SupplierOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id as string

  const [stage, setStage] = useState<Stage>('loading')
  const [order, setOrder] = useState<OrderFull | null>(null)
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [supplierNotes, setSupplierNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const loadOrder = useCallback(async (oid: string, supId: string) => {
    const { data } = await supabaseBrowser
      .from('marketplace_orders')
      .select(`
        *,
        customer:profiles!marketplace_orders_customer_id_fkey(phone, full_name),
        items:marketplace_order_items(*)
      `)
      .eq('id', oid)
      .maybeSingle()

    if (!data) { setStage('not-found'); return }
    if (data.supplier_id !== supId) { setStage('wrong-supplier'); return }

    setOrder(data as OrderFull)
    setSupplierNotes(data.supplier_notes || '')
    setStage('ready')
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      // Find supplier (owner OR staff with can_manage_bookings)
      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`can_manage_bookings, supplier:marketplace_suppliers(id)`)
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()
        if (staff && staff.supplier) {
          if (!staff.can_manage_bookings) { setStage('no-permission'); return }
          sup = staff.supplier as typeof sup
        }
      }

      if (!sup) { setStage('no-permission'); return }
      setSupplierId(sup.id)
      await loadOrder(orderId, sup.id)
    }
    init()
  }, [orderId, loadOrder])

  const advanceStatus = async (next: OrderStatus) => {
    if (!order) return
    setError(null)
    setUpdating(true)
    try {
      // NOTE: DB function param is `p_reason` (not `p_cancellation_reason`).
      const { error: rpcError } = await supabaseBrowser.rpc('set_order_status', {
        p_order_id: order.id,
        p_new_status: next,
        p_reason: undefined,
      })
      if (rpcError) {
        setError(rpcError.message || 'حصل خطأ')
        return
      }
      if (supplierId) await loadOrder(order.id, supplierId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حصل خطأ')
    } finally {
      setUpdating(false)
    }
  }

  const cancelOrder = async () => {
    if (!order) return
    if (!cancelReason.trim()) { setError('اكتب سبب الإلغاء'); return }
    setError(null)
    setUpdating(true)
    try {
      // NOTE: DB function param is `p_reason` (not `p_cancellation_reason`).
      const { error: rpcError } = await supabaseBrowser.rpc('set_order_status', {
        p_order_id: order.id,
        p_new_status: 'cancelled',
        p_reason: cancelReason.trim(),
      })
      if (rpcError) {
        setError(rpcError.message || 'حصل خطأ')
        return
      }
      setShowCancel(false)
      setCancelReason('')
      if (supplierId) await loadOrder(order.id, supplierId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حصل خطأ')
    } finally {
      setUpdating(false)
    }
  }

  const saveSupplierNotes = async () => {
    if (!order) return
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      await supabaseBrowser
        .from('marketplace_orders')
        .update({ supplier_notes: supplierNotes.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', order.id)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setNotesSaving(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {}
  }

  // ---- Stage guards ----
  if (stage === 'loading') {
    return <Center><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></Center>
  }
  if (stage === 'unauthenticated') {
    return <ErrorBlock title="سجل دخول الأول" href="/auth/login" hrefLabel="سجل دخول" />
  }
  if (stage === 'not-found') {
    return <ErrorBlock title="الأوردر مش لاقيه" href="/supplier/marketplace/orders" hrefLabel="رجوع للأوردرز" />
  }
  if (stage === 'wrong-supplier') {
    return <ErrorBlock title="الأوردر ده ليس ضمن أوردراتك" href="/supplier/marketplace/orders" hrefLabel="رجوع للأوردرز" />
  }
  if (stage === 'no-permission') {
    return <ErrorBlock title="مفيش صلاحية" subtitle="مالكش صلاحية إدارة الأوردرز" href="/supplier/marketplace" hrefLabel="رجوع" />
  }
  if (!order) return null

  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const action = SUPPLIER_ACTIONS[order.status]
  const isTerminal = TERMINAL_STATUSES.includes(order.status)
  const isCancelable = CANCELABLE_STATUSES.includes(order.status)
  const customerName = order.customer?.full_name || order.guest_name || 'عميل'
  const customerPhone = order.customer?.phone || order.guest_phone || ''
  const customerPhoneClean = customerPhone.replace(/\D/g, '')

  return (
    <div className="min-h-screen gradient-mesh pb-32 lg:pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/supplier/marketplace/orders" className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">تفاصيل الأوردر</p>
            <button onClick={() => copyToClipboard(order.reference_code, 'ref')} className="flex items-center gap-1 group">
              <p className="text-sm font-black text-gray-900 tabular" dir="ltr">{order.reference_code}</p>
              <Copy className="w-3 h-3 text-gray-400 group-hover:text-[#FA8125]" />
            </button>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${meta.bg} ${meta.fg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
        </div>
        {copySuccess === 'ref' && (
          <p className="text-[11px] text-green-600 font-bold text-center pb-1">✓ تم نسخ الكود</p>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Pending payment notice */}
        {order.status === 'pending_payment' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
            <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-900 mb-1">بانتظار تأكيد الدفع</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                العميل لسه ما حوّلش أو فريق مضمونة لسه ما أكّدش الإيصال. الأوردر هيظهر &quot;الدفع تم&quot; هنا فور التأكيد، ووقتها هتقدر تقبله.
              </p>
            </div>
          </div>
        )}

        {/* Customer info */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up">
          <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-[#FA8125]" />
            العميل
          </h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{customerName}</p>
              {customerPhone && (
                <p className="text-xs text-gray-500 tabular mt-1" dir="ltr">{customerPhone}</p>
              )}
              {!order.customer_id && (
                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded-full mt-1">
                  ضيف (بدون حساب)
                </p>
              )}
            </div>
            {customerPhoneClean && (
              <a
                href={`https://wa.me/${customerPhoneClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card transition-all no-underline flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                كلّمه
              </a>
            )}
          </div>
        </section>

        {/* Delivery */}
        {order.delivery_address && (
          <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-100">
            <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FA8125]" />
              التوصيل
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-2">{order.delivery_address}</p>
            {(order.delivery_district || order.delivery_city) && (
              <p className="text-xs text-gray-500 mb-2">
                {[order.delivery_district, order.delivery_city].filter(Boolean).join('، ')}
              </p>
            )}
            {order.delivery_phone && (
              <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-xl">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  تليفون للتوصيل
                </span>
                <button
                  onClick={() => copyToClipboard(order.delivery_phone || '', 'phone')}
                  className="text-sm font-bold tabular text-gray-900 hover:text-[#FA8125]"
                  dir="ltr"
                >
                  {order.delivery_phone} {copySuccess === 'phone' && <span className="text-green-600 text-xs">✓</span>}
                </button>
              </div>
            )}
            {order.delivery_notes && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                <strong>ملاحظات التوصيل:</strong> {order.delivery_notes}
              </div>
            )}
          </section>
        )}

        {/* Customer notes */}
        {order.customer_notes && (
          <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-200">
            <h2 className="text-sm font-black text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FA8125]" />
              ملاحظات العميل
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{order.customer_notes}</p>
          </section>
        )}

        {/* Items */}
        <section className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-200">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FA8125]" />
              الأصناف <span className="text-gray-400 tabular">({order.items.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((it) => (
              <div key={it.id} className="p-4 flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {it.photo_snapshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.photo_snapshot} alt={it.name_snapshot} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{it.name_snapshot}</p>
                  <p className="text-xs text-gray-500 tabular">
                    {it.unit_price.toLocaleString('ar-EG')} × {it.quantity}
                  </p>
                  {it.item_notes && (
                    <p className="text-[11px] text-amber-700 italic mt-1">
                      ✦ {it.item_notes}
                    </p>
                  )}
                </div>
                <p className="font-black text-sm text-[#FA8125] tabular flex-shrink-0">
                  {it.line_total.toLocaleString('ar-EG')}
                  <span className="text-[10px] font-medium text-gray-500 ms-1">ج.م</span>
                </p>
              </div>
            ))}
          </div>
          {/* Summary */}
          <div className="bg-gradient-to-l from-[#FA8125]/5 to-transparent border-t border-[#FA8125]/10 p-5 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="font-bold tabular">{order.subtotal_amount.toLocaleString('ar-EG')} ج.م</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">التوصيل</span>
                <span className="font-bold tabular">{order.delivery_fee.toLocaleString('ar-EG')} ج.م</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-black text-gray-900">إجمالي العميل</span>
              <span className="text-base font-black text-gray-900 tabular">
                {order.total_amount.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-gray-400">عمولة مضمونة ({Number(order.commission_rate).toFixed(1)}%)</span>
              <span className="text-gray-400 tabular">-{order.commission_amount.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#FA8125]/20">
              <span className="text-sm font-black text-[#FA8125]">صافي مستحقاتك</span>
              <span className="text-xl font-black text-[#FA8125] tabular">
                {order.supplier_payout.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        </section>

        {/* Supplier notes (editable) */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-300">
          <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#FA8125]" />
            ملاحظاتك الداخلية
          </h2>
          <textarea
            value={supplierNotes}
            onChange={(e) => setSupplierNotes(e.target.value)}
            placeholder="ملاحظات للنفسك أو لفريقك (مش هتظهر للعميل)"
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#FA8125] focus:ring-2 focus:ring-[#FA8125]/20 outline-none transition-all text-sm font-medium resize-none mb-2"
          />
          <div className="flex justify-end">
            <button
              onClick={saveSupplierNotes}
              disabled={notesSaving}
              className="text-xs font-bold text-[#FA8125] px-4 py-2 rounded-xl hover:bg-[#FA8125]/10 disabled:opacity-60 transition-all"
            >
              {notesSaving ? '...' : notesSaved ? '✓ متحفظ' : 'احفظ الملاحظات'}
            </button>
          </div>
        </section>

        {/* Cancellation reason if cancelled */}
        {order.status === 'cancelled' && order.cancellation_reason && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-red-700 mb-1">سبب الإلغاء:</p>
            <p className="text-sm text-red-900">{order.cancellation_reason}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Desktop action buttons */}
        {!isTerminal && (
          <div className="hidden lg:flex gap-2 pt-2">
            {action && (
              <button
                onClick={() => advanceStatus(action.next)}
                disabled={updating}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FA8125] text-white px-6 py-4 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <action.icon className="w-4 h-4" />}
                {action.label}
              </button>
            )}
            {isCancelable && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                إلغاء الأوردر
              </button>
            )}
          </div>
        )}
      </main>

      {/* Mobile sticky action bar */}
      {!isTerminal && (action || isCancelable) && (
        <div className="fixed bottom-0 inset-x-0 glass border-t border-white/40 z-50 lg:hidden shadow-luxe">
          <div className="max-w-3xl mx-auto p-3 flex gap-2">
            {action && (
              <button
                onClick={() => advanceStatus(action.next)}
                disabled={updating}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#FA8125] text-white py-4 rounded-2xl font-bold shadow-elevated disabled:opacity-60"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <action.icon className="w-4 h-4" />}
                {action.label}
              </button>
            )}
            {isCancelable && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={updating}
                className="w-14 flex-shrink-0 inline-flex items-center justify-center bg-red-50 text-red-700 border border-red-200 rounded-2xl"
                title="إلغاء"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-luxe p-6 max-w-md w-full animate-scale-in">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 text-center">إلغاء الأوردر؟</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">
              مش هينفع تسترجعه. اكتب سبب الإلغاء عشان العميل والإدارة يفهموا.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="مثلا: الصنف خلّص، أو المنطقة خارج التغطية..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all text-sm font-medium resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCancel(false); setCancelReason(''); setError(null) }}
                disabled={updating}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                ابقى لأ
              </button>
              <button
                onClick={cancelOrder}
                disabled={updating || !cancelReason.trim()}
                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold text-sm shadow-card hover:bg-red-700 disabled:opacity-60 transition-all"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'أكّد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">{children}</div>
  )
}

function ErrorBlock({ title, subtitle, href, hrefLabel }: { title: string; subtitle?: string; href: string; hrefLabel: string }) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="font-black text-xl mb-2">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mb-5">{subtitle}</p>}
        <Link
          href={href}
          className="inline-flex items-center gap-2 bg-[#FA8125] text-white px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card transition-all"
        >
          {hrefLabel}
        </Link>
      </div>
    </div>
  )
}
