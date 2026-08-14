'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, AlertCircle, CheckCircle, Clock, ChefHat, Package,
  Truck, Home, X, RefreshCw, MapPin, Phone, MessageCircle, CreditCard,
  Banknote, Image as ImageIcon, Copy, Sparkles, ShoppingBag,
} from 'lucide-react'

// ============================================================================
// /order/[ref]?id=<uuid>
// Order tracking page. Public (guests can view by URL).
// Uses get_order_public RPC which requires BOTH the order_id and the ref code
// (acts as a soft access token; sharing a guessed code alone won't work).
// ============================================================================

type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

interface OrderItem {
  id: string
  name: string
  photo: string | null
  unit_price: number
  quantity: number
  line_total: number
  item_notes: string | null
}

interface OrderData {
  id: string
  reference_code: string
  status: OrderStatus
  order_type: 'food' | 'product'
  subtotal_amount: number
  delivery_fee: number
  total_amount: number
  currency: string
  commission_amount: number
  supplier_payout: number
  guest_name: string | null
  guest_phone: string | null
  delivery_address: string | null
  delivery_city: string | null
  delivery_district: string | null
  delivery_phone: string | null
  delivery_notes: string | null
  customer_notes: string | null
  created_at: string
  paid_at: string | null
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  payment_method: 'instapay' | 'cod' | null
  supplier: { business_name: string | null; phone: string | null }
  items: OrderItem[]
}

// Status label + color + icon
const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending_payment: { label: 'بانتظار الدفع', color: 'amber', icon: CreditCard },
  paid: { label: 'الدفع تم', color: 'blue', icon: CheckCircle },
  accepted: { label: 'تم القبول', color: 'blue', icon: CheckCircle },
  preparing: { label: 'بيتجهّز', color: 'blue', icon: ChefHat },
  ready: { label: 'جاهز', color: 'indigo', icon: Package },
  out_for_delivery: { label: 'في الطريق', color: 'indigo', icon: Truck },
  delivered: { label: 'وصل', color: 'green', icon: Home },
  completed: { label: 'مكتمل', color: 'green', icon: CheckCircle },
  cancelled: { label: 'متلغي', color: 'red', icon: X },
  refunded: { label: 'مستردّ', color: 'red', icon: X },
}

// Status flow for the timeline (excludes terminal cancelled/refunded)
const STATUS_FLOW: OrderStatus[] = [
  'pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed',
]

const STATUS_TIMESTAMPS: Record<OrderStatus, keyof OrderData | null> = {
  pending_payment: 'created_at',
  paid: 'paid_at',
  accepted: 'accepted_at',
  preparing: 'preparing_at',
  ready: 'ready_at',
  out_for_delivery: 'out_for_delivery_at',
  delivered: 'delivered_at',
  completed: 'completed_at',
  cancelled: 'cancelled_at',
  refunded: null,
}

export default function OrderTrackingPage() {
  const params = useParams()
  const search = useSearchParams()
  const ref = params?.ref as string
  const orderId = search?.get('id')

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!orderId || !ref) {
      setError('اللينك ناقص. لازم يبقى فيه id و reference code.')
      setLoading(false)
      return
    }
    try {
      const { data, error: rpcError } = await supabaseBrowser.rpc('get_order_public', {
        p_order_id: orderId,
        p_reference_code: ref,
      })
      if (rpcError) {
        setError(rpcError.message || 'حصل خطأ في تحميل الأوردر')
        setLoading(false)
        return
      }
      if (!data) {
        setError('الأوردر مش موجود أو اللينك غلط')
        setLoading(false)
        return
      }
      setOrder(data as OrderData)
    } catch (e) {
      console.error('[order/track] load error:', e)
      setError(e instanceof Error ? e.message : 'حصل خطأ مش متوقع')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderId, ref])

  useEffect(() => {
    load()
  }, [load])

  const handleRefresh = () => {
    setRefreshing(true)
    load()
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {}
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  // ---- Error state ----
  if (error || !order) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-black text-xl mb-2">مش لاقي الأوردر</h1>
          <p className="text-sm text-gray-500 mb-5">{error || 'الأوردر مش موجود'}</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            رجوع للماركت بليس
          </Link>
        </div>
      </div>
    )
  }

  const meta = STATUS_META[order.status]
  const StatusIcon = meta.icon
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'
  const isPendingPayment = order.status === 'pending_payment'
  const supplierPhoneClean = (order.supplier.phone || '').replace(/\D/g, '')

  // Current step index in flow (-1 if cancelled/refunded)
  const currentIdx = isCancelled ? -1 : STATUS_FLOW.indexOf(order.status)

  // Bank Misr InstaPay (5220001000009207) hidden until approval. Using handle + Vodafone Cash for now.
  const instapayHandle = 'madmonacairo@instapay.com'
  const vodafoneCash = '01026222337'
  const madmonaPhone = '201002229982'
  const waEvidenceMessage = encodeURIComponent(
    `السلام عليكم، أنا حوّلت فلوس أوردر رقم ${order.reference_code} (InstaPay/فودافون كاش). ده الإيصال:`
  )

  return (
    <div className="min-h-screen gradient-mesh pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/marketplace"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-sm font-bold text-gray-700 flex-1">تتبع الأوردر</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all disabled:opacity-50"
            title="حدّث الحالة"
          >
            <RefreshCw className={`w-4 h-4 text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Hero: reference + status */}
        <section className="bg-white rounded-3xl shadow-card overflow-hidden animate-slide-up">
          <div className={`p-6 text-center border-b-4 ${
            meta.color === 'amber' ? 'border-amber-400' :
            meta.color === 'blue' ? 'border-blue-500' :
            meta.color === 'indigo' ? 'border-indigo-500' :
            meta.color === 'green' ? 'border-green-500' :
            'border-red-500'
          }`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">رقم الأوردر</p>
            <button
              onClick={() => copyToClipboard(order.reference_code, 'reference')}
              className="inline-flex items-center gap-2 group"
            >
              <h2 className="text-2xl font-black text-gray-900 tabular tracking-wider" dir="ltr">
                {order.reference_code}
              </h2>
              <Copy className="w-4 h-4 text-gray-400 group-hover:text-[#059669]" />
            </button>
            {copySuccess === 'reference' && (
              <p className="text-[11px] text-green-600 font-bold mt-1">✓ تم النسخ</p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm" style={{
              backgroundColor: meta.color === 'amber' ? '#FEF3C7' :
                                meta.color === 'blue' ? '#DBEAFE' :
                                meta.color === 'indigo' ? '#E0E7FF' :
                                meta.color === 'green' ? '#D1FAE5' : '#FEE2E2',
              color: meta.color === 'amber' ? '#92400E' :
                      meta.color === 'blue' ? '#1E40AF' :
                      meta.color === 'indigo' ? '#3730A3' :
                      meta.color === 'green' ? '#065F46' : '#991B1B',
            }}>
              <StatusIcon className="w-4 h-4" />
              {meta.label}
            </div>
          </div>

          {/* Status timeline (hidden if cancelled/refunded) */}
          {!isCancelled && (
            <div className="p-6">
              <div className="space-y-3">
                {STATUS_FLOW.map((step, idx) => {
                  const stepMeta = STATUS_META[step]
                  const StepIcon = stepMeta.icon
                  const isPast = idx < currentIdx
                  const isCurrent = idx === currentIdx
                  const isFuture = idx > currentIdx
                  const tsKey = STATUS_TIMESTAMPS[step]
                  const ts = tsKey ? (order[tsKey] as string | null) : null

                  return (
                    <div key={step} className={`flex items-center gap-3 transition-all ${
                      isFuture ? 'opacity-30' : ''
                    }`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPast ? 'bg-green-100 text-green-700' :
                        isCurrent ? 'bg-[#34D399] text-[#04352A] shadow-md scale-110' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isPast ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isCurrent ? 'text-[#059669]' : isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                          {stepMeta.label}
                        </p>
                        {ts && (
                          <p className="text-[11px] text-gray-400 tabular">
                            {new Date(ts).toLocaleString('ar-EG', {
                              day: 'numeric', month: 'short',
                              hour: 'numeric', minute: '2-digit', hour12: true,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cancellation reason */}
          {isCancelled && order.cancellation_reason && (
            <div className="p-6 bg-red-50 border-t border-red-100">
              <p className="text-xs font-bold text-red-700 mb-1">سبب الإلغاء:</p>
              <p className="text-sm text-red-900">{order.cancellation_reason}</p>
            </div>
          )}
        </section>

        {/* InstaPay payment instructions (pending_payment + instapay only) */}
        {isPendingPayment && order.payment_method === 'instapay' && (
          <section className="bg-white rounded-3xl shadow-card overflow-hidden animate-slide-up delay-100">
            <div className="bg-gradient-to-l from-amber-50 to-amber-100/30 p-5 border-b border-amber-200">
              <h3 className="text-base font-black text-amber-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                خطوات الدفع
              </h3>
              <p className="text-xs text-amber-800">
                حوّل المبلغ على InstaPay أو فودافون كاش اللي تحت، وبعدين ابعت إيصال على واتساب مضمونة
              </p>
            </div>
            <div className="p-5 space-y-3">
              {/* InstaPay address */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">InstaPay</p>
                  <p className="text-lg font-black text-gray-900" dir="ltr">{instapayHandle}</p>
                  <p className="text-[11px] text-gray-500">مضمونة</p>
                </div>
                <button
                  onClick={() => copyToClipboard(instapayHandle, 'instapay')}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-[#059669] hover:text-[#059669] transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess === 'instapay' ? '✓ متنسخ' : 'انسخ'}
                </button>
              </div>

              {/* Vodafone Cash */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">فودافون كاش</p>
                  <p className="text-lg font-black text-gray-900 tabular" dir="ltr">{vodafoneCash}</p>
                  <p className="text-[11px] text-gray-500">محفظة · مضمونة</p>
                </div>
                <button
                  onClick={() => copyToClipboard(vodafoneCash, 'vodafone')}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-[#059669] hover:text-[#059669] transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess === 'vodafone' ? '✓ متنسخ' : 'انسخ'}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">المبلغ</p>
                  <p className="text-lg font-black text-[#059669] tabular">
                    {order.total_amount.toLocaleString('ar-EG')} <span className="text-sm">ج.م</span>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(String(order.total_amount), 'amount')}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:border-[#059669] hover:text-[#059669] transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copySuccess === 'amount' ? '✓ متنسخ' : 'انسخ'}
                </button>
              </div>

              <a
                href={`https://wa.me/${madmonaPhone}?text=${waEvidenceMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline"
              >
                <MessageCircle className="w-5 h-5" />
                ابعت إيصال على واتساب
              </a>
              <p className="text-[11px] text-gray-500 text-center">
                هنأكّد الدفع في خلال ٣٠ دقيقة، وبعدين المورد يبتدي يجهّز
              </p>
            </div>
          </section>
        )}

        {/* COD note */}
        {isPendingPayment && order.payment_method === 'cod' && (
          <section className="bg-white rounded-3xl shadow-card p-5 animate-slide-up delay-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Banknote className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900 mb-1">كاش عند الاستلام</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  انتظر تأكيد المورد، وادفع المبلغ كامل وقت ما يوصلك الأوردر. جهّز <strong>{order.total_amount.toLocaleString('ar-EG')} ج.م</strong>.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Items */}
        <section className="bg-white rounded-3xl shadow-soft overflow-hidden animate-slide-up delay-200">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#059669]" />
              الأصناف <span className="text-gray-400 tabular">({order.items.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 line-clamp-2">{item.name}</p>
                  <p className="text-xs text-gray-500 tabular mt-0.5">
                    {item.unit_price.toLocaleString('ar-EG')} ج.م × {item.quantity}
                  </p>
                  {item.item_notes && (
                    <p className="text-[11px] text-gray-500 italic mt-1">
                      ملاحظة: {item.item_notes}
                    </p>
                  )}
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="font-black text-sm text-[#059669] tabular">
                    {item.line_total.toLocaleString('ar-EG')}
                    <span className="text-[10px] font-medium text-gray-500 ms-1">ج.م</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-l from-[#34D399]/5 to-transparent border-t border-[#059669]/10 p-5 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="font-bold tabular">{order.subtotal_amount.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">التوصيل</span>
              <span className="font-bold tabular text-gray-500">
                {order.delivery_fee > 0 ? `${order.delivery_fee.toLocaleString('ar-EG')} ج.م` : 'مجاني'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-black text-gray-900">الإجمالي</span>
              <span className="text-xl font-black text-[#059669] tabular">
                {order.total_amount.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        </section>

        {/* Delivery info */}
        {order.delivery_address && (
          <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-300">
            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#059669]" />
              العنوان
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-1">{order.delivery_address}</p>
            {(order.delivery_district || order.delivery_city) && (
              <p className="text-xs text-gray-500">
                {[order.delivery_district, order.delivery_city].filter(Boolean).join('، ')}
              </p>
            )}
            {order.delivery_phone && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{order.delivery_phone}</span>
              </p>
            )}
            {order.delivery_notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-700">
                <strong>ملاحظات:</strong> {order.delivery_notes}
              </div>
            )}
          </section>
        )}

        {/* Supplier card */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-300">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">المورد</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-gray-900 truncate flex-1">
              {order.supplier.business_name || 'مورد مضمونة'}
            </p>
            {supplierPhoneClean && order.status !== 'pending_payment' && (
              <a
                href={`https://wa.me/${supplierPhoneClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-soft hover:shadow-card transition-all no-underline"
              >
                <MessageCircle className="w-4 h-4" />
                كلّمه
              </a>
            )}
          </div>
        </section>

        {/* Save link tip for guests */}
        <div className="bg-gradient-to-l from-[#34D399]/5 to-transparent border border-[#059669]/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-700 mb-1">💡 احفظ اللينك ده</p>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            ده اللينك الوحيد اللي بيوصّلك للأوردر. احفظه أو خد screenshot عشان تتابع منه أي وقت.
          </p>
        </div>
      </main>
    </div>
  )
}
