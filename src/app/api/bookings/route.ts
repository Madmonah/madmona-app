import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ALLOWED_SLUGS = new Set(['meeting-room'])

// Pricing in EGP per hour, indexed by space slug + capacity option.
// Source of truth lives here on the server so customers can't fake totals.
const PRICING: Record<string, Record<string, number>> = {
  'meeting-room': {
    '4-people': 300,
    '8-people': 500,
  },
}

const OPERATING_HOURS: Record<string, { start: number; end: number }> = {
  'meeting-room': { start: 9, end: 23 },
}

// Egyptian mobile validation (Vodafone/Etisalat/Orange/WE prefixes).
function normalizeEgyptianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (/^01[0125]\d{8}$/.test(digits)) return `+20${digits.slice(1)}`
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`
  return null
}

function generateBookingCode(): string {
  // Short, easy-to-read code customers can reference: MAD-A1B2C3
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MAD-${random}`
}

// POST /api/bookings
//
// Body: {
//   spaceSlug, capacityOption, bookingDate (YYYY-MM-DD),
//   startHour, endHour, customerName, customerPhone,
//   notes?, paymentMethod ('cash_on_arrival' | 'instapay'),
//   paymentProofUrl? (required when paymentMethod === 'instapay')
// }
//
// Validates everything server-side (price, overlap, phone format), then
// inserts a row in room_bookings. Returns the booking_code on success.
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

  // ---- Space + capacity ----
  if (typeof spaceSlug !== 'string' || !ALLOWED_SLUGS.has(spaceSlug)) {
    return NextResponse.json({ error: 'Invalid space' }, { status: 400 })
  }
  const pricing = PRICING[spaceSlug]
  if (typeof capacityOption !== 'string' || !pricing[capacityOption]) {
    return NextResponse.json({ error: 'Invalid capacity option' }, { status: 400 })
  }

  // ---- Date ----
  if (typeof bookingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  const todayIso = new Date().toISOString().split('T')[0]
  if (bookingDate < todayIso) {
    return NextResponse.json({ error: 'لا يمكن الحجز في تاريخ سابق' }, { status: 400 })
  }

  // ---- Hours ----
  if (typeof startHour !== 'number' || typeof endHour !== 'number') {
    return NextResponse.json({ error: 'Invalid hours' }, { status: 400 })
  }
  const operating = OPERATING_HOURS[spaceSlug]
  if (
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < operating.start ||
    endHour > operating.end ||
    endHour <= startHour
  ) {
    return NextResponse.json({ error: 'الوقت خارج ساعات العمل' }, { status: 400 })
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

  // ---- Overlap check ----
  // Two ranges overlap iff existing.start < new.end AND existing.end > new.start.
  // @ts-expect-error - room_bookings not in generated types
  const { data: conflicts, error: conflictErr } = await supabase
    .from('room_bookings')
    .select('id')
    .eq('space_slug', spaceSlug)
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled')
    .lt('start_hour', endHour)
    .gt('end_hour', startHour)
    .limit(1)

  if (conflictErr) {
    console.error('[bookings] overlap check error:', conflictErr)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'الوقت ده اتحجز للأسف، اختار وقت تاني' },
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
    // Don't block on this — duplicate is recoverable, missed booking isn't.
  }

  // ---- Calculate price (server-side, never trust client) ----
  const duration = endHour - startHour
  const totalPrice = pricing[capacityOption] * duration

  // ---- Insert ----
  const bookingCode = generateBookingCode()

  // @ts-expect-error
  const { data, error } = await supabase
    .from('room_bookings')
    .insert({
      booking_code: bookingCode,
      space_slug: spaceSlug,
      capacity_option: capacityOption,
      booking_date: bookingDate,
      start_hour: startHour,
      end_hour: endHour,
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
