'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  ShoppingBag, Loader2, ArrowRight, Lock, ChevronLeft, Clock,
  CreditCard, Banknote,
} from 'lucide-react'

// ============================================================================
// /account/orders
// Customer orders list (marketplace_orders).
// Auto-links guest orders by phone on first load.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'ready'

type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

const STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending_payment: { label: 'بانتظار الدفع', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'الدفع تم', color: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'بيتجهّز', color: 'bg-indigo-100 text-indigo-800' },
  ready: { label: 'جاهز', color: 'bg-indigo-100 text-indigo-800' },
  out_for_delivery: { label: 'في الطريق', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'وصل', color: 'bg-green-100 text-green-800' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'متلغي', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'مستردّ', color: 'bg-red-100 text-red-800' },
}

interface OrderSummary {
  id: string
  reference_code: string
  order_type: 'food' | 'product'
  status: OrderStatus
  total_amount: number
  currency: string
  payment_method: 'instapay' | 'cod' | null
  created_at: string
  supplier: { id: string; business_name: string | null } | null
  items_count: number
}

export default function CustomerOrdersPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [orders, setOrders] = useState<OrderSummary[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // Best-effort: link any guest orders by this user's profile_id.
      // DB function signature: link_guest_orders_to_profile(p_profile_id uuid)
      // It matches guest orders by phone internally against the profile record.
      try {
        await rpcSafe(supabaseBrowser, 'link_guest_orders_to_profile', {
          p_profile_id: session.user.id,
        })
      } catch {
        // Non-fatal — function may not exist yet in some envs
      }

      // @ts-expect-error
      const { data } = await supabaseBrowser
        .from('marketplace_orders')
        .select(`
          id, reference_code, order_type, status, total_amount, currency, payment_method, created_at,
          supplier:marketplace_suppliers(id, business_name),
          items:marketplace_order_items(id)
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      const mapped: OrderSummary[] = (data || []).map((o: {
        id: string
        reference_code: string
        order_type: 'food' | 'product'
        status: OrderStatus
        total_amount: number | string
        currency: string
        payment_method: 'instapay' | 'cod' | null
        created_at: string
        supplier: { id: string; business_name: string | null } | null
        items: { id: string }[]
      }) => ({
        id: o.id,
        reference_code: o.reference_code,
        order_type: o.order_type,
        status: o.status,
        total_amount: Number(o.total_amount),
        currency: o.currency,
        payment_method: o.payment_method,
        created_at: o.created_at,
        supplier: o.supplier,
        items_count: (o.items || []).length,
      }))

      setOrders(mapped)
      setStage('ready')
    }
    init()
  }, [])

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#2B4521] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخولك الأول</h1>
          <Link
            href="/auth/login?redirect=/account/orders"
            className="block bg-[#2B4521] text-white py-3 rounded-xl font-semibold"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">أوردراتي</h1>
            <p className="text-xs text-gray-500">{orders.length} أوردر</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">لسه ما طلبتش حاجة</h3>
            <p className="text-sm text-gray-500 mb-6">جرّب تطلب من المطاعم والمنتجات في مضمونة</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 bg-[#2B4521] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2B4521]/90"
            >
              تصفح المنصة
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const meta = STATUS_META[o.status]
              const created = new Date(o.created_at)
              const isPending = o.status === 'pending_payment'

              return (
                <Link
                  key={o.id}
                  href={`/order/${o.reference_code}?id=${o.id}`}
                  className={`block bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow no-underline ${
                    isPending ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-900" dir="ltr">
                        {o.reference_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        o.order_type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {o.order_type === 'food' ? '🍽️ أكل' : '🛍️ منتج'}
                      </span>
                      {o.payment_method === 'instapay' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> InstaPay
                        </span>
                      )}
                      {o.payment_method === 'cod' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> كاش
                        </span>
                      )}
                    </div>
                  </div>

                  {o.supplier && (
                    <p className="text-sm text-gray-800 font-bold mb-1 truncate">
                      {o.supplier.business_name}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {created.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' '}
                    {created.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 gap-2">
                    <span className="text-xs text-gray-500">
                      {o.items_count} {o.items_count === 1 ? 'صنف' : 'أصناف'}
                    </span>
                    <span className="text-sm">
                      <strong className="text-[#2B4521] tabular">
                        {o.total_amount.toLocaleString('ar-EG')}
                      </strong>
                      <span className="text-xs text-gray-500"> ج.م</span>
                    </span>
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </div>

                  {isPending && (
                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 text-center font-bold">
                      افتح الأوردر عشان تشوف خطوات الدفع
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
