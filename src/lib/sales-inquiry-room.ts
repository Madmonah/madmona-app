// src/lib/sales-inquiry-room.ts
// ============================================================================
// 🏠🚗 (٢٧ أغسطس ٢٠٢٦) محمد: «الاستفسارات سواء للعقارات اللي في بورصة مضمونة
//      أو اللي في قسم البيع في العقارات أو في قسم البيع في السيارات تودّي على
//      شات مضمونة في شات جديد يتحط فيه موظفين مضمونة كلهم ما عدا سامية
//      (مبقتش في الفريق) ومحمد (أوفيس بوي)».
//
// وبعدها: «رأيي تتولد محادثة فيها أعضاء الفريق وصاحب الإعلان بحيث نقدر نتواصل
//      معاه كفريق لمضمونة وكصاحب إعلان».
//
// فبقى عندنا مسارين:
//   ① روم الفريق الثابت — كل استفسار بيتسجّل فيه (لوحة متابعة للفريق كله).
//   ② روم لكل صاحب إعلان — الفريق + صاحب الإعلان، بيتعمل أول مرة وبيتعاد
//      استخدامه بعد كده، فمفيش روم جديد كل استفسار.
//
// ⚠️ العميل المستفسر **مش** عضو في أي منهم — لو دخل هيشوف بيانات كل العملاء
//    والملاك التانيين. العميل بيفضل في شاته المباشر، والرومات دي فيها لينك ليه.
// ============================================================================

/** الروم الجماعي الثابت — اتعمل في الداتابيز ٢٧ أغسطس ٢٠٢٦ */
export const SALES_INQUIRY_ROOM_ID = '76a7fdbd-fc75-4e2e-8d48-fdf6b285a8f2'

/* eslint-disable @typescript-eslint/no-explicit-any */
type AdminClient = any

export type SalesInquiryInput = {
  /** «عقارات/عربيات» · «بورصة عقارية» */
  kind: string
  title: string
  inquirerName?: string | null
  inquirerPhone?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  /** بروفايل صاحب الإعلان — لو موجود بنعمل روم مشترك معاه */
  ownerProfileId?: string | null
  /** لينك الشات المباشر مع العميل، أو لينك الإعلان */
  link?: string | null
}

/** أعضاء روم الفريق (اللي اتحددوا في الداتابيز) */
async function teamMemberIds(admin: AdminClient): Promise<string[]> {
  const { data } = await admin.from('chat_room_members')
    .select('profile_id').eq('room_id', SALES_INQUIRY_ROOM_ID)
  return ((data || []) as { profile_id: string }[]).map((m) => m.profile_id)
}

async function notify(admin: AdminClient, ids: string[], title: string, body: string, url: string, data: unknown) {
  if (!ids.length) return
  await admin.from('notification_queue').insert(
    ids.map((rid) => ({ recipient_id: rid, type: 'sales_inquiry', title, body, url, data })),
  )
}

/**
 * روم «فريق مضمونة + صاحب الإعلان».
 * بيدوّر على روم موجود بنفس الاسم الأول — فصاحب الإعلان مابياخدش روم جديد
 * مع كل استفسار. بيرجّع null لو صاحب الإعلان معندوش حساب.
 */
export async function ensureOwnerTeamRoom(
  admin: AdminClient,
  ownerProfileId: string | null | undefined,
  ownerName: string | null | undefined,
): Promise<string | null> {
  if (!ownerProfileId) return null
  try {
    const roomName = `مضمونة × ${ownerName || 'صاحب إعلان'}`

    // موجود قبل كده؟ (روم جروب صاحب الإعلان عضو فيه وبنفس الاسم)
    const { data: mine } = await admin.from('chat_room_members')
      .select('room_id').eq('profile_id', ownerProfileId)
    const ids = ((mine || []) as { room_id: string }[]).map((r) => r.room_id)
    if (ids.length) {
      const { data: rooms } = await admin.from('chat_rooms')
        .select('id').eq('kind', 'group').eq('name', roomName).in('id', ids).limit(1)
      const r = (rooms || []) as { id: string }[]
      if (r.length) return r[0].id
    }

    const team = await teamMemberIds(admin)
    const { data: room } = await admin.from('chat_rooms')
      .insert({ kind: 'group', name: roomName, marid_enabled: false, created_by: team[0] || ownerProfileId })
      .select('id').single()
    const roomId = (room as { id: string } | null)?.id
    if (!roomId) return null

    const members = [...new Set([...team, ownerProfileId])].map((pid) => ({
      room_id: roomId, profile_id: pid,
      role: pid === ownerProfileId ? 'member' : 'member',
    }))
    await admin.from('chat_room_members').insert(members)

    await admin.from('chat_messages').insert({
      room_id: roomId, sender_id: null, sender_kind: 'system', sender_name: 'مضمونة', kind: 'text',
      body: `أهلًا 👋 ده شات مشترك بينك وبين فريق مضمونة — أي استفسار على إعلاناتك هيتكتب هنا وتقدر ترد علينا مباشرة.`,
    })
    return roomId
  } catch (e) {
    console.error('[ensureOwnerTeamRoom] failed:', e)
    return null
  }
}

/**
 * بيكتب الاستفسار في روم الفريق + في روم صاحب الإعلان (لو عنده حساب)،
 * وبيبعت إشعارات. best-effort: أي فشل هنا **مايوقّفش** الاستفسار نفسه.
 */
export async function postSalesInquiry(admin: AdminClient, i: SalesInquiryInput): Promise<string | null> {
  try {
    const lines = [
      `📩 استفسار جديد — ${i.kind}`,
      `الإعلان: «${i.title}»`,
      i.inquirerName || i.inquirerPhone
        ? `المستفسر: ${i.inquirerName || '—'}${i.inquirerPhone ? ' · ' + i.inquirerPhone : ''}`
        : null,
      i.ownerName || i.ownerPhone
        ? `صاحب الإعلان: ${i.ownerName || '—'}${i.ownerPhone ? ' · ' + i.ownerPhone : ''}`
        : null,
      i.link ? `الرد على العميل: ${i.link}` : null,
    ].filter(Boolean)
    const body = lines.join('\n')

    // ① روم الفريق
    await admin.from('chat_messages').insert({
      room_id: SALES_INQUIRY_ROOM_ID, sender_id: null, sender_kind: 'system',
      sender_name: 'مضمونة', kind: 'text', body,
    })
    const team = await teamMemberIds(admin)
    await notify(admin, team, `استفسار جديد 📩 (${i.kind})`,
      `${i.inquirerName || 'عميل'} مستفسر عن «${i.title}».`,
      i.link || `/chat/team?room=${SALES_INQUIRY_ROOM_ID}`,
      { room_id: SALES_INQUIRY_ROOM_ID, kind: i.kind, title: i.title })

    // ② روم الفريق + صاحب الإعلان
    const ownerRoom = await ensureOwnerTeamRoom(admin, i.ownerProfileId, i.ownerName)
    if (ownerRoom) {
      await admin.from('chat_messages').insert({
        room_id: ownerRoom, sender_id: null, sender_kind: 'system', sender_name: 'مضمونة', kind: 'text',
        body: `📩 فيه استفسار جديد على «${i.title}». فريق مضمونة بيتابع معاك من هنا.`,
      })
      if (i.ownerProfileId) {
        await notify(admin, [i.ownerProfileId], 'استفسار على إعلانك 📩',
          `فيه عميل مستفسر عن «${i.title}».`, `/chat/team?room=${ownerRoom}`,
          { room_id: ownerRoom, title: i.title })
      }
    }
    return ownerRoom
  } catch (e) {
    console.error('[postSalesInquiry] failed:', e)
    return null
  }
}

// ============================================================================
// 💬 (٢٧ أغسطس ٢٠٢٦ — تعديل) محمد: «شايف كده شات ثلاثي لكل استفسار».
//
// فبدل ما العميل يفضل في شات مباشر لوحده، كل استفسار بقى ليه روم واحد فيه
// التلاتة: **العميل + صاحب الإعلان + فريق مضمونة**. مضمونة موجودة في نص
// الصفقة من أول رسالة، فمفيش حاجة بتتقفل بره المنصة من غير ما الفريق يشوف.
//
// روم لكل استفسار (مش لكل صاحب إعلان) — عشان كل صفقة تفضل منفصلة وواضحة.
// لو صاحب الإعلان معندوش حساب، الروم بيتعمل بالعميل + الفريق بس، ولما
// يسجّل بعدين ينضم.
// ============================================================================
export async function ensureInquiryRoom(
  admin: AdminClient,
  opts: {
    listingTitle: string
    inquirerId: string
    inquirerName?: string | null
    ownerProfileId?: string | null
    ownerName?: string | null
    ownerPhone?: string | null
  },
): Promise<string | null> {
  try {
    const team = await teamMemberIds(admin)
    const name = `استفسار: ${opts.listingTitle}`.slice(0, 120)

    const { data: room } = await admin.from('chat_rooms')
      .insert({ kind: 'group', name, marid_enabled: false, created_by: opts.inquirerId, masked_identities: true })
      .select('id').single()
    const roomId = (room as { id: string } | null)?.id
    if (!roomId) return null

    // 🔒 دور كل عضو متخزّن في role — الفرونت بيحوّله للقب المناسب في
    //    الرومات المخفية: team → «فريق مضمونة» · owner_party → «صاحب الإعلان»
    //    · customer → «العميل». من غير كده مش هنعرف نخفي مين بالظبط.
    const ids = [...new Set([opts.inquirerId, ...(opts.ownerProfileId ? [opts.ownerProfileId] : []), ...team])]
    await admin.from('chat_room_members').insert(
      ids.map((pid) => ({
        room_id: roomId,
        profile_id: pid,
        role: team.includes(pid) ? 'admin'
          : pid === opts.ownerProfileId ? 'owner_party'
          : 'customer',
      })),
    )

    // 🔒 (٢٧ أغسطس ٢٠٢٦) محمد: «مش هنعرض الاسم ورقم التليفون إلا لما يتم
    //    الاتفاق في حضور مضمونة». فالروم الثلاثي بيستخدم ألقاب بس —
    //    مفيش اسم حقيقي ولا رقم موبايل لأي طرف. بيانات الطرفين الحقيقية
    //    موجودة في روم الفريق و listing_inquiries (للفريق بس).
    const ownerLine = opts.ownerProfileId
      ? `صاحب الإعلان معانا هنا 👋`
      : `فريق مضمونة هيوصل صاحب الإعلان ويضمّه للشات.`

    await admin.from('chat_messages').insert({
      room_id: roomId, sender_id: null, sender_kind: 'system', sender_name: 'مضمونة', kind: 'text',
      body: `شات استفسار «${opts.listingTitle}» 🟢\n`
        + `العميل · ${ownerLine}\n`
        + `🔒 الأسماء وأرقام التليفونات مخفية لحد ما يتم الاتفاق بحضور مضمونة.\n`
        + `فريق مضمونة معاكم لحد ما تخلص المعاملة — معاملاتك مضمونة.`,
    })

    // إشعار لصاحب الإعلان + الفريق
    const notifyIds = [...new Set([...(opts.ownerProfileId ? [opts.ownerProfileId] : []), ...team])]
    await notify(admin, notifyIds, 'استفسار جديد 📩',
      `فيه عميل مستفسر عن «${opts.listingTitle}».`,
      `/chat/team?room=${roomId}`, { room_id: roomId, title: opts.listingTitle })

    return roomId
  } catch (e) {
    console.error('[ensureInquiryRoom] failed:', e)
    return null
  }
}

// ============================================================================
// 🔒 ألقاب رومات الاستفسار — الاسم الحقيقي مايظهرش لغير فريق مضمونة لحد
//    ما يتم الاتفاق (محمد، ٢٧ أغسطس ٢٠٢٦). بيتستخدم في الفرونت وفي أي
//    مكان بيكتب رسالة في روم عليه masked_identities.
// ============================================================================
export const ALIAS_CUSTOMER = 'العميل'
export const ALIAS_OWNER = 'صاحب الإعلان'
export const ALIAS_TEAM = 'فريق مضمونة'

/** اللقب المناسب حسب دور المتكلم في الروم */
export function aliasFor(role: 'customer' | 'owner' | 'team' | 'system'): string {
  if (role === 'owner') return ALIAS_OWNER
  if (role === 'team') return ALIAS_TEAM
  if (role === 'system') return 'مضمونة'
  return ALIAS_CUSTOMER
}
