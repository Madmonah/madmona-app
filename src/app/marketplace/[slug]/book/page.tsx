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
import BookingHelper from '@/components/BookingHelper'
import { useT } from '@/lib/i18n/LanguageProvider'

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
  available_addons: ListingAddon[] | null
  supplier: {
    id: string
    business_name: string
    commission_rate: number | string
    kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  } | null
  photos: { url: string; is_primary: boolean }[] | null
}

// Phase Z (May 18 2026): customer-facing add-ons selection.
// Add-ons are configured by the supplier in the wizard (StepPricing) and
// stored on listings.available_addons. The booking page reads them, lets
// the customer pick any subset, and includes them in the total.
interface ListingAddon {
  slug: string
  name_ar: string
  emoji?: string | null
  price_egp: number
}

interface PricingRule {
  id: string
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'per_event' | 'per_service' | 'per_package'
  period_count: number
  price: number | string
  currency: string
  min_periods: number | null
  max_periods: number | null
  label_ar: string | null
  is_active: boolean
}

const PERIOD_LABELS: Record<string, string> = {
  hourly: 'common.per_hour',
  daily: 'common.per_day',
  weekly: 'common.per_week',
  monthly: 'common.per_month',
  per_event: 'common.per_event',
}

const PERIOD_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  per_event: 0,
}

// Flat (single-appointment) pricing types — these are NOT duration ranges.
// A salon service / package / event is booked for ONE time slot, so the
// customer shouldn't be asked for an end time. We auto-derive a 60-min slot
// so the existing conflict-check + insert (which need start/end) keep working.
const FLAT_PERIOD_TYPES = ['per_service', 'per_package', 'per_event']
function addMinutesLocal(localStr: string, mins: number): string {
  const d = new Date(localStr)
  if (isNaN(d.getTime())) return localStr
  d.setMinutes(d.getMinutes() + mins)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Stage =
  | 'loading'
  | 'unauthenticated'
  | 'not-found'
  | 'demo-not-bookable'  // <-- blocks direct URL access to DEMO listings
  | 'supplier-not-approved'
  | 'listing-paused'     // <-- NEW: listing temporarily paused by owner
  | 'ready'
  | 'submitting'

export default function BookingPage() {
  const { t, lang, dir } = useT()
  const params = useParams()
  const router = useRouter()
  // FIX (Jul 17 2026): السلجات العربية بتوصل مشفّرة من useParams — لازم فك تشفير
  const rawSlug = params?.slug as string
  const slug = (() => { try { return decodeURIComponent(rawSlug) } catch { return rawSlug } })()

  const [stage, setStage] = useState<Stage>('loading')
  const [listing, setListing] = useState<ListingForBooking | null>(null)
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  // Guest booking (no account): collected only when there is no session.
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Phase Z (May 18 2026): set of selected add-on slugs.
  const [selectedAddonSlugs, setSelectedAddonSlugs] = useState<Set<string>>(new Set())

  // ID verification state for listings that require it
  const [userNationalId, setUserNationalId] = useState<string | null>(null)
  const [providedNationalId, setProvidedNationalId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      // Guest booking enabled: do NOT wall anonymous users. Load the listing for
      // everyone; capture userId only when a session exists. Anonymous visitors
      // book with name + phone and can claim/link the booking to an account later.
      const sessionUserId = session?.user?.id ?? null
      if (sessionUserId) setUserId(sessionUserId)

      // Look up the listing WITHOUT filtering on status — we want to differentiate
      // between truly missing listings and ones that are paused/draft/etc, so we
      // can show the correct gate message.
      // @ts-expect-error
      const { data: l, error: listingErr } = await supabaseBrowser
        .from('listings')
        .select(`
          id, title, slug, city, district, status, requires_id_verification, available_addons,
          supplier:marketplace_suppliers(id, business_name, commission_rate, kyc_status),
          photos:listing_photos(url, is_primary)
        `)
        .eq('slug', slug)
        .maybeSingle()

      if (listingErr || !l) {
        setStage('not-found')
        return
      }
      const listingData = l as ListingForBooking
      // تسجيل الـ ID اتأجّل لمرحلة تحويل الفلوس (محمد، ٢٦ مايو ٢٠٢٦):
      // بنقفل التحقق من الهوية وقت الحجز خالص — مفروض مايظهرش في فلو الأكونت/الحجز دلوقتي.
      // هنرجّعه في مرحلة الدفع/التحويل. (الكود سايبو زي ما هو عشان نفعّله بسهولة)
      listingData.requires_id_verification = false
      setListing(listingData)

      // PAUSED gate: listing exists but owner temporarily disabled it.
      // This was previously showing as 'not-found' which made users think
      // the listing was deleted. Now they get a clearer message.
      if (listingData.status !== 'published') {
        setStage('listing-paused')
        return
      }

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
      if (sessionUserId) {
        try {
          // @ts-expect-error
          const { data: profile } = await supabaseBrowser
            .from('profiles')
            .select('national_id')
            .eq('id', sessionUserId)
            .maybeSingle()
          if (profile?.national_id) {
            setUserNationalId(profile.national_id)
            setProvidedNationalId(profile.national_id)
          }
        } catch {
          // Column doesn't exist - silent fail
        }
      }

      setStage('ready')
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const selectedRule = pricingRules.find(r => r.id === selectedRuleId) || null
  const isFlatRule = !!selectedRule && FLAT_PERIOD_TYPES.includes(selectedRule.period_type)

  // Phase Z (May 18 2026): available add-ons + selected list + addons amount.
  const availableAddons: ListingAddon[] = Array.isArray(listing?.available_addons)
    ? (listing!.available_addons as ListingAddon[])
    : []
  const selectedAddons: ListingAddon[] = availableAddons.filter(a =>
    selectedAddonSlugs.has(a.slug)
  )
  const addonsAmount = selectedAddons.reduce(
    (sum, a) => sum + Number(a.price_egp || 0),
    0
  )

  function toggleAddon(slug: string) {
    setSelectedAddonSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const calcPricing = () => {
    if (!selectedRule || !startAt || !endAt) {
      return { periods: 0, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: '' }
    }
    const start = new Date(startAt).getTime()
    const end = new Date(endAt).getTime()
    if (end <= start) {
      return { periods: 0, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: t('book.err_end_after_start') }
    }
    let periods = 1
    // Only duration-based types scale by time. per_event / per_service /
    // per_package (and any other flat type) stay at 1 — previously these fell
    // through to PERIOD_MS[undefined] and produced NaN amounts.
    if (['hourly', 'daily', 'weekly', 'monthly'].includes(selectedRule.period_type)) {
      const ms = PERIOD_MS[selectedRule.period_type]
      periods = Math.ceil((end - start) / ms)
      if (periods < 1) periods = 1
    }
    if (selectedRule.min_periods && periods < selectedRule.min_periods) {
      return { periods, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: t('book.err_min_periods', { n: selectedRule.min_periods }) }
    }
    if (selectedRule.max_periods && periods > selectedRule.max_periods) {
      return { periods, baseAmount: 0, commission: 0, total: 0, supplierPayout: 0, valid: false, error: t('book.err_max_periods', { n: selectedRule.max_periods }) }
    }

    const price = Number(selectedRule.price)
    const baseAmount = price * periods
    const commissionRate = Number(listing?.supplier?.commission_rate || 10)
    // Phase Z: commission is charged on base only (not on add-ons) so suppliers
    // keep the full add-on revenue. Easy to change later if business decides.
    const commission = Math.round((baseAmount * commissionRate / 100) * 100) / 100
    const total = baseAmount + addonsAmount
    const supplierPayout = Math.round((baseAmount - commission + addonsAmount) * 100) / 100

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
    if (!listing?.supplier || !selectedRule || !pricing.valid) return
    // Defense-in-depth: even if UI was bypassed, double-check before submit
    if (listing.supplier.kyc_status !== 'approved') {
      setError(t('book.err_supplier_review'))
      return
    }
    // Guest path (no account): require a name + a valid Egyptian mobile.
    const isGuest = !userId
    if (isGuest) {
      if (!guestName.trim()) { setError('من فضلك اكتب اسمك'); return }
      if (guestPhone.replace(/\D/g, '').length < 10) { setError('من فضلك اكتب رقم موبايل صحيح'); return }
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
        setError(t('book.err_slot_taken'))
        setStage('ready')
        return
      }

      // ---- GUEST PATH: anonymous booking via SECURITY DEFINER RPC ----
      // No account wall. Pricing is RE-COMPUTED server-side inside the RPC
      // (client amounts are not trusted). Redirects to the public confirmation
      // page using ?ref=<reference_code> as a capability token.
      if (isGuest) {
        // @ts-expect-error - rpc typing not generated
        const { data: rpcData, error: rpcErr } = await supabaseBrowser.rpc('create_guest_booking', {
          p_listing_id: listing.id,
          p_pricing_rule_id: selectedRule.id,
          p_start_at: startIso,
          p_end_at: endIso,
          p_guest_name: guestName.trim(),
          p_guest_phone: guestPhone.replace(/\D/g, ''),
          p_customer_notes: customerNotes.trim() || null,
          p_addon_slugs: selectedAddons.map(a => a.slug),
          p_guest_national_id:
            listing.requires_id_verification && providedNationalId.trim().length >= 14
              ? providedNationalId.trim()
              : null,
        })
        if (rpcErr) throw rpcErr
        const out = (rpcData ?? {}) as { booking_id?: string; reference_code?: string }
        router.push(`/bookings/${out.booking_id}?created=1&ref=${encodeURIComponent(out.reference_code || '')}`)
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
        // Always a valid mp_booking_status value. ID-verification state is tracked
        // separately in id_verification_status. The enum has NO
        // 'pending_id_verification' value, so inserting it used to throw
        // (invalid enum) and silently killed every car / ID-required booking.
        status: 'pending_payment',
        // Phase Z (May 18 2026): freeze the selected add-ons + sum at booking time
        selected_addons: selectedAddons,
        addons_amount: addonsAmount,
      }
      if (customerNotes.trim()) insertData.customer_notes = customerNotes.trim()

      // If listing requires ID verification, save the customer's ID (if provided).
      // ID is now OPTIONAL at submit time — booking is created with status
      // 'pending_id_verification' and customer is prompted for ID on next page
      // if they didn't provide it here. This stops the "button disabled" friction
      // that was killing conversion on car listings.
      if (listing.requires_id_verification) {
        if (providedNationalId.trim().length >= 14) {
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
        } else {
          // Booking submitted without ID — flag for follow-up
          insertData.id_verification_status = 'awaiting_id'
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
      let msg = t('common.error')
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
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir={dir}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <>
        <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
          <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
            <Lock className="w-8 h-8 text-[#2B4521] mx-auto mb-3" />
            <h1 className="font-bold mb-2">{t('booking.login_first')}</h1>
            <p className="text-sm text-gray-600 mb-6">{t('booking.login_desc')}</p>
            <Link
              href={`/auth/login?redirect=${encodeURIComponent(`/marketplace/${slug}/book`)}`}
              className="block w-full bg-[#2B4521] text-white py-3 rounded-xl font-semibold mb-2"
            >
              {t('auth.login.title')}
            </Link>
            <Link
              href={`/auth/signup?redirect=${encodeURIComponent(`/marketplace/${slug}/book`)}`}
              className="block w-full text-sm text-gray-600 hover:text-[#2B4521]"
            >
              {t('auth.no_account')}
            </Link>
          </div>
        </div>
        {/* Phone-capture widget for anonymous visitors — lets them get help
            without going through full signup. Appears after 20s. */}
        <BookingHelper
          listingId={null}
          listingTitle={null}
          listingSlug={slug}
          isAuthenticated={false}
        />
      </>
    )
  }

  if (stage === 'not-found' || !listing) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h1 className="font-bold mb-4">{t('listing.not_found_title')}</h1>
          <Link href="/marketplace" className="bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold">
            {t('book.browse')}
          </Link>
        </div>
      </div>
    )
  }

  // PAUSED gate: listing exists but is temporarily unavailable
  if (stage === 'listing-paused' && listing) {
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">{t('booking.title')}</h1>
          </div>
        </header>
        <main className="max-w-xl mx-auto p-4 pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 bg-amber-50">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('book.paused_title')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {t('book.owner_word')} <strong className="text-gray-900">{listing.supplier?.business_name || ''}</strong> {t('book.paused_after_name')}
              <br />
              <span className="block mt-2 text-xs text-gray-500">
                {t('book.paused_help')}
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href={`https://wa.me/201002229982?text=${encodeURIComponent(`مرحباً، شفت listing "${listing.title}" على مضمونة وعايز أحجز بس مكتوب إنه موقّف. ممكن تساعدني؟`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold no-underline hover:bg-[#25D366]/90"
              >
                <MessageCircle className="w-4 h-4" />
                {t('book.help_booking')}
              </a>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-[#2B4521] text-white rounded-xl text-sm font-semibold hover:bg-[#2B4521]/90"
              >
                {t('book.browse_other')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // KYC gate: friendly message when supplier isn't approved yet
  if (stage === 'supplier-not-approved') {
    const supplierStatus = listing.supplier?.kyc_status
    const isSuspended = supplierStatus === 'suspended' || supplierStatus === 'rejected'
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">{t('booking.title')}</h1>
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
              {isSuspended ? t('book.supplier_unavailable_title') : t('book.supplier_review_title')}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {isSuspended ? (
                <>{t('book.suspended_body')}</>
              ) : (
                <>
                  {t('book.owner_word')} <strong className="text-gray-900">{listing.supplier?.business_name || ''}</strong> {t('book.review_after_name')}
                  <br />
                  <span className="block mt-2 text-xs text-gray-500">
                    {t('book.review_eta')}
                  </span>
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href={`/marketplace/${slug}`}
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200"
              >
                {t('book.back_to_listing')}
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-[#2B4521] text-white rounded-xl text-sm font-semibold hover:bg-[#2B4521]/90"
              >
                {t('book.browse_other')}
              </Link>
            </div>
            {!isSuspended && (
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 mt-4 text-xs text-[#2B4521] hover:underline"
              >
                <Clock className="w-3.5 h-3.5" />
                {t('book.ask_about_owner')}
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
      <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">{t('booking.title')}</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto p-4 pt-12">
          <div className="bg-white rounded-2xl border-2 border-amber-400 p-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4 bg-amber-100">
              <Clock className="w-7 h-7 text-amber-700" />
            </div>
            <h2 className="text-xl font-black text-amber-900 mb-2 text-center">{t('listing.booking_disabled_demo')}</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-6 text-center">
              “<strong>{displayTitle}</strong>” {t('book.demo_body_1')}
              <br />
              <span className="block mt-2 text-xs text-gray-500">
                {t('book.demo_body_2')}
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
                {t('listing.notify_available')}
              </a>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-1 px-5 py-2.5 bg-[#2B4521] text-white rounded-xl text-sm font-semibold hover:bg-[#2B4521]/90"
              >
                {t('book.browse_real')}
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (pricingRules.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir={dir}>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">{t('book.no_pricing_title')}</h1>
          <p className="text-sm text-gray-600 mb-4">{t('book.no_pricing_body')}</p>
          <Link href={`/marketplace/${slug}`} className="bg-[#2B4521] text-white px-5 py-2.5 rounded-xl font-semibold inline-block">
            {t('book.back_to_listing')}
          </Link>
        </div>
      </div>
    )
  }

  const photos = listing.photos || []
  const primary = photos.find(p => p.is_primary) || photos[0]
  const photoUrl = primary?.url

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/marketplace/${slug}`} className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">{t('booking.title')}</h1>
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
                {[listing.district, listing.city].filter(Boolean).join(lang === 'ar' ? '، ' : ', ')}
              </p>
            )}
          </div>
        </div>

        {/* Pricing rule selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('booking.pricing')}</h3>
          <div className="space-y-2">
            {pricingRules.map(rule => (
              <label
                key={rule.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                  selectedRuleId === rule.id
                    ? 'border-[#2B4521] bg-[#2B4521]/5'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rule"
                    checked={selectedRuleId === rule.id}
                    onChange={() => setSelectedRuleId(rule.id)}
                    className="w-4 h-4 text-[#2B4521]"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {rule.label_ar || (PERIOD_LABELS[rule.period_type] ? t(PERIOD_LABELS[rule.period_type]) : rule.period_type)}
                  </span>
                </div>
                <span className="font-bold text-[#2B4521]">
                  {Number(rule.price).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('common.egp')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Phase Z (May 18 2026): customer-facing add-ons selection.
            Renders only when the supplier configured add-ons in the wizard. */}
        {availableAddons.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('book.addons_title')}</h3>
            <p className="text-xs text-gray-500 mb-3">
              {t('book.addons_sub')}
            </p>
            <div className="space-y-2">
              {availableAddons.map(addon => {
                const isSel = selectedAddonSlugs.has(addon.slug)
                return (
                  <button
                    key={addon.slug}
                    type="button"
                    onClick={() => toggleAddon(addon.slug)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-start ${
                      isSel
                        ? 'bg-[#2B4521]/5 border-[#2B4521]'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSel ? 'bg-[#2B4521] border-[#2B4521]' : 'bg-transparent border-gray-300'
                      }`}>
                        {isSel && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      {addon.emoji && <span className="text-base">{addon.emoji}</span>}
                      <span className="text-sm font-medium text-gray-900">{addon.name_ar}</span>
                    </div>
                    <span className={`font-bold text-sm ${isSel ? 'text-[#2B4521]' : 'text-gray-700'}`}>
                      +{Number(addon.price_egp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('common.egp')}
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedAddons.length > 0 && (
              <p className="text-xs text-[#2B4521] font-semibold mt-3 text-center">
                {t('book.addons_summary', { n: selectedAddons.length, amt: addonsAmount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') })}
              </p>
            )}
          </div>
        )}

        {/* Guest contact — anonymous visitors only (no account wall). Name + phone
            are enough; the booking can be claimed/linked to an account later. */}
        {!userId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">بياناتك للتواصل</h3>
            <p className="text-xs text-gray-500 mb-3">مش لازم تعمل حساب — هنأكّد الحجز على رقمك على طول.</p>
            <label className="block text-xs font-medium text-gray-700 mb-1">الاسم</label>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="اكتب اسمك"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30 mb-3"
            />
            <label className="block text-xs font-medium text-gray-700 mb-1">رقم الموبايل</label>
            <input
              type="tel"
              inputMode="numeric"
              value={guestPhone}
              onChange={e => setGuestPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 13))}
              placeholder="01XXXXXXXXX"
              dir="ltr"
              style={{ textAlign: 'right' }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
            />
            <p className="text-[11px] text-gray-500 mt-2">
              عندك حساب؟{' '}
              <Link href={`/auth/login?redirect=${encodeURIComponent(`/marketplace/${slug}/book`)}`} className="text-[#2B4521] font-semibold">
                سجّل دخول
              </Link>
            </p>
          </div>
        )}

        {/* Date/time picker */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2B4521]" /> {isFlatRule ? 'ميعاد الحجز' : t('booking.date')}
          </h3>
          {isFlatRule ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">اليوم والساعة</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={e => { const v = e.target.value; setStartAt(v); setEndAt(v ? addMinutesLocal(v, 60) : '') }}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
                required
              />
              <p className="text-[11px] text-gray-500 mt-2">اختار اليوم والساعة اللي يناسبك، والمكان هيأكدلك الميعاد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('booking.from')}</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('booking.to')}</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  min={startAt}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Customer notes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('booking.notes')}</h3>
          <textarea
            value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t('book.notes_placeholder')}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4521]/30"
          />
        </div>

        {/* ID Verification - shown only for listings requiring it. ID is OPTIONAL
            at submit time. If skipped, booking is created with status
            'awaiting_id' and admin/supplier follows up. This removes the
            disable-on-submit friction that was killing car-listing conversion. */}
        {listing.requires_id_verification && (
          <div className="bg-gradient-to-br from-[#2FA084]/5 to-amber-50 rounded-2xl border-2 border-[#2FA084]/30 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2FA084]" />
              {t('book.id_title')}
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed mb-3">
              {t('book.id_desc')}
            </p>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-[#2FA084]" />
              {t('book.id_label')}
            </label>
            <input
              type="text"
              value={providedNationalId}
              onChange={e => setProvidedNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder={t('book.id_placeholder')}
              maxLength={14}
              className="w-full px-4 py-2.5 border border-[#2FA084]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2FA084]/30 focus:border-[#2FA084] bg-white"
              dir="ltr"
              style={{ textAlign: 'right' }}
              inputMode="numeric"
            />
            {userNationalId && (
              <p className="text-[11px] text-green-700 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t('book.id_saved')}
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
              {t('book.id_secure')}
            </p>
          </div>
        )}

        {/* Price breakdown */}
        {pricing.valid && selectedRule && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">{t('book.summary_title')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {isFlatRule
                    ? (selectedRule.label_ar || (PERIOD_LABELS[selectedRule.period_type] ? t(PERIOD_LABELS[selectedRule.period_type]) : ''))
                    : `${Number(selectedRule.price).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${t('common.egp')} × ${pricing.periods} ${['hourly', 'daily', 'weekly', 'monthly'].includes(selectedRule.period_type) ? t(PERIOD_LABELS[selectedRule.period_type]) : ''}`}
                </span>
                <span>{pricing.baseAmount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('common.egp')}</span>
              </div>
              {/* Phase Z: line item per selected add-on */}
              {selectedAddons.map(a => (
                <div key={a.slug} className="flex justify-between text-xs text-gray-600">
                  <span>{a.emoji ? `${a.emoji} ` : ''}{a.name_ar}</span>
                  <span>+{Number(a.price_egp).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('common.egp')}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100 text-base">
                <span>{t('booking.total')}</span>
                <span className="text-[#2B4521]">{pricing.total.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('common.egp')}</span>
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
          className="w-full py-3.5 bg-[#2B4521] text-white rounded-xl font-bold hover:bg-[#2B4521]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {stage === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {t('booking.submitting')}
            </>
          ) : listing.requires_id_verification ? (
            <>
              <ShieldCheck className="w-5 h-5" /> {t('book.submit_id')}
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> {t('booking.confirm')}
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-500 mt-3">
          {listing.requires_id_verification
            ? t('book.footer_id')
            : t('book.footer_normal')}
        </p>
      </main>

      {/* Conversion-rescue widget: appears after 45s on the booking page.
          For authenticated users it offers WhatsApp concierge help.
          For paused/blocked listings (handled in earlier gates) it doesn't render. */}
      <BookingHelper
        listingId={listing.id}
        listingTitle={listing.title}
        listingSlug={listing.slug}
        isAuthenticated={!!userId}
      />
    </div>
  )
}
