'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageProvider'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, MapPin, Phone, User, MessageCircle, Loader2,
  AlertCircle, CheckCircle, CreditCard, ChevronLeft, ShoppingBag, Banknote, Wallet,
} from 'lucide-react'
import {
  useCart, cartSubtotal, clearCart, buildOrderItemsPayload,
} from '@/lib/cart'
import { currencyLabel } from '@/lib/currency'
import WhatsAppLogin from '@/components/WhatsAppLogin'

// ============================================================================
// /checkout
// Order checkout page. Reads localStorage cart, collects address + payment,
// calls create_order (authenticated) or create_guest_order (guest) RPC,
// then redirects to /order/[ref] on success.
// ============================================================================

type PaymentMethod = 'instapay' | 'cod' | 'wallet'

export default function CheckoutPage() {
  const { t, locale } = useT()
  const nf = (n: number) => n.toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US')
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
  // 💵 (١٤ أغسطس ٢٠٢٦ — محمد) الكاش عند الاستلام بقى **متاح على كل الأقسام**
  //    كأوبشن، مش للمطاعم بس. السبب مش تفضيل — ده اللي بيخلّي الأوردر يمشي:
  //    في create_order/create_guest_order، الكاش بيدخل الأوردر بحالة `paid`
  //    فورًا ويروح لطابور المورد، أما InstaPay بيسيبه `pending_payment`
  //    مستني تحويل يدوي. كل الـ٦ أوردرات القديمة واقفة على `pending_payment`
  //    من ٤ يونيو عشان كده بالظبط.
  const codAllowed = true
  const isFoodOrder = cart.order_type === 'food'
  // ⚠️ مؤقتًا (قرار محمد 6 يوليو 2026): أوردرات المطاعم = كاش عند الاستلام فقط.
  // للرجوع: خلي FOOD_COD_ONLY = false ويرجع InstaPay/المحفظة للأكل عادي.
  const FOOD_COD_ONLY = true
  const foodCodOnly = FOOD_COD_ONLY && isFoodOrder
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

  // 📍 (١٤ أغسطس ٢٠٢٦ — محمد) لوكيشن التوصيل. الأعمدة (delivery_lat/lng)
  //    موجودة في الجدول من الأول بس مكانش في حاجة بتملاها — المندوب كان
  //    بياخد عنوان مكتوب وبس. بيتبعت بعد إنشاء الأوردر عن طريق
  //    set_order_location (محمية بالـreference_code).
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'denied' | 'unsupported'>('idle')

  function shareLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoState('unsupported'); return }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoState('idle') },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = cartSubtotal(cart)

  // 🛵 (١٤ أغسطس ٢٠٢٦ — محمد) سعر التوصيل. كان `const deliveryFee = 0`
  //    مكتوب في الكود ومعاه تعليق "MVP placeholder"، يعني **كل** أوردر كان
  //    توصيل مجاني — رغم إن `delivery_fee` مربوط صح في كل حتة بعد كده
  //    (صفحة المورد · الأدمن · الـintegrations · عروض الأسعار).
  //    دلوقتي بييجي من get_delivery_fee(supplier, subtotal): سعر المورد،
  //    وإلا الافتراضي من site_settings.default_delivery_fee، ومجانًا لو
  //    الأوردر عدّى free_delivery_over.
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [freeOver, setFreeOver] = useState<number | null>(null)

  useEffect(() => {
    if (!cart.supplier_id) return
    let cancelled = false
    ;(async () => {
      try {
        // 15 Aug 2026: .bind() required - detached rpc throws on this.rest
        const rpc = supabaseBrowser.rpc.bind(supabaseBrowser) as unknown as
          (fn: string, a: Record<string, unknown>) => Promise<{ data: unknown }>
        const { data } = await rpc('get_delivery_fee', {
          p_supplier_id: cart.supplier_id, p_subtotal: subtotal,
        })
        if (cancelled) return
        const d = data as { fee?: number; free_over?: number | null } | null
        setDeliveryFee(Number(d?.fee ?? 0))
        setFreeOver(d?.free_over ?? null)
      } catch { /* لو فشل، التوصيل يفضل صفر — مانوقفش الأوردر */ }
    })()
    return () => { cancelled = true }
  }, [cart.supplier_id, subtotal])

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
      setError(t('co.err_name'))
      return
    }
    if (!validatePhone(phone)) {
      setError(t('co.err_phone'))
      return
    }
    if (!address.trim()) {
      setError(t('co.err_address'))
      return
    }
    if (!cart.supplier_id || cart.items.length === 0) {
      setError(t('co.err_empty'))
      return
    }
    if (cart.order_type !== 'food' && cart.order_type !== 'product') {
      setError(t('co.err_type'))
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
        setError(rpcError.message || t('co.err_generic'))
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
        setError(t('co.err_confirm'))
        return
      }

      // 📍 اللوكيشن (لو العميل شاركه) — بعد ما الأوردر يتعمل ونبقى معانا
      //    الـreference_code. فشلها مايوقفش الأوردر بأي حال.
      if (geo) {
        try {
          await (supabaseBrowser.rpc.bind(supabaseBrowser) as unknown as (fn: string, a: Record<string, unknown>) => Promise<unknown>)(
            'set_order_location',
            { p_order_id: result.order_id, p_reference_code: result.reference_code, p_lat: geo.lat, p_lng: geo.lng },
          )
        } catch { /* اللوكيشن إضافة، مش شرط */ }
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
              ? t('co.wallet_low')
              : t('co.wallet_fail')
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
      setError(e instanceof Error ? e.message : t('co.err_unexpected'))
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
          <h1 className="text-sm font-bold text-gray-700 flex-1">{t('co.title')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Order summary card */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#059669]" />
              {t('co.summary')}
            </h2>
            <Link href="/cart" className="text-xs font-bold text-[#059669] hover:underline">
              {t('co.edit_cart')}
            </Link>
          </div>
          {cart.supplier_name && (
            <p className="text-xs text-gray-500 mb-3">
              {t('co.from')} <strong className="text-gray-700">{cart.supplier_name}</strong>
            </p>
          )}
          <div className="space-y-2 mb-4">
            {cart.items.map((it) => (
              <div key={it.key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate flex-1">
                  {it.name} <span className="text-gray-400 tabular">×{it.quantity}</span>
                </span>
                <span className="font-bold text-gray-900 tabular flex-shrink-0">
                  {nf(it.unit_price * it.quantity)} {currencyLabel(cart.currency, locale)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('co.subtotal')}</span>
              <span className="font-bold tabular">{nf(subtotal)} {currencyLabel(cart.currency, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('co.delivery')}</span>
              <span className="font-bold tabular text-gray-500">
                {deliveryFee === 0
                  ? (freeOver !== null && subtotal >= freeOver ? t('co.free_celebrate') : t('co.free'))
                  : `${nf(Number(deliveryFee))} ${currencyLabel(cart.currency, locale)}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-black text-gray-900">{t('co.total')}</span>
              <span className="text-xl font-black text-[#059669] tabular">
                {nf(total)} {currencyLabel(cart.currency, locale)}
              </span>
            </div>
          </div>
        </section>

        {/* 🔑 (17 Jul 2026) ضيف؟ ادخل بالواتساب في ثانية — بيفتح المحفظة
            وخصم «شير واكسب» وتتبع الأوردرات. الضيف لسه يقدر يكمل عادي. */}
        {!isAuthed && (
          <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-75">
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              <b className="text-[#059669]">{t('co.login_pre')}</b> {t('co.login_post')}
              
            </p>
            <WhatsAppLogin
              label={t('co.login_btn')}
              onDone={() => window.location.reload()}
            />
          </section>
        )}

        {/* Contact info */}
        <section className="bg-white rounded-3xl shadow-soft p-5 animate-slide-up delay-100">
          <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#059669]" />
            {t('co.your_details')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {t('co.name')} {!isAuthed && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('co.name_ph')}
                disabled={!!isAuthed && !!profileName}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {t('co.mobile')} <span className="text-red-500">*</span>
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
            {t('co.address_title')}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {t('co.address')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('co.address_ph')}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium resize-none"
              />
            </div>

            {/* 📍 شارك موقعك — بيتسجّل مع الأوردر عشان المندوب يوصل بالظبط */}
            <button
              type="button"
              onClick={shareLocation}
              disabled={geoState === 'loading'}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-right transition-all ${
                geo ? 'border-[#059669] bg-[#34D399]/5' : 'border-dashed border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                geo ? 'bg-[#34D399] text-[#04352A]' : 'bg-gray-100 text-gray-500'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-gray-900">
                  {geo ? t('co.geo_saved') : t('co.geo_share')}
                </p>
                <p className="text-[11px] text-gray-500">
                  {geoState === 'loading' ? t('co.geo_loading')
                    : geoState === 'denied' ? t('co.geo_denied')
                    : geoState === 'unsupported' ? t('co.geo_unsupported')
                    : geo ? t('co.geo_found')
                    : t('co.geo_hint')}
                </p>
              </div>
              {geo && <CheckCircle className="w-5 h-5 text-[#059669] flex-shrink-0" />}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('co.city')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('co.city_ph')}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('co.district')}</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder={t('co.district_ph')}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {t('co.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('co.notes_ph')}
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
            {t('co.payment')}
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
                  <p className="font-bold text-sm text-gray-900">{t('co.wallet')}</p>
                  <p className="text-[11px] text-gray-500">
                    {t('co.wallet_balance')} {walletBalance.toLocaleString(locale.startsWith('ar') ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencyLabel(cart.currency, locale)}
                    {walletBalance < total ? t('co.wallet_insufficient') : t('co.wallet_instant')}
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
                <p className="font-bold text-sm text-gray-900">{t('co.instapay')}</p>
                <p className="text-[11px] text-gray-500">
                  {t('co.instapay_sub')}
                </p>
              </div>
              {payment === 'instapay' && <CheckCircle className="w-5 h-5 text-[#059669] flex-shrink-0" />}
            </button>
            )}

            {/* كاش عند الاستلام — متاح على كل الأقسام */}
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
                  <p className="font-bold text-sm text-gray-900">{t('co.cod')}</p>
                  <p className="text-[11px] text-gray-500">
                    {foodCodOnly ? t('co.cod_food') : t('co.cod_sub')}
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
                  <b className="text-[#059669]">{t('co.share_earn')}</b> {t('co.share_earn_sub')}
                </span>
              </label>
            )}
          </div>
        </section>

        {/* Trust note */}
        <div className="bg-gradient-to-l from-[#34D399]/5 to-transparent border border-[#059669]/10 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#2FA084] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 leading-relaxed">
            <p className="font-bold mb-1">{t('co.protection')}</p>
            <p>{t('co.protection_sub')}</p>
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
                {t('co.confirming')}
              </>
            ) : (
              <>
                {t('co.confirm_btn')} · {nf(total)} {currencyLabel(cart.currency, locale)}
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
                {t('co.confirming')}
              </>
            ) : (
              <>
                {t('co.confirm_btn')} · {nf(total)} {currencyLabel(cart.currency, locale)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
