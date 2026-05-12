'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Loader2, AlertCircle, CheckCircle,
  Lock, MapPin, Image as ImageIcon, Building2, ShieldCheck, Clock, CreditCard, MessageCircle,
} from 'lucide-react'
import { isDemoListing, cleanListingTitle } from '@/lib/listingHelpers'

// ============================================================================
// /marketplace/[slug]/book
//
// Booking creation page.
// Customer picks: pricing rule + date/time range
// Calculates: duration, base, commission, total
// Submits: marketplace_bookings row with pending_payment status
// Fires: /api/bookings/notify (fire-and-forget) for email notification
//
// KYC GATE (relaxed v2):
//   This is where the supplier KYC approval gate lives. Pending suppliers can
//   list, but customers can't book from them until they're approved. We show
//   a clear "supplier under review" message instead of a generic error.
// ============================================================================

interface ListingForBooking {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  status: string
  requires_id_verification: boolean | null
  supplier: {
    id: string
    business_name: string
    commission_rate: number | string
    kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  } | null
  photos: { url: string; is_primary: boolean }[] | null
}

interface PricingRule {
  id: string
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'per_event'
  period_count: number
  price: number | string
  currency: string
  min_periods: number | null
  max_periods: number | null
  label_ar: string | null
  is_active: boolean
}

const PERIOD_LABELS: Record<string, string> = {
  hourly: 'بالساعة',
  daily: 'باليوم',
  weekly: 'بالأسبوع',
  monthly: 'بالشهر',
  per_event: 'مرة واحدة',
}

const PERIOD_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  per_event: 0,
}

type Stage =
  | 'loading'
  | 'unauthenticated'
  | 'not-found'
  | 'demo-not-bookable'  // <-- NEW: blocks direct URL access to DEMO listings
  | 'supplier-not-approved'
  | 'ready'
  | 'submitting'

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [stage, setStage] = useState<Stage>('loading')
  const [listing, setListing] = useState<ListingForBooking | null>(null)
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ID verification state for listings that require it
  const [userNationalId, setUserNationalId] = useState<string | null>(null)
  const [providedNationalId, setProvidedNationalId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setUserId(session.user.id)

      // @ts-expect-error
      const { data: l, error: listingErr } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, status, requires_id_verification,
          supplier:marketplace_suppliers(id, business_name, commission_rate, kyc_status),
          photos:listing_photos(url, is_primary)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (listingErr || !l) {
        setStage('not-found')
        return
      }
      const listingData = l as ListingForBooking
      setListing(listingData)

      // Block direct URL access to DEMO listings (they're not bookable)
      if (isDemoListing(listingData.title)) {
        setStage('demo-not-bookable')
        return
      }

      // KYC gate: only allow booking if supplier exists and is approved.
      // Pending suppliers can have published listings but can't accept bookings yet.
      const supplierStatus = listingData.supplier?.kyc_status
      if (!listingData.supplier || supplierStatus !== 'approved') {
        setStage('supplier-not-approved')
        return
      }

      // @ts-expect-error
      const { data: rules } = await supabaseBrowser
        .from('pricing_rules')
        .select('*')
        .eq('listing_id', l.id)
        .eq('is_active', true)
        .order('price', { ascending: true })

      const activeRules = (rules || []) as PricingRule[]
      setPricingRules(activeRules)
      if (activeRules.length > 0) {
        setSelectedRuleId(activeRules[0].id)
      }

      // Load user's national_id if exists (for ID verification flow)
      // Column may not exist in all DBs (migration: ALTER TABLE profiles ADD COLUMN national_id TEXT;)
      try {
        // @ts-expect-error
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('national_id')
          .eq('id', session.user.id)
          .maybeSingle()
        if (profile?.national_id) {
          setUserNationalId(profile.national_id)
          setProvidedNationalId(profile.national_id)
        }
      } catch {
        // Column doesn't exist - silent fail
      }

      setStage('ready')
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const selectedRule = pricingRules.find(r => r.id === selectedRuleId) || null

  const calcPricing = () => {
    if (!selectedRule || !startAt || !endAt) {
      return { periods: 0, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: '' }
    }
    const start = new Date(startAt).getTime()
    const end = new Date(endAt).getTime()
    if (end <= start) {
      return { periods: 0, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: 'تاريخ النهاية لازم يكون بعد البداية' }
    }
    let periods = 1
    if (selectedRule.period_type !== 'per_event') {
      const ms = PERIOD_MS[selectedRule.period_type]
      periods = Math.ceil((end - start) / ms)
      if (periods < 1) periods = 1
    }
    if (selectedRule.min_periods && periods < selectedRule.min_periods) {
      return { periods, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: `الحد الأدنى ${selectedRule.min_periods} فترة` }
    }
    if (selectedRule.max_periods && periods > selectedRule.max_periods) {
      return { periods, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: `الحد الأقصى ${selectedRule.max_periods} فترة` }
    }

    const price = Number(selectedRule.price)
    const baseAmount = price * periods
    const commissionRate = Number(listing?.supplier?.commission_rate || 10)
    const commission = Math.round((baseAmount * commissionRate / 100) * 100) / 100
    const total = baseAmount
    const supplierPayout = Math.round((baseAmount - commission) * 100) / 100

    return { periods, baseAmount, commission, total, supplierPayout, valid: true, error: '' }
  }

  const pricing = calcPricing()

  // Fire-and-forget email notification (non-blocking)
  const fireEmailNotification = async (bookingId: string, event: 'created' | 'confirmed') => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return
      void fetch('/api/bookings/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_id: bookingId, event }),
      }).catch(() => {/* swallow — not critical */})
    } catch {
      // ignore
    }
  }

  const handleSubmit = async () => {
    if (!listing?.supplier || !selectedRule || !pricing.valid || !userId) return
    // Defense-in-depth: even if UI was bypassed, double-check before submit
    if (listing.supplier.kyc_status !== 'approved') {
      setError('صاحب الإعلان ده لسه قيد التحقق من إدارة Madmona. الحجز هيتفعّل قريب.')
      return
    }
    setError(null)
    setStage('submitting')

    try {
      const startIso = new Date(startAt).toISOString()
      const endIso = new Date(endAt).toISOString()

      // @ts-expect-error
      const { data: conflictData, error: conflictErr } = await supabaseBrowser
        .rpc('check_booking_conflict', {
          p_listing_id: listing.id,
          p_start_at: startIso,
          p_end_at: endIso,
        })

      if (conflictErr) {
        console.warn('Conflict check failed, continuing:', conflictErr.message)
      } else if (conflictData === true) {
        setError('الفترة دي محجوزة بالفعل. اختار وقت تاني.')
        setStage('ready')
        return
      }

      const commissionRate = Number(listing.supplier.commission_rate || 10)

      const insertData: Record<string, unknown> = {
        customer_id: userId,
        listing_id: listing.id,
        supplier_id: listing.supplier.id,
        pricing_rule_id: selectedRule.id,
        start_at: startIso,
        end_at: endIso,
        base_amount: pricing.baseAmount,
        commission_rate: commissionRate,
        commission_amount: pricing.commission,
        tax_amount: 0,
        total_amount: pricing.total,
        supplier_payout: pricing.supplierPayout,
        currency: selectedRule.currency || 'EGP',
        status: listing.requires_id_verification ? 'pending_id_verification' : 'pending_payment',
      }
      if (customerNotes.trim()) insertData.customer_notes = customerNotes.trim()

      // If listing requires ID verification, save the customer's ID
      if (listing.requires_id_verification && providedNationalId.trim()) {
        insertData.id_verification_status = 'pending'
        insertData.customer_national_id = providedNationalId.trim()
        // Also save it on the user's profile for future bookings
        try {
          // @ts-expect-error
          await supabaseBrowser
            .from('profiles')
            .update({ national_id: providedNationalId.trim() })
            .eq('id', userId)
        } catch {
          // silent
        }
      }

      // @ts-expect-error
      const { data: newBooking, error: insertErr } = await supabaseBrowser
        .from('marketplace_bookings')
        .insert(insertData)
        .select('id, reference_code')
        .single()

      if (insertErr) throw insertErr

      // Fire email to supplier (non-blocking)
      fireEmailNotification(newBooking.id, 'created')

      router.push(`/bookings/${newBooking.id}?created=1`)
    } catch (e: unknown) {
      // Surface the REAL error — Supabase PostgrestError objects are not
      // instanceof Error, so the old code always fell through to the
      // generic message and hid the root cause.
      console.error('[booking] submit error:', e)
      let msg = 'حصل خطأ، حاول تاني'
      if (e && typeof e === 'object') {
        const err = e as { message?: string; details?: string; hint?: string; code?: string }
        const parts: string[] = []
        if (err.message) parts.push(err.message)
        if (err.details) parts.push(err.details)
        if (err.hint) parts.push(`(${err.hint})`)
        if (err.code) parts.push(`[${err.code}]`)
        if (parts.length > 0) msg = parts.join(' — ')
      }
      setError(msg)
      setStage('ready')
    }
  }

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
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="font-bold mb-2">سجّل دخول الأول</h1>
          <p className="text-sm text-gray-600 mb-6">عشان تحجز، لازم تسجّل دخول أو تعمل حساب جديد.</p>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent(`/marketplace/${slug}/book`)}`}
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold mb-2"
          >
            تسجيل دخول
          </Link>
          <Link
            href={`/auth/signup?redirect=${encodeURIComponent(`/marketplace/${slug}/book`)}`}
            className="block w-full text-sm text-gray-600 hover:text-[#1F5F3F]"
          >
            مفيش حساب؟ اعمل حساب جديد
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'not-found' || !listing) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-4">الـlisting ده مش موجود</h1>
          <Link href="/marketplace" className="bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold">
            تصفح
          </Link>
        </div>
      </div>
    )
  }

  // KYC gate: friendly message when supplier isn't approved yet
  if (stage === 'supplier-not-approved') {
    const supplierStatus = listing.supplier?.kyc_status
    const isSuspended = supplierStatus === 'suspended' || supplierStatus === 'rejected'
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">احجز</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto p-4 pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className={`flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 ${
              isSuspended ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              {isSuspended ? (
                <AlertCircle className="w-7 h-7 text-red-500" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-yellow-700" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isSuspended ? 'الحجز مش متاح حالياً' : 'صاحب الإعلان قيد التحقق'}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {isSuspended ? (
                <>الـlisting ده مش متاح للحجز دلوقتي. تقدر تتصفح ليستنجز تانية.</>
              ) : (
                <>
                  صاحب الإعلان <strong className="text-gray-900">{listing.supplier?.business_name || ''}</strong> لسه بنوثق حسابه عند Madmona،
                  وعشان أمانك الحجز هيتفتح بعد ما يخلص التحقق.
                  <br />
                  <span className="block mt-2 text-xs text-gray-500">
                    عادة بياخد أقل من ٢٤ ساعة. اعملنا حفظ في المفضلة وهنبعتلك إشعار لما الحجز يفتح.
                  </span>
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href={`/marketplace/${slug}`}
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
              >
                ارجع للـlisting
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-[#1F5F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#1F5F3F]/90"
              >
                تصفح ليستنجز تانية
              </Link>
            </div>
            {!isSuspended && (
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 mt-4 text-xs text-[#1F5F3F] hover:underline"
              >
                <Clock className="w-3.5 h-3.5" />
                اسأل Madmona عن صاحب الإعلان ده
              </a>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Coming Soon gate: DEMO listings are visible but not bookable
  if (stage === 'demo-not-bookable' && listing) {
    const displayTitle = cleanListingTitle(listing.title)
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">احجز</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto p-4 pt-12">
          <div className="bg-white rounded-2xl border-2 border-amber-400 p-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 bg-amber-100">
              <Clock className="w-7 h-7 text-amber-700" />
            </div>
            <h2 className="text-xl font-black text-amber-900 mb-2 text-center">الحجز مش مفعل للنماذج</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-6 text-center">
              “<strong>{displayTitle}</strong>” ده نموذج للعرض · متوفر قريباً. لسّه مفيش موردين حقيقيين في الفئة دي.
              <br />
              <span className="block mt-2 text-xs text-gray-500">
                لو حابب تتبلّغ لما يبقى متاح، كلّمنا واتساب وهنبعتلك إشعار أول ما نلاقي صاحب الإعلان في الفئة دي.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={`https://wa.me/201002229982?text=${encodeURIComponent(`مرحباً، شفت "${displayTitle}" على Madmona وعايز أعرف إمتى هيبقى متاح`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold no-underline hover:bg-[#25D366]/90"
              >
                <MessageCircle className="w-4 h-4" />
                بلّغني لما يبقى متاح
              </a>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-[#1F5F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#1F5F3F]/90"
              >
                تصفح ليستنجز حقيقية
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (pricingRules.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مفيش أسعار للـlisting ده</h1>
          <p className="text-sm text-gray-600 mb-4">للحجز، تواصل مباشرة مع صاحب الإعلان.</p>
          <Link href={`/marketplace/${slug}`} className="bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-semibold inline-block">
            ارجع للـlisting
          </Link>
        </div>
      </div>
    )
  }

  const photos = listing.photos || []
  const primary = photos.find(p => p.is_primary) || photos[0]
  const photoUrl = primary?.url

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">احجز</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-24">
        {/* Listing summary */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 flex">
          <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 p-3 min-w-0">
            <h2 className="font-bold text-gray-900 truncate">{listing.title}</h2>
            {listing.supplier && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {listing.supplier.business_name}
              </p>
            )}
            {(listing.district || listing.city) && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[listing.district, listing.city].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Pricing rule selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">طريقة التسعير</h3>
          <div className="space-y-2">
            {pricingRules.map(rule => (
              <label
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                  selectedRuleId === rule.id
                    ? 'border-[#1F5F3F] bg-[#1F5F3F]/5'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rule"
                    checked={selectedRuleId === rule.id}
                    onChange={() => setSelectedRuleId(rule.id)}
                    className="w-4 h-4 text-[#1F5F3F]"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {rule.label_ar || PERIOD_LABELS[rule.period_type] || rule.period_type}
                  </span>
                </div>
                <span className="font-bold text-[#1F5F3F]">
                  {Number(rule.price).toLocaleString('ar-EG')} ج.م
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date/time picker */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1F5F3F]" /> تاريخ الحجز
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">من</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={e => setStartAt(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">إلى</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={e => setEndAt(e.target.value)}
                min={startAt}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
                required
              />
            </div>
          </div>
        </div>

        {/* Customer notes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">ملاحظات إضافية (اختياري)</h3>
          <textarea
            value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="أي طلبات خاصة أو معلومات تحتاج توصلها لصاحب الإعلان"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
          />
        </div>

        {/* ID Verification - shown only for listings requiring it */}
        {listing.requires_id_verification && (
          <div className="bg-gradient-to-br from-[#B8860B]/5 to-amber-50 rounded-2xl border-2 border-[#B8860B]/30 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
              بطاقة مطلوبة
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed mb-3">
              الـlisting ده محتاج رقم بطاقتك للتحقق. الحجز ما بيتأكدش غير لما صاحب الإعلان (<strong>{listing.supplier?.business_name}</strong>) يوافق على بياناتك. رد عادي في خلال ساعات.
            </p>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-[#B8860B]" />
              رقم البطاقة الشخصية *
            </label>
            <input
              type="text"
              value={providedNationalId}
              onChange={e => setProvidedNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="14 رقم"
              maxLength={14}
              className="w-full px-4 py-2.5 border border-[#B8860B]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B] bg-white"
              dir="ltr"
              style={{ textAlign: 'right' }}
              inputMode="numeric"
              required
            />
            {userNationalId && (
              <p className="text-[11px] text-green-700 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                رقم بطاقتك محفوظ عندنا. تقدر تعدله لو عاوز.
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
              🔒 بياناتك أمان. بتوصل لصاحب الإعلان بس، وبتتخزن مشفرة في النظام.
            </p>
          </div>
        )}

        {/* Price breakdown */}
        {pricing.valid && selectedRule && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">ملخص الحجز</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {Number(selectedRule.price).toLocaleString('ar-EG')} ج.م × {pricing.periods} {selectedRule.period_type === 'per_event' ? '' : PERIOD_LABELS[selectedRule.period_type]}
                </span>
                <span>{pricing.baseAmount.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
                <span>الإجمالي</span>
                <span className="text-[#1F5F3F]">{pricing.total.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>
          </div>
        )}

        {pricing.error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{pricing.error}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!pricing.valid || stage === 'submitting' || (listing.requires_id_verification === true && providedNationalId.trim().length < 14)}
          className="w-full py-3.5 bg-[#1F5F3F] text-white rounded-xl font-bold hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {stage === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...
            </>
          ) : listing.requires_id_verification ? (
            <>
              <ShieldCheck className="w-5 h-5" /> إرسال طلب الحجز
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> تأكيد الحجز
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-500 mt-3">
          {listing.requires_id_verification
            ? 'الحجز هيتأكد بعد ما صاحب الإعلان يراجع بياناتك ويوافق. هتوصلك إشعار لما تتأكد.'
            : 'الحجز هيتأكد بعد ما صاحب الإعلان يوافق. هتقدر تتابع حالة الحجز من “حجوزاتي”.'}
        </p>
      </main>
    </div>
  )
}
