import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ============================================================
// Marketplace booking endpoint.
// Difference from old /api/bookings:
//   - References a specific unit_id (not a space_slug)
//   - Looks up the supplier's commission_rate and splits the total
//   - Inserts into unit_bookings (not room_bookings)
// ============================================================

type PricingPlan = 'hourly' | 'daily' | 'package_10' | 'monthly'

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
    unitId,
    pricingPlan,
    bookingDate,
    startHour,
    endHour,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    paymentMethod,
    paymentProofUrl,
  } = body as Record<string, unknown>

  // ---- Unit ----
  if (typeof unitId !== 'string' || !/^[0-9a-f-]{36}$/i.test(unitId)) {
    return NextResponse.json({ error: 'Invalid unit' }, { status: 400 })
  }

  // Fetch the unit + its supplier (we need pricing AND commission_rate)
  // @ts-expect-error - new tables
  const { data: unit, error: unitErr } = await supabase
    .from('space_units')
    .select(`
      id, is_active,
      price_hourly, price_daily, price_package_10, price_monthly,
      operating_start_hour, operating_end_hour,
      supplier:suppliers!inner ( id, commission_rate, status )
    `)
    .eq('id', unitId)
    .single()

  if (unitErr || !unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }
  const u = unit as {
    id: string
    is_active: boolean
    price_hourly: number | null
    price_daily: number | null
    price_package_10: number | null
    price_monthly: number | null
    operating_start_hour: number
    operating_end_hour: number
    supplier: { id: string; commission_rate: number; status: string }
  }
  if (!u.is_active) {
    return NextResponse.json({ error: 'Unit not active' }, { status: 400 })
  }
  if (u.supplier.status !== 'approved') {
    return NextResponse.json({ error: 'Supplier not approved yet' }, { status: 400 })
  }

  // ---- Pricing plan ----
  if (typeof pricingPlan !== 'string') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }
  const plan = pricingPlan as PricingPlan
  let unitPrice: number | null = null
  if (plan === 'hourly') unitPrice = u.price_hourly
  else if (plan === 'daily') unitPrice = u.price_daily
  else if (plan === 'package_10') unitPrice = u.price_package_10
  else if (plan === 'monthly') unitPrice = u.price_monthly
  if (unitPrice === null || unitPrice === undefined) {
    return NextResponse.json({ error: 'هذه الخطة غير متاحة لهذه الوحدة' }, { status: 400 })
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
  let resolvedStartHour: number
  let resolvedEndHour: number

  if (plan === 'hourly') {
    if (typeof startHour !== 'number' || typeof endHour !== 'number') {
      return NextResponse.json({ error: 'Invalid hours' }, { status: 400 })
    }
    if (
      !Number.isInteger(startHour) ||
      !Number.isInteger(endHour) ||
      startHour < u.operating_start_hour ||
      endHour > u.operating_end_hour ||
      endHour <= startHour
    ) {
      return NextResponse.json({ error: 'الوقت خارج ساعات العمل' }, { status: 400 })
    }
    resolvedStartHour = startHour
    resolvedEndHour = endHour
  } else {
    // daily/package_10/monthly = block the entire day
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
  const emailClean =
    typeof customerEmail === 'string' && customerEmail.length <= 200
      ? customerEmail.trim() || null
      : null
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

  // ---- Overlap check (per-unit, the whole point) ----
  // @ts-expect-error
  const bookingsConflict = await supabase
    .from('unit_bookings')
    .select('id')
    .eq('unit_id', unitId)
    .eq('booking_date', bookingDate)
    .neq('status', 'cancelled')
    .lt('start_hour', resolvedEndHour)
    .gt('end_hour', resolvedStartHour)
    .limit(1)

  // @ts-expect-error
  const blocksConflict = await supabase
    .from('unit_blocks')
    .select('id')
    .eq('unit_id', unitId)
    .eq('block_date', bookingDate)
    .lt('start_hour', resolvedEndHour)
    .gt('end_hour', resolvedStartHour)
    .limit(1)

  if (bookingsConflict.error || blocksConflict.error) {
    console.error(
      '[unit-bookings] overlap check error:',
      bookingsConflict.error || blocksConflict.error
    )
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
  const hasConflict =
    (bookingsConflict.data && bookingsConflict.data.length > 0) ||
    (blocksConflict.data && blocksConflict.data.length > 0)

  if (hasConflict) {
    return NextResponse.json(
      { error: 'الوقت ده مش متاح، اختار وقت تاني' },
      { status: 409 }
    )
  }

  // ---- Anti-spam ----
  try {
    const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString()
    // @ts-expect-error
    const { data: recent } = await supabase
      .from('unit_bookings')
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
    // Silent — see prior comment
  }

  // ---- Calculate price + commission split ----
  const duration = plan === 'hourly' ? resolvedEndHour - resolvedStartHour : 1
  const totalPrice = unitPrice * duration
  const commissionRate = u.supplier.commission_rate ?? 20
  const commissionAmount = Math.round(((totalPrice * commissionRate) / 100) * 100) / 100
  const supplierPayout = Math.round((totalPrice - commissionAmount) * 100) / 100

  // ---- Insert ----
  const bookingCode = generateBookingCode()

  // @ts-expect-error
  const { data: inserted, error: insertErr } = await supabase
    .from('unit_bookings')
    .insert({
      booking_code: bookingCode,
      unit_id: unitId,
      pricing_plan: plan,
      booking_date: bookingDate,
      start_hour: resolvedStartHour,
      end_hour: resolvedEndHour,
      customer_name: customerName.trim(),
      customer_phone: normalizedPhone,
      customer_email: emailClean,
      notes: notesClean,
      total_price_egp: totalPrice,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      supplier_payout: supplierPayout,
      payment_method: paymentMethod,
      payment_proof_url: proofUrlClean,
      payment_status: 'pending',
      status: 'pending',
      payout_status: 'unpaid',
    })
    .select('id, booking_code')
    .single()

  if (insertErr) {
    console.error('[unit-bookings] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    booking_code: bookingCode,
    booking_id: (inserted as { id: string } | null)?.id ?? null,
    total_price_egp: totalPrice,
  })
}
