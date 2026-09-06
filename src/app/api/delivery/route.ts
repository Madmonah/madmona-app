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

  // 🛵 (٦/٩/٢٠٢٦) اللوحة بقت شاشة كاملة (/admin/delivery): الرحلات بتفاصيلها
  //    (المسافة · المركبة · الأجرة · الأصناف) + كل الطيارين بحالة أوراقهم + التعريفة.
  const { data: trips } = await db
    .from('delivery_trips')
    .select('id, order_ref, order_kind, supplier_id, pickup_area, pickup_address, dropoff_area, dropoff_address, fee_egp, rider_payout_egp, cod_amount_egp, currency, distance_km, vehicle_type, fee_source, items, status, rider_id, created_at, delivered_at')
    .in('status', ['new', 'offered', 'accepted', 'picked_up'])
    .order('created_at', { ascending: true })

  const { data: riders } = await db
    .from('delivery_riders')
    .select('id, name, phone, zones, vehicle, is_active, verification_status, created_at')
    .order('created_at', { ascending: false })

  const { data: vehicleTypes } = await db
    .from('delivery_vehicle_types')
    .select('key, name_ar, emoji, base_fee, per_km, min_fee, currency, active, sort')
    .order('sort')

  return NextResponse.json({ ok: true, trips: trips ?? [], riders: riders ?? [], vehicle_types: vehicleTypes ?? [] })
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
            notes, fee_egp, rider_payout_egp, cod_amount_egp,
            // 🛵 (٦/٩/٢٠٢٦) المسافة والمركبة والأصناف — السعر من التعريفة لو fee_source='auto'
            pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type, items, currency, fee_source } = body
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
        pickup_lat: pickup_lat != null && pickup_lat !== '' ? Number(pickup_lat) : null,
        pickup_lng: pickup_lng != null && pickup_lng !== '' ? Number(pickup_lng) : null,
        dropoff_lat: dropoff_lat != null && dropoff_lat !== '' ? Number(dropoff_lat) : null,
        dropoff_lng: dropoff_lng != null && dropoff_lng !== '' ? Number(dropoff_lng) : null,
        vehicle_type: vehicle_type || null,
        items: Array.isArray(items) ? items : [],
        currency: currency || 'EGP',
        fee_source: fee_source === 'manual' ? 'manual' : 'auto',
      })
      .select('id, fee_egp, distance_km, fee_source, currency')
      .maybeSingle()
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json({ ok: true, trip_id: data?.id, trip: data })
  }

  // ── تسعيرة قبل الإنشاء: المسافة × تعريفة المركبة ────────────────────────
  if (action === 'quote') {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type } = body
    const { data, error } = await db.rpc('delivery_quote', {
      p_pickup_lat: Number(pickup_lat), p_pickup_lng: Number(pickup_lng),
      p_drop_lat: Number(dropoff_lat), p_drop_lng: Number(dropoff_lng), p_vehicle: String(vehicle_type || ''),
    })
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json(data)
  }

  // ── تعبئة الرحلة من أوردر الماركت: الاستلام من فرع المورد، التسليم من عنوان العميل، الأصناف ──
  if (action === 'prefill_from_order') {
    const ref = String(body.order_ref || body.order_id || '').trim()
    if (!ref) return NextResponse.json({ ok: false, error: 'رقم الأوردر مطلوب' })
    const isUuid = /^[0-9a-f-]{36}$/i.test(ref)
    const { data: o } = await db
      .from('marketplace_orders')
      .select('id, reference_code, supplier_id, order_type, total_amount, currency, payment_method, delivery_address, delivery_district, delivery_phone, delivery_lat, delivery_lng, guest_name, items:marketplace_order_items(name_snapshot, quantity, unit_price)')
      .eq(isUuid ? 'id' : 'reference_code', ref)
      .maybeSingle()
    if (!o) return NextResponse.json({ ok: false, error: 'الأوردر مش موجود' })
    const { data: sup } = await db.from('suppliers').select('business_name, contact_phone, city, district, address').eq('id', o.supplier_id).maybeSingle()
    const { data: br } = await db
      .from('supplier_branches')
      .select('name, address, city, district, phone, latitude, longitude')
      .eq('supplier_id', o.supplier_id)
      .order('created_at')
      .limit(1)
      .maybeSingle()
    const cod = String(o.payment_method || '').toLowerCase().includes('cash') || String(o.payment_method || '') === 'cod' ? Number(o.total_amount) : 0
    return NextResponse.json({
      ok: true,
      prefill: {
        order_ref: o.reference_code || o.id, order_id: o.id, order_kind: o.order_type || 'product', supplier_id: o.supplier_id,
        pickup_area: br?.district || br?.city || sup?.district || sup?.city || '',
        pickup_address: [sup?.business_name, br?.name, br?.address || sup?.address].filter(Boolean).join(' — '),
        pickup_phone: br?.phone || sup?.contact_phone || '',
        pickup_lat: br?.latitude ?? null, pickup_lng: br?.longitude ?? null,
        dropoff_area: o.delivery_district || '', dropoff_address: o.delivery_address || '', dropoff_phone: o.delivery_phone || '',
        dropoff_lat: o.delivery_lat ?? null, dropoff_lng: o.delivery_lng ?? null,
        items: (o.items as Array<{ name_snapshot: string; quantity: number; unit_price: number }> | null ?? []).map((it) => ({ name: it.name_snapshot, qty: it.quantity, price: it.unit_price })),
        cod_amount_egp: cod, currency: o.currency || 'EGP',
        notes: o.guest_name ? `العميل: ${o.guest_name}` : '',
      },
    })
  }

  // ── التعريفة: كل مركبة وليها سعر (فتح عدّاد + لكل كيلو + أقل أجرة) ──────
  if (action === 'save_vehicle_type') {
    const { key, name_ar, emoji, base_fee, per_km, min_fee, currency, active } = body
    if (!key) return NextResponse.json({ ok: false, error: 'key مطلوب' })
    const num = (v: unknown) => (v === '' || v == null ? null : Number(v))
    const { error } = await db.from('delivery_vehicle_types').upsert({
      key: String(key), name_ar: String(name_ar || key), emoji: emoji || null,
      base_fee: num(base_fee), per_km: num(per_km), min_fee: num(min_fee),
      currency: currency || 'EGP', active: active !== false, updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })
    if (error) return NextResponse.json({ ok: false, error: error.message })
    return NextResponse.json({ ok: true })
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
