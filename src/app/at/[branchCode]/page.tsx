'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ShoppingBag, Plus, Minus, Check, Loader2, Phone, User,
  Clock, MapPin, ChevronLeft, Sparkles, X, Star,
} from 'lucide-react'

/* ============================================================
   /at/[branchCode] — Customer self-service page
   
   Customer scans QR or opens madmonacairo.com/at/HQ
   → Phone entry → Browse menu → Cart → Submit → Confirmation
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Branch = {
  branch_id: string
  branch_name: string
  branch_code: string
  supplier_id: string
  business_name: string
  industry: string
  address: string | null
  district: string | null
  phone: string | null
}

type MenuItem = {
  id: string
  name_ar: string
  category: string | null
  price_egp: number
  duration_minutes?: number
  unit?: string
}

type CartLine = {
  service_id: string
  name_ar: string
  price_egp: number
  duration_minutes?: number
  quantity: number
}

type Step = 'phone' | 'menu' | 'review' | 'success'

export default function CustomerVisitPage({
  params,
}: {
  params: { branchCode: string }
}) {
  const { branchCode } = params

  const [branch, setBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('phone')

  // Phone step
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [submittingPhone, setSubmittingPhone] = useState(false)

  // Menu step
  const [services, setServices] = useState<MenuItem[]>([])
  const [products, setProducts] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [tab, setTab] = useState<'services' | 'products'>('services')

  // Review step
  const [submitting, setSubmitting] = useState(false)
  const [bookingIds, setBookingIds] = useState<string[]>([])

  // Load branch + menu
  useEffect(() => {
    async function loadBranch() {
      const { data } = await supabase.rpc('public_get_branch_by_code', {
        p_branch_code: branchCode,
      })
      const r = data as { ok: boolean; branch?: Branch }
      if (r?.ok && r.branch) {
        setBranch(r.branch)
        // Load menu
        const { data: menu } = await supabase.rpc('public_get_branch_menu', {
          p_supplier_id: r.branch.supplier_id,
        })
        setServices((menu as any)?.services || [])
        setProducts((menu as any)?.products || [])
      }
      setLoading(false)
    }
    loadBranch()
  }, [branchCode])

  // Phone step → upsert customer + start session
  async function continueFromPhone() {
    if (phone.length < 8) return
    setSubmittingPhone(true)
    const { data: c } = await supabase.rpc('customer_upsert', {
      p_phone: phone, p_name: name.trim() || null,
    })
    const cust = c as { ok: boolean; customer_id?: string; error?: string }
    if (!cust?.ok) {
      alert(cust?.error || 'فشل التسجيل')
      setSubmittingPhone(false)
      return
    }
    setCustomerId(cust.customer_id!)

    const { data: s } = await supabase.rpc('customer_start_visit', {
      p_customer_id: cust.customer_id, p_branch_id: branch!.branch_id,
    })
    const sess = s as { ok: boolean; session_id?: string }
    if (sess?.ok) {
      setSessionId(sess.session_id!)
      setStep('menu')
    }
    setSubmittingPhone(false)
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.service_id === item.id)
      if (existing) {
        return prev.map((c) => c.service_id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, {
        service_id: item.id, name_ar: item.name_ar,
        price_egp: item.price_egp, duration_minutes: item.duration_minutes,
        quantity: 1,
      }]
    })
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) => prev.map((c) => 
      c.service_id === itemId 
        ? { ...c, quantity: Math.max(0, c.quantity + delta) }
        : c
    ).filter((c) => c.quantity > 0))
  }

  const cartTotal = cart.reduce((s, c) => s + c.price_egp * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  async function submitOrder() {
    setSubmitting(true)
    const cartPayload = cart.flatMap((c) =>
      Array(c.quantity).fill(null).map(() => ({
        service_id: c.service_id, price_egp: c.price_egp,
      }))
    )
    const { data } = await supabase.rpc('customer_submit_order', {
      p_session_id: sessionId, p_cart: cartPayload, p_payment_method: 'cash',
    })
    const result = data as { ok: boolean; booking_ids?: string[]; total?: number; error?: string }
    if (result?.ok) {
      setBookingIds(result.booking_ids || [])
      setStep('success')
    } else {
      alert(result?.error || 'فشل الإرسال')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  if (!branch) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <h1 className="text-xl font-black text-[#1A2E26] mb-2">فرع غير موجود</h1>
          <p className="text-sm text-[#6B7280]">الكود المطلوب غير صحيح</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Branch header */}
      <header className="bg-[#34D399] text-[#04352A]">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/70 mb-1">
            MADMONA · الحجز الفوري
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {branch.business_name}
          </h1>
          <div className="flex items-center gap-3 text-xs text-white/80 mt-2">
            {branch.district && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {branch.district}
              </span>
            )}
            {branch.phone && <span>📞 {branch.phone}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {step === 'phone' && (
          <PhoneStep
            phone={phone} setPhone={setPhone}
            name={name} setName={setName}
            onContinue={continueFromPhone}
            submitting={submittingPhone}
          />
        )}

        {step === 'menu' && (
          <MenuStep
            services={services}
            products={products}
            tab={tab} setTab={setTab}
            cart={cart} addToCart={addToCart}
            updateQuantity={updateQuantity}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            cart={cart} cartTotal={cartTotal}
            updateQuantity={updateQuantity}
            onBack={() => setStep('menu')}
            onSubmit={submitOrder}
            submitting={submitting}
          />
        )}

        {step === 'success' && (
          <SuccessStep
            branchName={branch.branch_name}
            bookingIds={bookingIds}
            total={cartTotal}
          />
        )}
      </main>

      {/* Sticky cart footer (menu step) */}
      {step === 'menu' && cartCount > 0 && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-3 shadow-2xl">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep('review')}
              className="w-full bg-[#34D399] text-[#04352A] rounded-2xl px-5 py-3.5 font-black flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                مراجعة الطلب ({cartCount})
              </span>
              <span className="font-mono text-lg">{cartTotal.toLocaleString('ar-EG')} ج</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

/* ============================================================
   STEPS
   ============================================================ */
function PhoneStep({ phone, setPhone, name, setName, onContinue, submitting }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8">
      <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#34D399]/10 text-[#059669] mb-4">
        <Phone className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-black text-[#1A2E26] mb-1">أهلاً بيكي!</h2>
      <p className="text-sm text-[#6B7280] mb-5">دخلي بياناتك للبدء في الحجز</p>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold text-[#1A2E26] mb-1.5 block">رقم الموبايل *</label>
          <input
            type="tel" inputMode="tel" autoFocus
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+201xxxxxxxxx"
            className="w-full px-4 py-3 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#059669] font-mono text-lg"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#1A2E26] mb-1.5 block">الاسم</label>
          <input
            type="text"
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: سارة"
            className="w-full px-4 py-3 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#059669]"
          />
        </div>
        <button
          onClick={onContinue}
          disabled={phone.length < 8 || submitting}
          className="w-full bg-[#34D399] text-[#04352A] rounded-xl px-5 py-3.5 font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-shadow hover:shadow-md mt-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>متابعة <ChevronLeft className="w-4 h-4 rotate-180" /></>
          )}
        </button>
        <p className="text-[11px] text-[#6B7280] text-center mt-3">
          عند المتابعة، حضرتك بـ تقبلي شروط Madmona
        </p>
      </div>
    </div>
  )
}

function MenuStep({ services, products, tab, setTab, cart, addToCart, updateQuantity }: any) {
  const items: MenuItem[] = tab === 'services' ? services : products
  const cartByItemId = new Map(cart.map((c: CartLine) => [c.service_id, c.quantity]))

  // Group by category
  const grouped = new Map<string, MenuItem[]>()
  for (const item of items) {
    const k = item.category || 'other'
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k)!.push(item)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-[#1A2E26]">اختاري الخدمات</h2>
        <p className="text-sm text-[#6B7280] mt-1">اضغطي + عشان تضيفي للسلة</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 w-fit">
        <button
          onClick={() => setTab('services')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            tab === 'services' ? 'bg-[#34D399] text-[#04352A]' : 'text-[#6B7280]'
          }`}
        >
          الخدمات ({services.length})
        </button>
        {products.length > 0 && (
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'products' ? 'bg-[#34D399] text-[#04352A]' : 'text-[#6B7280]'
            }`}
          >
            المنتجات ({products.length})
          </button>
        )}
      </div>

      {/* Items grouped by category */}
      {Array.from(grouped.entries()).map(([cat, list]) => (
        <section key={cat} className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-gray-100">
            <p className="text-xs font-bold tracking-wider uppercase text-[#6B7280]">
              {CATEGORY_LABELS[cat] || cat}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {list.map((item) => {
              const qty = cartByItemId.get(item.id) || 0
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-[#1A2E26] mb-0.5">{item.name_ar}</h3>
                    <p className="text-xs text-[#6B7280] flex items-center gap-2">
                      <span className="font-mono font-bold text-[#059669]">{item.price_egp} ج</span>
                      {item.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.duration_minutes}د
                        </span>
                      )}
                    </p>
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-[#34D399] hover:text-[#04352A] text-[#059669] text-sm font-black flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      اضف
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#34D399]/10 rounded-xl px-2 py-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white text-[#059669] grid place-items-center">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black text-[#059669] min-w-[20px] text-center">{Number(qty) || 0}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-[#34D399] text-[#04352A] grid place-items-center">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function ReviewStep({ cart, cartTotal, updateQuantity, onBack, onSubmit, submitting }: any) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-2">
        <ChevronLeft className="w-3.5 h-3.5" />
        رجوع للقائمة
      </button>

      <div>
        <h2 className="text-xl font-black text-[#1A2E26]">مراجعة الطلب</h2>
        <p className="text-sm text-[#6B7280] mt-1">{cart.length} خدمة</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50">
        {cart.map((c: CartLine) => (
          <div key={c.service_id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-[#1A2E26]">{c.name_ar}</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {c.price_egp} ج × {c.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-[#FAFAF7] rounded-lg px-2 py-1">
                <button onClick={() => updateQuantity(c.service_id, -1)} className="text-[#6B7280]">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-[#1A2E26] min-w-[20px] text-center">{c.quantity}</span>
                <button onClick={() => updateQuantity(c.service_id, 1)} className="text-[#6B7280]">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm font-black font-mono text-[#059669]">{(c.price_egp * c.quantity).toLocaleString('ar-EG')} ج</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#6B7280]">إجمالي الفاتورة</span>
          <span className="text-2xl font-black font-mono text-[#1A2E26]">{cartTotal.toLocaleString('ar-EG')} ج</span>
        </div>
        <p className="text-[11px] text-[#6B7280]">الدفع كاش عند الانتهاء من الخدمة</p>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting || cart.length === 0}
        className="w-full bg-[#34D399] text-[#04352A] rounded-2xl px-5 py-4 font-black flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-md transition-shadow"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            <Sparkles className="w-5 h-5" />
            تأكيد الطلب
          </>
        )}
      </button>
    </div>
  )
}

function SuccessStep({ branchName, bookingIds, total }: { branchName: string; bookingIds: string[]; total: number }) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 text-center">
      <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#34D399]/10 text-[#059669] mb-4">
        <Check className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-[#1A2E26] mb-1">طلبك تأكد ✨</h2>
      <p className="text-sm text-[#6B7280] mb-5">الفريق في {branchName} هـ يبدأ خدمتك حالاً</p>

      <div className="bg-[#FAFAF7] rounded-2xl p-4 mb-5">
        <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1">رقم الحجز</p>
        <p className="text-base font-black text-[#1A2E26] font-mono">
          {bookingIds[0]?.slice(0, 8).toUpperCase()}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-0.5">الإجمالي</p>
          <p className="text-xl font-black font-mono text-[#059669]">{total.toLocaleString('ar-EG')} ج</p>
        </div>
      </div>

      <p className="text-xs text-[#6B7280] leading-relaxed">
        ⓘ بعد ما تخلصي الخدمة، هـ نرسلك link عشان تقيّمي تجربتك (يظهر لـ Madmona وصاحب المكان)
      </p>
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  hair: '💇 شعر',
  makeup: '💄 مكياج',
  nails: '💅 أظافر',
  spa: '🧖 سبا',
  hair_products: '🧴 منتجات شعر',
  nail_supplies: '💅 منتجات أظافر',
  makeup_products: '💄 منتجات مكياج',
  other: '✨ أخرى',
}
