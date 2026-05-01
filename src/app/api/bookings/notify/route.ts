import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isEmailConfigured,
  sendEmail,
  bookingConfirmationEmail,
  newBookingForSupplierEmail,
} from '@/lib/email'

// ============================================================================
// POST /api/bookings/notify
//
// Trigger email notifications for a booking event. Called from:
//   1. Booking creation flow (after INSERT)
//   2. Booking status change (after UPDATE to 'confirmed')
//
// Body: { booking_id: string, event: 'created' | 'confirmed' }
//
// Auth: requires Bearer token = either user JWT (verified) OR CRON_SECRET
//       (for server-side webhooks/triggers).
//
// Graceful: returns ok:true even if email is not configured.
// ============================================================================

const CRON_SECRET = process.env.CRON_SECRET
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://madmonacairo.com'

interface BookingFull {
  id: string
  reference_code: string | null
  start_at: string
  end_at: string
  total_amount: number | string
  status: string
  customer_id: string
  customer: {
    full_name: string | null
    phone: string
  } | null
  listing: {
    title: string
  } | null
  supplier: {
    business_name: string
    profile_id: string
    profile: {
      full_name: string | null
      phone: string
    } | null
  } | null
}

export async function POST(req: NextRequest) {
  try {
    // Auth — accept user JWT OR cron secret
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    let allowed = false
    if (CRON_SECRET && token === CRON_SECRET) {
      allowed = true
    } else {
      // Try as user JWT
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: userData } = await userClient.auth.getUser()
      if (userData.user) {
        allowed = true
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const bookingId = body?.booking_id
    const event = body?.event as 'created' | 'confirmed' | undefined

    if (!bookingId || !event || !['created', 'confirmed'].includes(event)) {
      return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
    }

    if (!isEmailConfigured()) {
      // No-op success — emails are optional
      return NextResponse.json({ ok: true, sent: 0, reason: 'email_not_configured' })
    }

    // Use service role to fetch full booking + related data
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // @ts-expect-error
    const { data: booking } = await adminClient
      .from('marketplace_bookings')
      .select(`
        id, reference_code, start_at, end_at, total_amount, status, customer_id,
        customer:profiles!marketplace_bookings_customer_id_fkey(full_name, phone),
        listing:listings(title),
        supplier:marketplace_suppliers(
          business_name, profile_id,
          profile:profiles!marketplace_suppliers_profile_id_fkey(full_name, phone)
        )
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: 'booking_not_found' }, { status: 404 })
    }

    const b = booking as BookingFull
    const refCode = b.reference_code || b.id.slice(0, 8)
    const total = Number(b.total_amount)
    const startStr = formatDateTimeArabic(b.start_at)
    const endStr = formatDateTimeArabic(b.end_at)
    const bookingUrl = `${SITE_URL}/bookings/${b.id}`

    // Find email addresses
    // Customer email: synthesized from phone (madmonacairo.com domain)
    const customerPhone = b.customer?.phone
    const supplierProfilePhone = b.supplier?.profile?.phone

    // Phone-derived emails are internal — they won't deliver.
    // We rely on the user having a real email field, which we don't store directly.
    // Future: add a `notification_email` column to profiles. For now, this acts as a no-op.
    // The Resend API will still log delivery attempts.

    // Call adminClient to fetch profile email (auth.users.email)
    type AuthUser = { email?: string | null }
    let customerEmail: string | null = null
    let supplierEmail: string | null = null

    if (b.customer_id) {
      const { data: customerAuth } = await adminClient.auth.admin.getUserById(b.customer_id)
      customerEmail = (customerAuth?.user as AuthUser | undefined)?.email || null
    }
    if (b.supplier?.profile_id) {
      const { data: supAuth } = await adminClient.auth.admin.getUserById(b.supplier.profile_id)
      supplierEmail = (supAuth?.user as AuthUser | undefined)?.email || null
    }

    let sent = 0
    const errors: string[] = []

    if (event === 'created') {
      // Notify supplier of new booking
      if (supplierEmail && !supplierEmail.endsWith('@madmonacairo.com')) {
        const tpl = newBookingForSupplierEmail({
          supplierName: b.supplier?.profile?.full_name || b.supplier?.business_name || 'Madmona Supplier',
          bookingRef: refCode,
          listingTitle: b.listing?.title || '',
          customerName: b.customer?.full_name || customerPhone || 'عميل',
          startAt: startStr,
          endAt: endStr,
          totalAmount: total,
          bookingUrl: `${SITE_URL}/supplier/marketplace/bookings/${b.id}`,
        })
        const r = await sendEmail({
          to: supplierEmail,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        if (r.ok) sent++
        else errors.push(`supplier: ${r.error}`)
      }
    }

    if (event === 'confirmed') {
      // Notify customer that booking is confirmed
      if (customerEmail && !customerEmail.endsWith('@madmonacairo.com')) {
        const tpl = bookingConfirmationEmail({
          customerName: b.customer?.full_name || customerPhone || 'عميل',
          bookingRef: refCode,
          listingTitle: b.listing?.title || '',
          startAt: startStr,
          endAt: endStr,
          totalAmount: total,
          bookingUrl,
        })
        const r = await sendEmail({
          to: customerEmail,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        if (r.ok) sent++
        else errors.push(`customer: ${r.error}`)
      }
    }

    // Optional: also notify Madmona admin of every new booking (CC behavior)
    // Skipped for now — supplier already gets the booking via Realtime + push.

    void supplierProfilePhone // silence unused

    return NextResponse.json({
      ok: true,
      sent,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function formatDateTimeArabic(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
