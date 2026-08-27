import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { sendText } from '@/lib/whatsapp'
import { postSalesInquiry, ensureInquiryRoom, ALIAS_CUSTOMER } from '@/lib/sales-inquiry-room'

export const runtime = 'nodejs'

// ============================================================================
// POST /api/listings/inquiry
// «استفسار» على إعلان الماركت. المستفسر لازم يكون مسجّل.
// - لو صاحب الإعلان عنده حساب: بنلاقي/نعمل روم direct بينهم + notification_queue
//   (بوش) + نرجّع roomId فالمستفسر يروح على /chat/team?room=<id>.
// - لو معندوش حساب: بنسجّل listing_inquiries + marid_notifications
//   (kind='listing_inquiry') فالمارد يبعتله واتساب: «فيه استفسار على إعلانك».
// body: { listingId }
// ============================================================================

function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

// موردين مضمونة الداخليين — دول مش «صاحب» حقيقي، فبنعتمد على contact_phone بدلهم
const MADMONA_INTERNAL = new Set([
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  '147cd904-3228-401c-8b5f-79f43d6d081f',
])

/* eslint-disable @typescript-eslint/no-explicit-any */
/** روم direct بين اتنين — بيرجّع الموجود أو يعمل واحد جديد.
    ⚠️ النوع `any` هنا عن قصد: أنواع Supabase المولّدة بتختلف حسب الجينيريك
       اللي اتعمل بيه العميل، وتثبيتها هنا بيكسر التمرير. */
async function ensureDirectRoom(admin: any, aId: string, bId: string): Promise<string> {
  const { data: mine } = await admin.from('chat_room_members').select('room_id').eq('profile_id', aId)
  const myIds = ((mine || []) as { room_id: string }[]).map(r => r.room_id)
  if (myIds.length) {
    const { data: theirs } = await admin.from('chat_room_members')
      .select('room_id').eq('profile_id', bId).in('room_id', myIds)
    const shared = ((theirs || []) as { room_id: string }[]).map(r => r.room_id)
    if (shared.length) {
      const { data: direct } = await admin.from('chat_rooms')
        .select('id').eq('kind', 'direct').in('id', shared).limit(1)
      const d = (direct || []) as { id: string }[]
      if (d.length) return d[0].id
    }
  }
  const { data: room } = await admin.from('chat_rooms')
    .insert({ kind: 'direct', name: null, created_by: aId } as never).select('id').single()
  const roomId = (room as unknown as { id: string }).id
  await admin.from('chat_room_members').insert([
    { room_id: roomId, profile_id: aId, role: 'owner' },
    { room_id: roomId, profile_id: bId, role: 'member' },
  ] as never)
  return roomId
}

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    let body: { listingId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
    const listingId = String(body.listingId || '')
    if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ ok: false, error: 'bad listingId' }, { status: 400 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data: userData, error: uErr } = await admin.auth.getUser(token)
    const me = userData?.user
    if (uErr || !me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    // الإعلان + صاحبه
    const { data: listing } = await admin.from('listings')
      .select('id, title, slug, contact_phone, supplier_id, marketplace_suppliers(profile_id)')
      .eq('id', listingId).eq('status', 'published').maybeSingle()
    if (!listing) return NextResponse.json({ ok: false, error: 'listing not found' }, { status: 404 })

    const l = listing as unknown as { id: string; title: string; slug: string | null; contact_phone: string | null; supplier_id: string; marketplace_suppliers?: { profile_id?: string } | null }
    const supplierProfileId = l.marketplace_suppliers?.profile_id || null

    // اسم المستفسر
    const { data: meProf } = await admin.from('profiles').select('full_name').eq('id', me.id).maybeSingle()
    const inquirerName = (meProf as { full_name?: string } | null)?.full_name || 'مستفسر'

    // نحدد صاحب الإعلان: الأولوية لرقم التواصل (اللي نشر فعلاً)، وإلا بروفايل المورّد (لو مش مضمونة داخلي)
    let ownerProfileId: string | null = null
    let ownerName: string | null = null
    const ownerPhoneIntl = l.contact_phone ? normEg(l.contact_phone) : ''
    if (ownerPhoneIntl.length >= 11) {
      const local = '0' + ownerPhoneIntl.slice(2)
      const { data: owner } = await admin.from('profiles').select('id, full_name').in('phone', [local, ownerPhoneIntl, '+' + ownerPhoneIntl]).limit(1).maybeSingle()
      if (owner) { ownerProfileId = (owner as { id: string }).id; ownerName = (owner as { full_name?: string }).full_name || null }
    }
    if (!ownerProfileId && supplierProfileId && !MADMONA_INTERNAL.has(l.supplier_id)) {
      ownerProfileId = supplierProfileId
    }

    if (ownerProfileId && ownerProfileId === me.id) {
      return NextResponse.json({ ok: false, error: 'self', message: 'ده إعلانك أنت 🙂' }, { status: 400 })
    }

    // ========================================================================
    // 🏢🚗 (٢٠ أغسطس ٢٠٢٦) العقارات والعربيات → الاستفسار يروح **لمضمونة**
    //
    // محمد: «عايز الاستفسار بتاع العقارات والعربيات يودّي على رقم مضمونة
    //        بس، وبرضو يكون مربوط بصاحب الإعلان بحيث يكون واضح في الأدمن».
    //
    // دي القطاعات اللي فيها عمولة. قبل كده الاستفسار كان بيروح لصاحب
    // الإعلان **مباشرة** — يعني الصفقة تتقفل بره المنصة والعمولة تضيع.
    //
    // ⚠️ صاحب الإعلان **مابيضيعش** — بيتسجّل في `listing_inquiries`
    //    (`owner_profile_id` / `owner_phone` / `owner_name` / `supplier_id`)
    //    و`routed_to='madmona'`، وبيتكتب في أول رسالة في الشات كمان،
    //    فالأدمن شايف الاستفسار ده بتاع مين من غير ما يدوّر.
    // ========================================================================
    let brokered = false
    try {
      const { data: b } = await admin.rpc('listing_is_brokered' as never,
        { p_listing_id: l.id } as never)
      brokered = b === true
    } catch (e) {
      console.error('[inquiry] listing_is_brokered failed:', e)
    }

    const ownerPhoneLocal = ownerPhoneIntl ? '0' + ownerPhoneIntl.slice(2) : null

    if (brokered) {
      const madmonaProfileId = '147cd904-3228-401c-8b5f-79f43d6d081f'

      // لو المستفسر هو مضمونة نفسها، مفيش داعي
      if (me.id === madmonaProfileId) {
        return NextResponse.json({ ok: false, error: 'self', message: 'ده إعلانك أنت 🙂' }, { status: 400 })
      }

      // 💬 (٢٧ أغسطس ٢٠٢٦) محمد: «شات ثلاثي لكل استفسار» — العميل +
      //     صاحب الإعلان + فريق مضمونة في روم واحد، بدل شات مباشر مع
      //     محمد لوحده. لو الروم فشل لأي سبب، بنرجع للشات المباشر
      //     عشان الاستفسار ما يضيعش.
      const triad = await ensureInquiryRoom(admin, {
        listingTitle: l.title,
        inquirerId: me.id,
        inquirerName,
        ownerProfileId,
        ownerName,
        ownerPhone: ownerPhoneLocal,
      })
      const roomId = triad || (await ensureDirectRoom(admin, me.id, madmonaProfileId))

      // 🏷️ بيانات صاحب الإعلان في نص الرسالة — عشان اللي بيرد يعرف
      //    يكلّم مين من غير ما يفتح الأدمن
      const ownerLine = ownerName || ownerPhoneLocal
        ? `\n(صاحب الإعلان: ${ownerName || '—'}${ownerPhoneLocal ? ' · ' + ownerPhoneLocal : ''})`
        : ''

      await admin.from('chat_messages').insert({
        room_id: roomId, sender_id: me.id, sender_kind: 'user',
        // 🔒 في الروم الثلاثي بنكتب اللقب — الاسم الحقيقي للفريق بس
        sender_name: triad ? ALIAS_CUSTOMER : inquirerName, kind: 'text',
        body: triad
          ? `مرحبا 👋 عندي استفسار بخصوص «${l.title}».`
          : `مرحبا 👋 عندي استفسار بخصوص «${l.title}».${ownerLine}`,
      } as never)

      await admin.from('notification_queue').insert({
        recipient_id: madmonaProfileId, type: 'listing_inquiry',
        title: 'استفسار جديد 📩 (عقارات/عربيات)',
        body: `${inquirerName} مستفسر عن «${l.title}».`,
        url: `/chat/team?room=${roomId}`,
        data: { listing_id: l.id, room_id: roomId, owner_profile_id: ownerProfileId, owner_phone: ownerPhoneLocal },
      } as never)

      await admin.from('listing_inquiries').insert({
        listing_id: l.id, listing_title: l.title, inquirer_id: me.id, inquirer_name: inquirerName,
        owner_profile_id: ownerProfileId, owner_phone: ownerPhoneLocal, owner_name: ownerName,
        supplier_id: l.supplier_id, room_id: roomId, channel: 'in_app',
        routed_to: 'madmona', notified_via: ['push'],
      } as never)

      // 🏠🚗 (٢٧ أغسطس ٢٠٢٦) كمان في روم الفريق — قبل كده كان بيروح لمحمد
      //     لوحده، فلو مش فاضي الاستفسار يقف وباقي الفريق مش شايفه.
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      await postSalesInquiry(admin as any, {
        kind: 'عقارات/عربيات',
        title: l.title,
        inquirerName,
        ownerName,
        ownerPhone: ownerPhoneLocal,
        ownerProfileId,
        link: `/chat/team?room=${roomId}`,
      })

      return NextResponse.json({ ok: true, channel: 'in_app', roomId, ownerName: 'مضمونة', brokered: true })
    }

    // ---- مسار (أ): صاحب الإعلان عنده حساب → روم + بوش ----
    if (ownerProfileId) {
      const roomId = await ensureDirectRoom(admin, me.id, ownerProfileId)

      // رسالة افتتاحية في الروم
      await admin.from('chat_messages').insert({
        room_id: roomId, sender_id: me.id, sender_kind: 'user', sender_name: inquirerName, kind: 'text',
        body: `مرحبا 👋 عندي استفسار بخصوص إعلانك «${l.title}».`,
      } as never)

      // نوتيفيكيشن (بوش) لصاحب الإعلان عبر الطابور
      await admin.from('notification_queue').insert({
        recipient_id: ownerProfileId, type: 'listing_inquiry',
        title: 'استفسار جديد على إعلانك 📩',
        body: `${inquirerName} عايز يستفسر عن «${l.title}». افتح الشات للرد.`,
        url: `/chat/team?room=${roomId}`, data: { listing_id: l.id, room_id: roomId },
      } as never)

      await admin.from('listing_inquiries').insert({
        listing_id: l.id, listing_title: l.title, inquirer_id: me.id, inquirer_name: inquirerName,
        owner_profile_id: ownerProfileId, owner_phone: ownerPhoneLocal, owner_name: ownerName,
        supplier_id: l.supplier_id, room_id: roomId, channel: 'in_app',
        routed_to: 'owner', notified_via: ['push'],
      } as never)

      return NextResponse.json({ ok: true, channel: 'in_app', roomId, ownerName })
    }

    // ---- مسار (ب): صاحب الإعلان معندوش حساب → المارد يبعتله واتساب ----
    if (ownerPhoneIntl.length >= 11) {
      const localPhone = '0' + ownerPhoneIntl.slice(2)

      // القناة الأساسية: واتساب لصاحب الإعلان عبر خدمة المارد (Railway) — sendText بيروح
      // على WA_SERVICE_URL. Baileys بيبعت لأي رقم من غير قيود template/24 ساعة.
      const waBody = `السلام عليكم 👋\n`
        + `فيه عميل على مضمونة مستفسر عن إعلانك «${l.title}».\n`
        + `ادخل شات مضمونة للرد عليه: https://www.madmonacairo.com/team\n`
        + `ولو حابب، فعّل حسابك علشان توصلك الاستفسارات فورًا.`
      let waSent = false
      try {
        const waRes = await sendText({ to: ownerPhoneIntl, body: waBody, agentName: 'مضمونة' })
        waSent = !!waRes.ok
      } catch { /* best-effort */ }

      await admin.from('listing_inquiries').insert({
        listing_id: l.id, listing_title: l.title, inquirer_id: me.id, inquirer_name: inquirerName,
        owner_profile_id: null, owner_phone: localPhone, owner_name: ownerName,
        supplier_id: l.supplier_id, room_id: null, channel: 'whatsapp',
        routed_to: 'owner', notified_via: waSent ? ['whatsapp'] : ['email_fallback'],
      } as never)

      // fallback: لو واتساب المارد مبعتش (سيشن مفصول/الخدمة مش متظبطة)، نبعت إيميل
      // تنبيه للأدمن عشان يوصل لصاحب الإعلان يدوي — كده مفيش استفسار بيضيع.
      try {
        const ownerEmail = process.env.MADMONA_OWNER_EMAIL
        if (!waSent && ownerEmail) {
          const link = l.slug ? `https://www.madmonacairo.com/marketplace/${l.slug}` : ''
          await sendEmail({
            to: ownerEmail,
            subject: `📩 استفسار جديد على إعلان: ${l.title}`,
            text: `استفسار جديد على إعلان في الماركت — صاحب الإعلان لسه مش مسجّل على مضمونة.\n\n`
              + `الإعلان: ${l.title}\n`
              + `رقم صاحب الإعلان: ${localPhone}\n`
              + `المستفسر: ${inquirerName}\n`
              + (link ? `رابط الإعلان: ${link}\n` : '')
              + `\nكلّم صاحب الإعلان على واتساب وقوله يدخل شات مضمونة يرد على العميل ويفعّل حسابه.`,
          })
        }
      } catch { /* الإيميل best-effort */ }

      return NextResponse.json({ ok: true, channel: 'whatsapp', sent: waSent, pending: !waSent })
    }

    return NextResponse.json({ ok: false, error: 'no_owner_contact', message: 'مفيش وسيلة تواصل لصاحب الإعلان' }, { status: 422 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
