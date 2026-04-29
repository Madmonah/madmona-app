import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ============================================================
// Pricing & rules — single source of truth, server-side only.
// Customers can never fake totals.
// ============================================================

type PricingPlan = 'hourly' | 'daily' | 'package_10' | 'monthly'

interface SpaceConfig {
  // Which pricing plans this space supports
  plans: Partial<Record<PricingPlan, { price: number; capacityOptions?: string[] }>>
  // Operating hours for hourly plans (24-hour clock)
  operating?: { start: number; end: number }
  // For hourly plans with capacity tiers (meeting room): pricing varies by tier
  capacityPricing?: Record<string, number>
}

const SPACES: Record<string, SpaceConfig> = {
  'meeting-room': {
    plans: { hourly: { price: 0, capacityOptions: ['4-people', '8-people'] } },
    operating: { start: 9, end: 23 },
    capacityPricing: { '4-people': 300, '8-people': 500 },
  },
  'indoor-coworking': {
    plans: {
      hourly: { price: 50 },
      daily: { price: 120 },
      package_10: { price: 900 }, // 10-day package
      monthly: { price: 2000 },
    },
    operating: { start: 9, end: 23 },
  },
  'outdoor-garden': {
    plans: { daily: { price: 65 } },
  },
  'private-office': {
    plans: { monthly: { price: 12000 } },
  },
}

// ============================================================
// Helpers
// ============================================================

function normalizeEgyptianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^01[0125]\d{8}$/.test(digits)) return `+20${digits.slice(1)}`
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`
  return null
}

function generateBookingCode(): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MAD-${random}`
}

// Calculate total price based on plan + duration. Pure function so it's
// trivial to unit-test if we add tests later.
function calculateTotal(
  spaceSlug: string,
  plan: PricingPlan,
  duration: number,
  capacityOption?: string
): number | null {
  const config = SPACES[spaceSlug]
  if (!config) return null
  const planConfig = config.plans[plan]
  if (!planConfig) return null

  if (plan === 'hourly') {
    if (config.capacityPricing) {
      // Meeting room: price depends on capacity tier
      if (!capacityOption || !config.capacityPricing[capacityOption]) return null
      return config.capacityPricing[capacityOption] * duration
    }
    // Indoor coworking hourly
    return planConfig.price * duration
  }

  // daily / package_10 / monthly are fixed-price (duration is always 1)
  return planConfig.price
}

// ============================================================
// POST /api/bookings
// ============================================================
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const {
    spaceSlug,
    pricingPlan,
    capacityOption,
    bookingDate,
    startHour,
    endHour,
    customerName,
    customerPhone,
    notes,
    paymentMethod,
    paymentProofUrl,
  } = body as Record<string, unknown>

  // ---- Space ----
  if (typeof spaceSlug !== 'string' || !SPACES[spaceSlug]) {
    return NextResponse.json({ error: 'Invalid space' }, { status: 400 })
  }
  const config = SPACES[spaceSlug]

  // ---- Pricing plan ----
  if (typeof pricingPlan !== 'string' || !config.plans[pricingPlan as PricingPlan]) {
    return NextResponse.json({ error: 'Invalid pricing plan' }, { status: 400 })
  }
  const plan = pricingPlan as PricingPlan

  // ---- Date ----
  if (typeof bookingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  const todayIso = new Date().toISOString().split('T')[0]
  if (bookingDate < todayIso) {
    return NextResponse.json({ error: 'لا يمكن الحجز في تاريخ سابق' }, { status: 400 })
  }

  // ---- Hours / capacity (depend on plan) ----
  let resolvedStartHour: number
  let resolvedEndHour: number
  let resolvedCapacity: string | null = null

  if (plan === 'hourly') {
    if (typeof startHour !== 'number' || typeof endHour !== 'number') {
      return NextResponse.json({ error: 'Invalid hours' }, { status: 400 })
    }
    if (!config.operating) {
      return NextResponse.json({ error: 'No operating hours' }, { status: 400 })
    }
    if (
      !Number.isInteger(startHour) ||
      !Number.isInteger(endHour) ||
      startHour < config.operating.start ||
      endHour > config.operating.end ||
      endHour <= startHour
    ) {
      return NextResponse.json({ error: 'الوقت خارج ساعات العمل' }, { status: 400 })
    }
    resolvedStartHour = startHour
    resolvedEndHour = endHour

    // Capacity option only required for spaces with capacity tiers
    if (config.capacityPricing) {
      if (typeof capacityOption !== 'string' || !config.capacityPricing[capacityOption]) {
        return NextResponse.json({ error: 'Invalid capacity option' }, { status: 400 })
      }
      resolvedCapacity = capacityOption
    }
  } else {
    // daily / package_10 / monthly: always whole-day. We block the entire
    // operating-hour range so that no overlapping hourly bookings sneak in.
    resolvedStartHour = 0
    resolvedEndHour = 24
  }

  // ---- Customer ----
  if (typeof customerName !== 'string' || customerName.trim().length === 0) {
    return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
  }
  if (customerName.length > 200) {
    return NextResponse.json({ error: 'الاسم طويل جداً' }, { status: 400 })
  }
  if (typeof customerPhone !== 'string') {
    return NextResponse.json({ error: 'رقم الموبايل مطلوب' }, { status: 400 })
  }
  const normalizedPhone = normalizeEgyptianPhone(customerPhone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'رقم الموبايل غير صحيح' }, { status: 400 })
  }
  const notesClean =
    typeof notes === 'string' && notes.length <= 2000 ? notes.trim() || null : null

  // ---- Payment ----
  if (paymentMethod !== 'cash_on_arrival' && paymentMethod !== 'instapay') {
    return NextResponse.json({ error: 'طريقة دفع غير صحيحة' }, { status: 400 })
  }
  let proofUrlClean: string | null = null
  if (paymentMethod === 'instapay') {
    if (typeof paymentProofUrl !== 'string' || !paymentProofUrl.startsWith('http')) {
      return NextResponse.json({ error: 'صورة التحويل مطلوبة لـ InstaPay' }, { status: 400 })
    }
    proofUrlClean = paymentProofUrl
  }

  // ---- Overlap check (against existing bookings AND admin blocks) ----
  // For hourly plans we check for time-range overlap; for daily/monthly
  // we treat the whole day as taken and reject any existing booking on that date.
  // @ts-expect-error
  const bookingsConflictPromise = supabase
    .from('room_bookings')
    .select('id')
    .eq('space_slug', spaceSlug)
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled')
    .lt('start_hour', resolvedEndHour)
    .gt('end_hour', resolvedStartHour)
    .limit(1)

  // @ts-expect-error
  const blocksConflictPromise = supabase
    .from('space_blocks')
    .select('id')
    .eq('space_slug', spaceSlug)
    .eq('block_date', bookingDate)
    .lt('start_hour', resolvedEndHour)
    .gt('end_hour', resolvedStartHour)
    .limit(1)

  const [bookingsConflict, blocksConflict] = await Promise.all([
    bookingsConflictPromise,
    blocksConflictPromise,
  ])

  if (bookingsConflict.error || blocksConflict.error) {
    console.error('[bookings] conflict check error:', bookingsConflict.error || blocksConflict.error)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
  const hasConflict =
    (bookingsConflict.data && bookingsConflict.data.length > 0) ||
    (blocksConflict.data && blocksConflict.data.length > 0)

  if (hasConflict) {
    return NextResponse.json(
      { error: 'الوقت ده مش متاح للأسف، اختار وقت تاني' },
      { status: 409 }
    )
  }

  // ---- Anti-spam: same phone within 30 seconds ----
  try {
    const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString()
    // @ts-expect-error
    const { data: recent } = await supabase
      .from('room_bookings')
      .select('id')
      .eq('customer_phone', normalizedPhone)
      .gte('created_at', thirtySecAgo)
      .limit(1)
    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: 'تم تسجيل حجزك بالفعل، هنتواصل معاك قريباً' },
        { status: 429 }
      )
    }
  } catch {
    // Don't block on duplicate detection failure — better a duplicate than a missed booking
  }

  // ---- Calculate price (server-side only) ----
  const duration = plan === 'hourly' ? resolvedEndHour - resolvedStartHour : 1
  const totalPrice = calculateTotal(spaceSlug, plan, duration, resolvedCapacity || undefined)
  if (totalPrice === null) {
    return NextResponse.json({ error: 'Pricing calculation failed' }, { status: 500 })
  }

  // ---- Insert ----
  const bookingCode = generateBookingCode()

  // @ts-expect-error
  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      booking_code: bookingCode,
      space_slug: spaceSlug,
      capacity_option: resolvedCapacity,
      pricing_plan: plan,
      booking_date: bookingDate,
      start_hour: resolvedStartHour,
      end_hour: resolvedEndHour,
      customer_name: customerName.trim(),
      customer_phone: normalizedPhone,
      notes: notesClean,
      total_price_egp: totalPrice,
      payment_method: paymentMethod,
      payment_proof_url: proofUrlClean,
      payment_status: 'pending',
      status: 'pending',
    })
    .select('id, booking_code')
    .single()

  if (error) {
    console.error('[bookings] insert error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    booking_code: bookingCode,
    booking_id: (data as { id: string } | null)?.id ?? null,
    total_price_egp: totalPrice,
  })
}
