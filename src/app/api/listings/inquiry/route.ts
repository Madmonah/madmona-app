import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// ============================================================================
// POST /api/listings/inquiry
// «استفسار» على إعلان الماركت. المستفسر لازم يكون مسجّل.
// - لو صاحب الإعلان عنده حساب: بنلاقي/نعمل روم direct بينهم + notification_queue
//   (بوش) + نرجّع roomId فالمستفسر يروح على /team?room=<id>.
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

    // ---- مسار (أ): صاحب الإعلان عنده حساب → روم + بوش ----
    if (ownerProfileId) {
      // نلاقي روم direct موجود بينهم
      const { data: mine } = await admin.from('chat_room_members').select('room_id').eq('profile_id', me.id)
      const myIds = ((mine || []) as { room_id: string }[]).map(r => r.room_id)
      let roomId: string | null = null
      if (myIds.length) {
        const { data: theirs } = await admin.from('chat_room_members').select('room_id').eq('profile_id', ownerProfileId).in('room_id', myIds)
        const shared = ((theirs || []) as { room_id: string }[]).map(r => r.room_id)
        if (shared.length) {
          const { data: direct } = await admin.from('chat_rooms').select('id').eq('kind', 'direct').in('id', shared).limit(1)
          const d = (direct || []) as { id: string }[]
          if (d.length) roomId = d[0].id
        }
      }
      if (!roomId) {
        const { data: room } = await admin.from('chat_rooms').insert({ kind: 'direct', name: null, created_by: me.id } as never).select('id').single()
        roomId = (room as { id: string }).id
        await admin.from('chat_room_members').insert([
          { room_id: roomId, profile_id: me.id, role: 'owner' },
          { room_id: roomId, profile_id: ownerProfileId, role: 'member' },
        ] as never)
      }

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
        url: `/team?room=${roomId}`, data: { listing_id: l.id, room_id: roomId },
      } as never)

      await admin.from('listing_inquiries').insert({
        listing_id: l.id, listing_title: l.title, inquirer_id: me.id, inquirer_name: inquirerName,
        owner_profile_id: ownerProfileId, owner_phone: ownerPhoneIntl ? '0' + ownerPhoneIntl.slice(2) : null,
        room_id: roomId, channel: 'in_app', notified_via: ['push'],
      } as never)

      return NextResponse.json({ ok: true, channel: 'in_app', roomId, ownerName })
    }

    // ---- مسار (ب): صاحب الإعلان معندوش حساب → المارد يبعتله واتساب ----
    if (ownerPhoneIntl.length >= 11) {
      const localPhone = '0' + ownerPhoneIntl.slice(2)
      await admin.from('listing_inquiries').insert({
        listing_id: l.id, listing_title: l.title, inquirer_id: me.id, inquirer_name: inquirerName,
        owner_profile_id: null, owner_phone: localPhone, room_id: null, channel: 'whatsapp', notified_via: ['marid_queued'],
      } as never)
      await admin.from('marid_notifications').insert({
        kind: 'listing_inquiry', phone: localPhone,
        title: 'استفسار على إعلانك في مضمونة',
        body: `فيه حد مستفسر عن إعلانك «${l.title}» على مضمونة. ادخل شات مضمونة للرد على العميل، وفعّل الإشعارات علشان توصلك فورًا.`,
        ref_table: 'listings', ref_id: l.id, seen: false,
      } as never)

      // قناة شغّالة دلوقتي: تنبيه الأدمن بالإيميل (Resend) عشان يوصل لصاحب الإعلان يدوي
      // لحد ما واتساب المارد يرجع. كده مفيش استفسار بيضيع.
      try {
        const ownerEmail = process.env.MADMONA_OWNER_EMAIL
        if (ownerEmail) {
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

      return NextResponse.json({ ok: true, channel: 'whatsapp', pending: true })
    }

    return NextResponse.json({ ok: false, error: 'no_owner_contact', message: 'مفيش وسيلة تواصل لصاحب الإعلان' }, { status: 422 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
