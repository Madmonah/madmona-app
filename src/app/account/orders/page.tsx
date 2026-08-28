'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
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

const STATUS_META: Record<OrderStatus, { key: string; color: string }> = {
  pending_payment: { key: 'os.pending_payment', color: 'bg-amber-100 text-amber-800' },
  paid: { key: 'os.paid', color: 'bg-blue-100 text-blue-800' },
  accepted: { key: 'os.accepted', color: 'bg-blue-100 text-blue-800' },
  preparing: { key: 'os.preparing', color: 'bg-indigo-100 text-indigo-800' },
  ready: { key: 'os.ready', color: 'bg-indigo-100 text-indigo-800' },
  out_for_delivery: { key: 'os.out_for_delivery', color: 'bg-purple-100 text-purple-800' },
  delivered: { key: 'os.delivered', color: 'bg-green-100 text-green-800' },
  completed: { key: 'os.completed', color: 'bg-green-100 text-green-700' },
  cancelled: { key: 'os.cancelled', color: 'bg-red-100 text-red-800' },
  refunded: { key: 'os.refunded', color: 'bg-red-100 text-red-800' },
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
  const { t } = useT()
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

      const { data } = await supabaseBrowser
        .from('marketplace_orders')
        .select(`
          id, reference_code, order_type, status, total_amount, currency, payment_method, created_at,
          supplier:marketplace_suppliers(id, business_name),
          items:marketplace_order_items(id)
        `)
        .eq('customer_id', session.user.id)
        .order('created_at', { ascending: false })

      const mapped: OrderSummary[] = ((data || []) as unknown as Array<{
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
      }>).map((o) => ({
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
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">{t('ao.login_first')}</h1>
          <Link
            href="/auth/login?redirect=/account/orders"
            className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold"
          >
            {t('ao.login')}
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
            <h1 className="text-lg font-bold text-gray-900">{t('ao.title')}</h1>
            <p className="text-xs text-gray-500">{t('ao.count', { n: orders.length })}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">{t('ao.empty')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('ao.empty_sub')}</p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#34D399]/90"
            >
              {t('ao.browse')}
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
                        {t(meta.key)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        o.order_type === 'food' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {o.order_type === 'food' ? t('ao.food') : t('ao.product')}
                      </span>
                      {o.payment_method === 'instapay' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> InstaPay
                        </span>
                      )}
                      {o.payment_method === 'cod' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> {t('ao.cash')}
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
                      {t('ao.n_items', { n: o.items_count })}
                    </span>
                    <span className="text-sm">
                      <strong className="text-[#059669] tabular">
                        {o.total_amount.toLocaleString('ar-EG')}
                      </strong>
                      <span className="text-xs text-gray-500"> {t('cart.egp')}</span>
                    </span>
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </div>

                  {isPending && (
                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 text-center font-bold">
                      {t('ao.open_hint')}
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
