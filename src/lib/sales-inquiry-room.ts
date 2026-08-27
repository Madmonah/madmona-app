// src/lib/sales-inquiry-room.ts
// ============================================================================
// 🏠🚗 (٢٧ أغسطس ٢٠٢٦) محمد: «الاستفسارات سواء للعقارات اللي في بورصة مضمونة
//      أو اللي في قسم البيع في العقارات أو في قسم البيع في السيارات تودّي على
//      شات مضمونة في شات جديد يتحط فيه موظفين مضمونة كلهم ما عدا سامية
//      (مبقتش في الفريق) ومحمد (أوفيس بوي)».
//
// قبل كده: استفسار العقارات/العربيات كان بيروح على **شات مباشر مع محمد ناصف
// لوحده** — يعني لو محمد مش فاضي الاستفسار بيقف، وباقي الفريق مش شايفه أصلًا.
//
// دلوقتي: بيتكتب في روم جماعي واحد اسمه «استفسارات البيع — عقارات وسيارات»
// كل موظفي مضمونة أعضاء فيه، مع إشعار لكلهم.
//
// ⚠️ العميل **مش** بينضم للروم ده — الروم ده داخلي للفريق بس. العميل بيفضل
//    في الشات المباشر بتاعه؛ الروم الجماعي فيه لينك يوصّل الموظف للشات ده.
//    (لو ضفنا العميل، هيشوف استفسارات كل العملاء التانيين.)
// ============================================================================

/** الروم الجماعي الثابت — اتعمل في الداتابيز ٢٧ أغسطس ٢٠٢٦ */
export const SALES_INQUIRY_ROOM_ID = '76a7fdbd-fc75-4e2e-8d48-fdf6b285a8f2'

type AdminClient = {
  from: (t: string) => {
    insert: (v: unknown) => Promise<{ error: unknown }>
    select: (c: string) => { eq: (a: string, b: string) => Promise<{ data: unknown }> }
  }
}

export type SalesInquiryInput = {
  /** «عقار» · «عربية» · «مشروع» */
  kind: string
  /** عنوان الإعلان أو اسم المشروع */
  title: string
  /** اسم المستفسر (لو معروف) */
  inquirerName?: string | null
  /** تليفون المستفسر (لو معروف) */
  inquirerPhone?: string | null
  /** اسم صاحب الإعلان/المطوّر */
  ownerName?: string | null
  /** تليفون صاحب الإعلان */
  ownerPhone?: string | null
  /** لينك الشات المباشر مع العميل، أو لينك الإعلان */
  link?: string | null
}

/**
 * بيكتب الاستفسار في روم الفريق وبيبعت إشعار لكل الأعضاء.
 * best-effort: أي فشل هنا **مايوقّفش** الاستفسار نفسه.
 */
export async function postSalesInquiry(admin: AdminClient, i: SalesInquiryInput): Promise<void> {
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
      i.link ? `الرد من هنا: ${i.link}` : null,
    ].filter(Boolean)

    await admin.from('chat_messages').insert({
      room_id: SALES_INQUIRY_ROOM_ID,
      sender_id: null,
      sender_kind: 'system',
      sender_name: 'مضمونة',
      kind: 'text',
      body: lines.join('\n'),
    })

    // إشعار لكل عضو في الروم
    const { data: members } = await admin
      .from('chat_room_members')
      .select('profile_id')
      .eq('room_id', SALES_INQUIRY_ROOM_ID)

    const ids = ((members || []) as { profile_id: string }[]).map((m) => m.profile_id)
    if (ids.length) {
      await admin.from('notification_queue').insert(
        ids.map((rid) => ({
          recipient_id: rid,
          type: 'sales_inquiry',
          title: `استفسار جديد 📩 (${i.kind})`,
          body: `${i.inquirerName || 'عميل'} مستفسر عن «${i.title}».`,
          url: i.link || `/chat/team?room=${SALES_INQUIRY_ROOM_ID}`,
          data: { room_id: SALES_INQUIRY_ROOM_ID, kind: i.kind, title: i.title },
        })),
      )
    }
  } catch (e) {
    console.error('[postSalesInquiry] failed:', e)
  }
}
