'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, ArrowRight, AlertCircle, ShoppingBag, ChevronLeft, Phone, MapPin,
  Clock, CheckCircle, ChefHat, Package, Truck, Home, X, CreditCard,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/orders
// Orders dashboard for a supplier (restaurant + product verticals).
// Mirrors /supplier/marketplace/bookings pattern.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'no-permission' | 'ready'
type StatusFilter = 'all' | 'pending_payment' | 'active' | 'completed' | 'cancelled'

type OrderStatus =
  | 'pending_payment' | 'paid' | 'accepted' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

interface OrderSummary {
  id: string
  reference_code: string | null
  order_type: 'food' | 'product'
  status: OrderStatus
  total_amount: number
  supplier_payout: number
  guest_name: string | null
  guest_phone: string | null
  customer_id: string | null
  delivery_address: string | null
  delivery_district: string | null
  delivery_phone: string | null
  payment_method: 'instapay' | 'cod' | null
  created_at: string
  customer: { phone: string | null; full_name: string | null } | null
  items_count: number
}

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

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending_payment', label: 'بانتظار الدفع' },
  { key: 'active', label: 'جارية' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغية' },
]

const ACTIVE_STATUSES: OrderStatus[] = ['paid', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered']
const COMPLETED_STATUSES: OrderStatus[] = ['completed']
const CANCELLED_STATUSES: OrderStatus[] = ['cancelled', 'refunded']

function statusInFilter(s: OrderStatus, f: StatusFilter): boolean {
  if (f === 'all') return true
  if (f === 'pending_payment') return s === 'pending_payment'
  if (f === 'active') return ACTIVE_STATUSES.includes(s)
  if (f === 'completed') return COMPLETED_STATUSES.includes(s)
  if (f === 'cancelled') return CANCELLED_STATUSES.includes(s)
  return false
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

export default function SupplierOrdersPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [supplierName, setSupplierName] = useState('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }

      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        // staff fallback
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`
            can_manage_bookings,
            supplier:marketplace_suppliers(id, business_name)
          `)
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()
        if (staff && staff.supplier) {
          if (!staff.can_manage_bookings) { setStage('no-permission'); return }
          sup = staff.supplier as typeof sup
        }
      }

      if (!sup) { setStage('no-supplier'); return }
      setSupplierName(sup.business_name)
      setSupplierId(sup.id)
      await loadOrders(sup.id)
      setStage('ready')
    }
    init()
  }, [])

  const loadOrders = async (supId: string) => {
    const { data } = await supabaseBrowser
      .from('marketplace_orders')
      .select(`
        id, reference_code, order_type, status, total_amount, supplier_payout,
        guest_name, guest_phone, customer_id,
        delivery_address, delivery_district, delivery_phone,
        payment_method, created_at,
        customer:profiles!marketplace_orders_customer_id_fkey(phone, full_name),
        items:marketplace_order_items(id)
      `)
      .eq('supplier_id', supId)
      .order('created_at', { ascending: false })

    const mapped: OrderSummary[] = ((data || []) as unknown as Array<Omit<OrderSummary, 'items_count'> & {
      items: { id: string }[]
    }>).map((o) => ({
      ...o,
      items_count: (o.items || []).length,
    }))
    setOrders(mapped)
  }

  const handleRefresh = async () => {
    if (!supplierId) return
    setRefreshing(true)
    await loadOrders(supplierId)
    setRefreshing(false)
  }

  // ---- Stage guards ----
  if (stage === 'loading') {
    return <Center><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></Center>
  }
  if (stage === 'unauthenticated') {
    return <ErrorBlock title="سجل دخول الأول" href="/auth/login" hrefLabel="سجل دخول" />
  }
  if (stage === 'no-supplier') {
    return <ErrorBlock title="مفيش حساب مورد" subtitle="محتاج حساب مورد عشان تشوف الـ orders" href="/supplier/register" hrefLabel="سجّل كمورد" />
  }
  if (stage === 'no-permission') {
    return <ErrorBlock title="مفيش صلاحية" subtitle="مالكش صلاحية إدارة الـ orders" href="/supplier/marketplace" hrefLabel="رجوع" />
  }

  const filtered = orders.filter((o) => statusInFilter(o.status, filter))

  return (
    <div className="min-h-screen gradient-mesh pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/supplier/marketplace" className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">الـ Orders</p>
            <h1 className="text-sm font-bold text-gray-700 truncate">{supplierName}</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs font-bold text-[#059669] px-3 py-1.5 rounded-full hover:bg-[#34D399]/10 disabled:opacity-50 transition-all"
          >
            {refreshing ? '...' : 'حدّث'}
          </button>
        </div>
        {/* Filter tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all'
              ? orders.length
              : orders.filter((o) => statusInFilter(o.status, tab.key)).length
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === tab.key
                    ? 'bg-[#34D399] text-[#04352A] shadow-card'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label} {count > 0 && <span className="ms-1 opacity-80 tabular">({count})</span>}
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card p-10 text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 bg-gray-100 rounded-3xl flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">مفيش orders هنا</h2>
            <p className="text-sm text-gray-500">
              {filter === 'all'
                ? 'لسه ماجاكش أي order. الـ orders هتظهر هنا فور وصولها.'
                : 'مفيش orders بالفلتر ده'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const meta = STATUS_META[o.status]
              const customerName = o.customer?.full_name || o.guest_name || 'عميل'
              const customerPhone = o.customer?.phone || o.guest_phone || ''
              const isNew = o.status === 'paid'

              return (
                <Link
                  key={o.id}
                  href={`/supplier/marketplace/orders/${o.id}`}
                  className={`block bg-white rounded-2xl shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all overflow-hidden no-underline ${
                    isNew ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                  }`}
                >
                  <div className="p-4">
                    {/* Top row: ref + status + age */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-sm tabular text-gray-900" dir="ltr">{o.reference_code}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.fg}`}>
                            {meta.label}
                          </span>
                          {o.order_type === 'food' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">🍽️ أكل</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">🛍️ منتج</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          <span className="font-bold text-gray-700">{customerName}</span>
                          {customerPhone && <span dir="ltr" className="ms-2 tabular">{customerPhone}</span>}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-400 tabular flex-shrink-0">{timeAgo(o.created_at)}</p>
                    </div>

                    {/* Bottom row: items count + payout */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {o.items_count} صنف
                      </span>
                      <span className="font-black text-[#059669] tabular">
                        {o.total_amount.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    {/* Delivery snippet */}
                    {o.delivery_district && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{o.delivery_district}</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
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
          className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-bold shadow-soft hover:shadow-card transition-all"
        >
          {hrefLabel}
        </Link>
      </div>
    </div>
  )
}
