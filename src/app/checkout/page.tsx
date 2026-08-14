'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, MapPin, Phone, User, MessageCircle, Loader2,
  AlertCircle, CheckCircle, CreditCard, ChevronLeft, ShoppingBag, Banknote, Wallet,
} from 'lucide-react'
import {
  useCart, cartSubtotal, clearCart, buildOrderItemsPayload,
} from '@/lib/cart'
import WhatsAppLogin from '@/components/WhatsAppLogin'

// ============================================================================
// /checkout
// Order checkout page. Reads localStorage cart, collects address + payment,
// calls create_order (authenticated) or create_guest_order (guest) RPC,
// then redirects to /order/[ref] on success.
// ============================================================================

type PaymentMethod = 'instapay' | 'cod' | 'wallet'

export default function CheckoutPage() {
  const router = useRouter()
  const cart = useCart()

  const [hydrated, setHydrated] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('instapay')
  // Wallet (authenticated users only): balance + access token for /api/wallet/pay-order
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  // COD (cash on delivery) is offered for restaurant (food) orders only.
  const codAllowed = cart.order_type === 'food'
  // ⚠️ مؤقتًا (قرار محمد 6 يوليو 2026): أوردرات المطاعم = كاش عند الاستلام فقط.
  // للرجوع: خلي FOOD_COD_ONLY = false ويرجع InstaPay/المحفظة للأكل عادي.
  const FOOD_COD_ONLY = true
  const foodCodOnly = FOOD_COD_ONLY && codAllowed
  // Safety: if cart type changes away from food, force back to instapay.
  useEffect(() => {
    if (!codAllowed && payment === 'cod') setPayment('instapay')
  }, [codAllowed, payment])
  // Temporary: food orders are locked to COD.
  useEffect(() => {
    if (foodCodOnly && payment !== 'cod') setPayment('cod')
  }, [foodCodOnly, payment])

  // «شير واكسب»: استخدام رصيد المحفظة كخصم (بحد أقصى عمولة الأوردر) — للمسجلين
  const [useCredit, setUseCredit] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cartSubtotal(cart)
  // Delivery fee: TBD - placeholder 0 for MVP. Supplier-set delivery fees
  // will be added later via supplier dashboard config.
  const deliveryFee = 0
  const total = subtotal + deliveryFee

  // If wallet becomes unavailable or insufficient for the total, fall back to instapay.
  useEffect(() => {
    if (payment === 'wallet' && (walletBalance === null || walletBalance < total)) {
      setPayment('instapay')
    }
  }, [payment, walletBalance, total])

  // Load auth + profile
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.user) {
          setIsAuthed(true)
          const { data: profile } = await supabaseBrowser
            .from('profiles')
            .select('full_name, phone')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile) {
            setProfileName(profile.full_name || '')
            setProfilePhone(profile.phone || '')
            setName(profile.full_name || '')
            setPhone(profile.phone || '')
          }
          // Load wallet balance (cash + credit) for the "pay from wallet" option
          try {
            setAccessToken(session.access_token)
            const wRes = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${session.access_token}` } })
            if (wRes.ok) {
              const wJson = await wRes.json()
              const bal = Number(wJson.wallet?.balance_cash || 0) + Number(wJson.wallet?.balance_credit || 0)
              setWalletBalance(bal)
            }
          } catch { /* wallet optional */ }
        } else {
          setIsAuthed(false)
        }
      } catch (e) {
        console.error('[checkout] auth load error:', e)
        setIsAuthed(false)
      } finally {
        setHydrated(true)
      }
    }
    load()
  }, [])

  // Redirect to /cart if empty (after hydration to avoid SSR mismatch)
  useEffect(() => {
    if (hydrated && cart.items.length === 0) {
      router.replace('/cart')
    }
  }, [hydrated, cart.items.length, router])

  const validatePhone = (raw: string): boolean => {
    const digits = raw.replace(/\D/g, '')
    return /^(01[0-9]{9}|201[0-9]{9})$/.test(digits)
  }

  const handleSubmit = async () => {
    setError(null)

    // Client-side validation
    if (!isAuthed && !name.trim()) {
      setError('الاسم مطلوب')
      return
    }
    if (!validatePhone(phone)) {
      setError('رقم تليفون غير صحيح. لازم يبدأ بـ 01 ويبقى ١١ رقم')
      return
    }
    if (!address.trim()) {
      setError('العنوان مطلوب')
      return
    }
    if (!cart.supplier_id || cart.items.length === 0) {
      setError('السلة فاضية')
      return
    }
    if (cart.order_type !== 'food' && cart.order_type !== 'product') {
      setError('نوع الأوردر غير صحيح')
      return
    }

    setSubmitting(true)

    try {
      const itemsPayload = buildOrderItemsPayload(cart)
      const rpcName = isAuthed ? 'create_order' : 'create_guest_order'

      const args: Record<string, unknown> = {
        p_supplier_id: cart.supplier_id,
        p_primary_listing_id: cart.primary_listing_id ?? null,
        p_order_type: cart.order_type,
        p_items: itemsPayload,
        p_delivery_address: address.trim(),
        p_delivery_phone: phone.replace(/\D/g, ''),
        p_delivery_city: city.trim() || null,
        p_delivery_district: district.trim() || null,
        p_delivery_notes: null,
        p_delivery_fee: deliveryFee,
        p_payment_method: payment,
        p_customer_notes: notes.trim() || null,
      }

      // Guest variant also needs name + phone (used as guest_name/guest_phone)
      if (!isAuthed) {
        args.p_guest_name = name.trim()
        args.p_guest_phone = phone.replace(/\D/g, '')
      }

      // @ts-expect-error
      const { data, error: rpcError } = await supabaseBrowser.rpc(rpcName, args)

      if (rpcError) {
        console.error('[checkout] rpc error:', rpcError)
        setError(rpcError.message || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }

      const result = data as { order_id?: string; reference_code?: string }
      if (!result?.order_id || !result?.reference_code) {
        // 🐛 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) الـRPC نجح غالبًا والأوردر
        // موجود فعلًا — إعادة تفعيل الزرار هنا كانت بتخلّي العميل يدوس تاني
        // ويتعمل أوردر تاني مطابق والمورد يجهّز الاتنين. الزرار يفضل متقفل
        // والكارت يتمسح — والعميل يتوجّه لأوردراته/الواتساب بدل إعادة الإرسال.
        clearCart()
        setError('الأوردر اتسجّل بس حصلت مشكلة في التأكيد — شوف «أوردراتي» أو كلّمنا على واتساب. متعملش الأوردر تاني.')
        return
      }

      // Wallet payment: charge the order from the wallet (atomic, server-side).
      if (payment === 'wallet') {
        try {
          const payRes = await fetch('/api/wallet/pay-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ order_id: result.order_id }),
          })
          if (!payRes.ok) {
            const pj = await payRes.json().catch(() => ({}))
            const msg = pj.error === 'insufficient_funds'
              ? 'الرصيد مش كافٍ. الأوردر اتعمل وتقدر تدفعه بطريقة تانية من صفحة الأوردر.'
              : 'تعذّر الدفع من المحفظة. الأوردر اتعمل وتقدر تدفعه من صفحة الأوردر.'
            clearCart()
            setError(msg)
            router.replace(`/order/${result.reference_code}?id=${result.order_id}`)
            return
          }
        } catch (e) {
          console.error('[checkout] wallet pay error:', e)
        }
      }

      // «شير واكسب»: خصم رصيد المحفظة (حتى عمولة الأوردر) — best-effort، مايوقفش الأوردر
      if (payment !== 'wallet' && isAuthed && accessToken && useCredit) {
        try {
          await fetch('/api/wallet/apply-discount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ order_id: result.order_id }),
          })
        } catch { /* الخصم اختياري */ }
      }

      // Clear cart and redirect to tracking page
      clearCart()
      router.replace(`/order/${result.reference_code}?id=${result.order_id}`)
    } catch (e) {
      console.error('[checkout] submit error:', e)
      setError(e instanceof Error ? e.message : 'حصل خطأ مش متوقع')
      setSubmitting(false)
    }
  }

  // Loading state until hydrated + cart known
  if (!hydrated || isAuthed === null) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
      </div>
    )
  }

  // Redirect handled in useEffect; render nothing during redirect
  if (cart.items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen gradient-mesh pb-32 lg:pb-12" dir="rtl">
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            href="/cart"
            className="w-9 h-9 bg-white shadow-soft hover:shadow-card rounded-full flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-sm font-bold text-gray-700 flex-1">تأكيد الطلب</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Order summary card */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#059669]" />
              ملخّص الطلب
            </h2>
            <Link href="/cart" className="text-xs font-bold text-[#059669] hover:underline">
              تعديل السلة
            </Link>
          </div>
          {cart.supplier_name && (
            <p className="text-xs text-gray-500 mb-3">
              من <strong className="text-gray-700">{cart.supplier_name}</strong>
            </p>
          )}
          <div className="space-y-2 mb-4">
            {cart.items.map((it) => (
              <div key={it.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate flex-1">
                  {it.name} <span className="text-gray-400 tabular">×{it.quantity}</span>
                </span>
                <span className="font-bold text-gray-900 tabular flex-shrink-0">
                  {(it.unit_price * it.quantity).toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span className="font-bold tabular">{subtotal.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">التوصيل</span>
              <span className="font-bold tabular text-gray-500">
                {deliveryFee === 0 ? 'يتحدد لاحقًا' : `${deliveryFee.toLocaleString('ar-EG')} ج.م`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-black text-gray-900">الإجمالي</span>
              <span className="text-xl font-black text-[#059669] tabular">
                {total.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          </div>
        </section>

        {/* 🔑 (17 Jul 2026) ضيف؟ ادخل بالواتساب في ثانية — بيفتح المحفظة
            وخصم «شير واكسب» وتتبع الأوردرات. الضيف لسه يقدر يكمل عادي. */}
        {!isAuthed && (
          <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-75">
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              <b className="text-[#059669]">عندك حساب أو أول مرة؟</b> ادخل بالواتساب في ثانية —
              هيتفعّلك رصيد «شير واكسب» والمحفظة وتتبّع أوردراتك.
            </p>
            <WhatsAppLogin
              label="ادخل بالواتساب قبل ما تأكّد 🧞"
              onDone={() => window.location.reload()}
            />
          </section>
        )}

        {/* Contact info */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-100">
          <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#059669]" />
            بياناتك
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                الاسم {!isAuthed && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك الكامل"
                disabled={!!isAuthed && !!profileName}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                رقم الموبايل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01x xxxx xxxx"
                  dir="ltr"
                  className="w-full ps-4 pe-10 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium tabular text-right"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Delivery address */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-200">
          <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#059669]" />
            عنوان التوصيل
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="الشارع + اسم العمارة + رقم الشقة + علامة مميزة"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">المدينة</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="القاهرة"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">المنطقة</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="مصر الجديدة"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلا: اتصل قبل الوصول، البواب اسمه عم محمود..."
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium resize-none"
              />
            </div>
          </div>
        </section>

        {/* Payment method. InstaPay always; COD shown for restaurant (food) orders only. */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-300">
          <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#059669]" />
            طريقة الدفع
          </h2>
          <div className="space-y-3">
            {/* Wallet option — authenticated users only (hidden for food while COD-only is on) */}
            {!foodCodOnly && isAuthed && walletBalance !== null && (
              <button
                type="button"
                disabled={walletBalance < total}
                onClick={() => walletBalance >= total && setPayment('wallet')}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                  walletBalance < total
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : payment === 'wallet'
                      ? 'border-[#059669] bg-[#34D399]/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">الدفع من المحفظة</p>
                  <p className="text-[11px] text-gray-500">
                    رصيدك الحالي: {walletBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                    {walletBalance < total ? ' — رصيد غير كافٍ' : ' — خصم فوري'}
                  </p>
                </div>
                {payment === 'wallet' && <CheckCircle className="w-5 h-5 text-[#059669] flex-shrink-0" />}
              </button>
            )}

            {/* InstaPay option (hidden for food while COD-only is on) */}
            {!foodCodOnly && (
            <button
              type="button"
              onClick={() => setPayment('instapay')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                payment === 'instapay'
                  ? 'border-[#059669] bg-[#34D399]/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#34D399] text-[#04352A] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">InstaPay / فودافون كاش — على حساب مضمونة</p>
                <p className="text-[11px] text-gray-500">
                  تحويل على مضمونة، وفلوسك محمية لحد ما يوصلك الأوردر سليم
                </p>
              </div>
              {payment === 'instapay' && <CheckCircle className="w-5 h-5 text-[#059669] flex-shrink-0" />}
            </button>
            )}

            {/* Cash on delivery — restaurants only */}
            {codAllowed && (
              <button
                type="button"
                onClick={() => setPayment('cod')}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${
                  payment === 'cod'
                    ? 'border-[#059669] bg-[#34D399]/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">كاش عند الاستلام</p>
                  <p className="text-[11px] text-gray-500">
                    {foodCodOnly ? 'ادفع كاش وقت ما يوصلك الأوردر — الدفع الأونلاين للمطاعم راجع قريبًا' : 'ادفع كاش للمندوب وقت ما يوصلك الأوردر — للمطاعم بس'}
                  </p>
                </div>
                {payment === 'cod' && <CheckCircle className="w-5 h-5 text-[#059669] flex-shrink-0" />}
              </button>
            )}

            {/* «شير واكسب»: خصم رصيد المحفظة تلقائيًا (للمسجلين) */}
            {isAuthed && payment !== 'wallet' && (
              <label className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-[#2FA084]/50 bg-[#F0F7F4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                  className="w-4 h-4 accent-[#059669]"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  <b className="text-[#059669]">استخدم رصيد «شير واكسب»</b> لو متاح — خصم تلقائي من إجمالي الطلب (بحد أقصى عمولة مضمونة في الطلب)
                </span>
              </label>
            )}
          </div>
        </section>

        {/* Trust note */}
        <div className="bg-gradient-to-l from-[#34D399]/5 to-transparent border border-[#059669]/10 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#2FA084] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 leading-relaxed">
            <p className="font-bold mb-1">حماية كاملة من مضمونة</p>
            <p>فلوسك بتعدّي علينا الأول وبتروح للمورد بعد ما يوصلك الأوردر سليم. لو حصل أي مشكلة، إحنا معاك على واتساب ٢٤/٧.</p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2.5 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Desktop submit */}
        <div className="hidden lg:flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#34D399] text-[#04352A] px-10 py-4 rounded-2xl font-bold shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التأكيد...
              </>
            ) : (
              <>
                أكّد الأوردر · {total.toLocaleString('ar-EG')} ج.م
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Mobile sticky submit */}
      <div className="fixed bottom-0 inset-x-0 glass border-t border-white/40 z-50 lg:hidden shadow-luxe">
        <div className="max-w-3xl mx-auto p-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-4 rounded-2xl font-bold shadow-elevated hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التأكيد...
              </>
            ) : (
              <>
                أكّد الأوردر · {total.toLocaleString('ar-EG')} ج.م
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
