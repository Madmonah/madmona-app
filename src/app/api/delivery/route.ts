// src/app/api/delivery/route.ts
// ============================================================================
// 🛵 سيستم الدليفري — API واحد لكل العمليات
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «عايز أعمل سيستم دليفري — طيارين»)
//
// POST  ?action=create_trip   → تسجيل رحلة (أدمن أو المارد)
// POST  ?action=assign        → إسناد رحلة لطيار + إشعاره واتساب
// POST  ?action=add_rider     → إضافة طيار
// GET   ?view=board           → لوحة الأدمن: الرحلات المفتوحة والطيارين
//
// ⚠️ صفحة الطيار نفسها في /delivery/[token] — بتحدّث الحالة عن طريق
//    rider_update_trip بالتوكن، مش من هنا.
//
// 💰 القاعدة: fee_egp سطر مستقل. ماتخصمش من صافي المورد ولا تتلمّ في
//    العمولة — ده شرط وعد «اللي تقوله هو اللي تقبضه».
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped as db } from '@/lib/supabase'

export const runtime = 'nodejs'

const SITE = 'https://www.madmonacairo.com'

function authorized(req: NextRequest): boolean {
  const s = req.headers.get('x-madmona-secret')
  return !!process.env.WA_SERVICE_SECRET && s === process.env.WA_SERVICE_SECRET
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { data: trips } = await db
    .from('delivery_trips')
    .select('id, order_ref, pickup_area, dropoff_area, fee_egp, cod_amount_egp, status, rider_id, created_at')
    .in('status', ['new', 'offered', 'accepted', 'picked_up'])
    .order('created_at', { ascending: true })

  const { data: riders } = await db
    .from('delivery_riders')
    .select('id, name, phone, zones, is_active')
    .eq('is_active', true)

  return NextResponse.json({ ok: true, trips: trips ?? [], riders: riders ?? [] })
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const action = req.nextUrl.searchParams.get('action')
  const body = await req.json().catch(() => ({}))

  // ── إضافة طيار ──────────────────────────────────────────────────────
  if (action === 'add_rider') {
    const { name, phone, zones, vehicle } = body
    if (!name || !phone) return NextResponse.json({ ok: false, error: 'الاسم والتليفون مطلوبين' })
    const normalized = String(phone).replace(/\D/g, '').replace(/^0/, '20')
    const { data, error } = await db
      .from('delivery_riders')
      .insert({ name, phone: normalized, zones: zones ?? [], vehicle: vehicle ?? null })
      .select('id, access_token')
      .maybeSingle()
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json({
      ok: true,
      rider_id: data?.id,
      // اللينك اللي الطيار بيشتغل منه — يتبعتله مرة واحدة ويحفظه
      rider_link: `${SITE}/delivery/${data?.access_token}`,
    })
  }

  // ── تسجيل رحلة ─────────────────────────────────────────────────────
  if (action === 'create_trip') {
    const { order_ref, order_id, order_kind, supplier_id,
            pickup_area, pickup_address, pickup_phone, pickup_maps_url,
            dropoff_area, dropoff_address, dropoff_phone, dropoff_maps_url,
            notes, fee_egp, rider_payout_egp, cod_amount_egp } = body
    if (!pickup_area || !dropoff_area) {
      return NextResponse.json({ ok: false, error: 'منطقة الاستلام والتسليم مطلوبين' })
    }
    const { data, error } = await db
      .from('delivery_trips')
      .insert({
        order_ref: order_ref ?? null, order_id: order_id ?? null,
        order_kind: order_kind ?? 'manual', supplier_id: supplier_id ?? null,
        pickup_area, pickup_address: pickup_address ?? null, pickup_phone: pickup_phone ?? null,
        pickup_maps_url: pickup_maps_url ?? null,
        dropoff_area, dropoff_address: dropoff_address ?? null, dropoff_phone: dropoff_phone ?? null,
        dropoff_maps_url: dropoff_maps_url ?? null,
        notes: notes ?? null,
        fee_egp: Number(fee_egp) || 0,
        rider_payout_egp: Number(rider_payout_egp) || 0,
        cod_amount_egp: Number(cod_amount_egp) || 0,
      })
      .select('id')
      .maybeSingle()
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json({ ok: true, trip_id: data?.id })
  }

  // ── إسناد + إشعار الطيار على الواتساب ──────────────────────────────
  if (action === 'assign') {
    const { trip_id } = body
    if (!trip_id) return NextResponse.json({ ok: false, error: 'trip_id مطلوب' })

    const { data: riderId, error } = await db.rpc('assign_delivery_trip', { p_trip: trip_id })
    if (error) return NextResponse.json({ ok: false, error: error.message })
    if (!riderId) {
      // ⚠️ مفيش طيار متاح للمنطقة دي — الرحلة فضلت new والأدمن شايفها.
      //    مش بنرمي إيرور: ده وضع طبيعي في البداية، مش عطل.
      return NextResponse.json({ ok: true, assigned: false, note: 'مفيش طيار متاح للمنطقة — الرحلة مستنية' })
    }

    const { data: rider } = await db
      .from('delivery_riders')
      .select('name, phone, access_token')
      .eq('id', riderId)
      .maybeSingle()
    const { data: trip } = await db
      .from('delivery_trips')
      .select('pickup_area, pickup_address, dropoff_area, rider_payout_egp, cod_amount_egp')
      .eq('id', trip_id)
      .maybeSingle()

    // الإشعار بيمشي من طابور الحملات الموجود — نفس بوابة التأكيد ونفس
    // قواعد الأمان. مش بنعمل مسار إرسال جديد.
    if (rider && trip) {
      await db.from('whatsapp_campaign_messages').insert({
        recipient_phone: rider.phone,
        recipient_name: rider.name,
        status: 'queued',
        scheduled_for: new Date().toISOString(),
        channel: 'whatsapp',
        session: 'madmona-982',
        attempts: 0,
        template_vars: { campaign_name: 'booking_alert', note: 'delivery_trip_offer' },
        message_content:
          `🛵 *رحلة جديدة يا ${rider.name}*\n\n` +
          `📍 استلام: ${trip.pickup_area}${trip.pickup_address ? ` — ${trip.pickup_address}` : ''}\n` +
          `🏁 تسليم: ${trip.dropoff_area}\n` +
          `💰 أجرتك: ${trip.rider_payout_egp} ج` +
          (Number(trip.cod_amount_egp) > 0 ? `\n💵 تحصيل من العميل: ${trip.cod_amount_egp} ج` : '') +
          `\n\nاقبل أو ارفض من هنا 👇\n${SITE}/delivery/${rider.access_token}`,
      })
    }

    return NextResponse.json({ ok: true, assigned: true, rider_id: riderId, rider_name: rider?.name })
  }

  // ── مراجعة أوراق طيار: روابط موقّتة للبطاقة والرخصة ─────────────────
  // الباكت برايفت — الروابط دي صالحة ساعة واحدة للمراجعة وبس.
  if (action === 'review_rider') {
    const { rider_id } = body
    const { data: r } = await db
      .from('delivery_riders')
      .select('id, name, phone, vehicle, zones, verification_status, national_id_url, vehicle_license_url')
      .eq('id', rider_id)
      .maybeSingle()
    if (!r) return NextResponse.json({ ok: false, error: 'الطيار مش موجود' })

    const sign = async (path: string | null) => {
      if (!path) return null
      const { data } = await db.storage.from('rider-docs').createSignedUrl(path, 3600)
      return data?.signedUrl ?? null
    }
    return NextResponse.json({
      ok: true,
      rider: {
        ...r,
        national_id_url: await sign(r.national_id_url),
        vehicle_license_url: await sign(r.vehicle_license_url),
      },
    })
  }

  // ── الموافقة / الرفض ────────────────────────────────────────────────
  if (action === 'approve_rider' || action === 'reject_rider') {
    const { rider_id, reason } = body
    const approving = action === 'approve_rider'
    const { data: r, error } = await db
      .from('delivery_riders')
      .update({
        verification_status: approving ? 'approved' : 'rejected',
        rejection_reason: approving ? null : (reason || 'الصور مش واضحة'),
        verified_at: approving ? new Date().toISOString() : null,
      })
      .eq('id', rider_id)
      .select('name, phone, access_token')
      .maybeSingle()
    if (error || !r) return NextResponse.json({ ok: false, error: error?.message || 'الطيار مش موجود' })

    // إبلاغ الطيار — من نفس الطابور بنفس بوابة التأكيد
    await db.from('whatsapp_campaign_messages').insert({
      recipient_phone: r.phone, recipient_name: r.name,
      status: 'queued', scheduled_for: new Date().toISOString(),
      channel: 'whatsapp', session: 'madmona-982', attempts: 0,
      template_vars: { campaign_name: 'booking_alert', note: 'rider_verification' },
      message_content: approving
        ? `🎉 *مبروك يا ${r.name}!*\n\nأوراقك اتوافق عليها وحسابك اتفعّل. هتبدأ توصلك رحلات على الواتساب — وده حسابك 👇\n${SITE}/delivery/${r.access_token}`
        : `📄 *يا ${r.name}، أوراقك محتاجة تتظبط*\n\nالسبب: ${reason || 'الصور مش واضحة'}\n\nصوّرها تاني بوضوح وارفعها من هنا 👇\n${SITE}/delivery/register`,
    })
    return NextResponse.json({ ok: true, status: approving ? 'approved' : 'rejected' })
  }

  return NextResponse.json({ ok: false, error: 'action غير معروف' })
}
