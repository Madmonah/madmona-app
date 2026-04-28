import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Egyptian mobile validation: starts with 010, 011, 012, or 015 (10 digits after country code)
function normalizeEgyptianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  // Accept formats: 01xxxxxxxxx (11 digits) or 201xxxxxxxxx (12 digits)
  if (/^01[0125]\d{8}$/.test(digits)) {
    return `+20${digits.slice(1)}`
  }
  if (/^201[0125]\d{8}$/.test(digits)) {
    return `+${digits}`
  }
  return null
}

const ALLOWED_SLUGS = new Set([
  'indoor-coworking',
  'outdoor-garden',
  'private-office',
  'meeting-room',
])

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
    customerName,
    customerPhone,
    spaceSlug,
    pricingLabel,
    preferredDate,
    notes,
  } = body as Record<string, unknown>

  // Validation
  if (typeof customerName !== 'string' || customerName.trim().length === 0) {
    return NextResponse.json({ error: 'customerName required' }, { status: 400 })
  }
  if (customerName.length > 200) {
    return NextResponse.json({ error: 'customerName too long' }, { status: 400 })
  }

  if (typeof customerPhone !== 'string') {
    return NextResponse.json({ error: 'customerPhone required' }, { status: 400 })
  }
  const normalizedPhone = normalizeEgyptianPhone(customerPhone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Invalid Egyptian phone number' }, { status: 400 })
  }

  if (typeof spaceSlug !== 'string' || !ALLOWED_SLUGS.has(spaceSlug)) {
    return NextResponse.json({ error: 'Invalid spaceSlug' }, { status: 400 })
  }

  // Optional fields
  const pricingLabelClean =
    typeof pricingLabel === 'string' && pricingLabel.length <= 200
      ? pricingLabel.trim() || null
      : null

  let preferredDateClean: string | null = null
  if (typeof preferredDate === 'string' && preferredDate) {
    // Accept YYYY-MM-DD only
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
      return NextResponse.json({ error: 'preferredDate must be YYYY-MM-DD' }, { status: 400 })
    }
    preferredDateClean = preferredDate
  }

  const notesClean =
    typeof notes === 'string' && notes.length <= 2000 ? notes.trim() || null : null

  // Anti-spam: reject if the same phone number submitted within the last
  // 60 seconds. Cheap protection against double-clicks, replay attacks,
  // and basic bots. Persistent across serverless instances since it queries
  // the database directly.
  try {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('booking_leads')
      .select('id')
      .eq('customer_phone', normalizedPhone)
      .gte('created_at', sixtySecondsAgo)
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: 'طلبك اتسجل بالفعل دلوقتي، هنتواصل معاك قريباً' },
        { status: 429 }
      )
    }
  } catch {
    // If the duplicate check fails for any reason, don't block the user —
    // a duplicate row is far less harmful than a failed booking.
  }

  // Insert via admin client (bypasses RLS, runs server-side only).
  // @ts-expect-error - Supabase JS v2.45+ resolves Insert generic to `never`
  // when the Database schema lacks the new `__InternalSupabase` marker. This is
  // an isolated workaround for that single line, not a global TS bypass.
  const { data, error } = await supabase
    .from('booking_leads')
    .insert({
      customer_name: customerName.trim(),
      customer_phone: normalizedPhone,
      space_slug: spaceSlug,
      pricing_label: pricingLabelClean,
      preferred_date: preferredDateClean,
      notes: notesClean,
      source: 'website',
    })
    .select('id')
    .single()

  if (error) {
    // Log server-side, return generic error to client
    console.error('[booking-leads] insert error:', error)
    return NextResponse.json(
      { error: 'Failed to save lead', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, leadId: (data as { id: string } | null)?.id ?? null })
}
