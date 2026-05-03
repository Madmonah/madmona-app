'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Calendar, Loader2, AlertCircle, CheckCircle,
  Lock, MapPin, Image as ImageIcon, Building2,
} from 'lucide-react'

// ============================================================================
// /marketplace/[slug]/book
// 
// Booking creation page.
// Customer picks: pricing rule + date/time range
// Calculates: duration, base, commission, total
// Submits: marketplace_bookings row with pending_payment status
// Fires: /api/bookings/notify (fire-and-forget) for email notification
// ============================================================================

interface ListingForBooking {
  id: string
  title: string
  slug: string
  city: string | null
  district: string | null
  status: string
  supplier: {
    id: string
    business_name: string
    commission_rate: number | string
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

type Stage = 'loading' | 'unauthenticated' | 'not-found' | 'ready' | 'submitting'

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
          id, title, slug, city, district, status,
          supplier:marketplace_suppliers(id, business_name, commission_rate),
          photos:listing_photos(url, is_primary)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (listingErr || !l) {
        setStage('not-found')
        return
      }
      setListing(l as ListingForBooking)

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
        status: 'pending_payment',
      }
      if (customerNotes.trim()) insertData.customer_notes = customerNotes.trim()

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

  if (pricingRules.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مفيش أسعار للـlisting ده</h1>
          <p className="text-sm text-gray-600 mb-4">للحجز، تواصل مباشرة مع المورد.</p>
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
            placeholder="أي طلبات خاصة أو معلومات تحتاج توصلها للمورد"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30"
          />
        </div>

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
          disabled={!pricing.valid || stage === 'submitting'}
          className="w-full py-3.5 bg-[#1F5F3F] text-white rounded-xl font-bold hover:bg-[#1F5F3F]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {stage === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> تأكيد الحجز
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-500 mt-3">
          الحجز هيتأكد بعد ما المورد يوافق. هتقدر تتابع حالة الحجز من &ldquo;حجوزاتي&rdquo;.
        </p>
      </main>
    </div>
  )
}
