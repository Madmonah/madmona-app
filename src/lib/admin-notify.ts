import { createClient } from '@supabase/supabase-js'
import { adminPhones } from './marid-admin'

// إشعار بوش لكل أدمن لما المارد يرد على عميل (على أي قناة).
// الأدمن = role='admin' أو رقمه في ADMIN_PHONES. best-effort تمامًا — مايوقفش أي رد.
// الإرسال الفعلي بيحصل عبر كرون /api/push/process-queue.
// ملاحظة: تريجر notification_queue_dedupe بيجمّع نفس العنوان لنفس الشخص خلال ساعة،
// فالعنوان بقى لكل عميل (بالاسم/الرقم) عشان كل محادثة تنبّه، ونفس العميل الكتير مايغرقش الأدمن.
export async function notifyAdminsMaridReply(opts: {
  customerName?: string | null
  customerPhone?: string | null
  preview: string
  channel: 'chat' | 'whatsapp'
}): Promise<void> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // كل صيغ أرقام الأدمن المخزّنة المحتملة: +20xxxxxxxxxx · 20xxxxxxxxxx · 0xxxxxxxxxx
    const variants = new Set<string>()
    for (const p of adminPhones()) {
      const ten = p.slice(-10)
      variants.add('20' + ten); variants.add('+20' + ten); variants.add('0' + ten)
    }

    const ids = new Set<string>()
    const { data: byRole } = await admin.from('profiles').select('id').eq('role', 'admin')
    for (const r of (byRole || []) as Array<{ id: string }>) ids.add(r.id)
    const { data: byPhone } = await admin.from('profiles').select('id').in('phone', [...variants])
    for (const r of (byPhone || []) as Array<{ id: string }>) ids.add(r.id)
    if (ids.size === 0) return

    const custDigits = (opts.customerPhone || '').replace(/\D/g, '')
    const who = (opts.customerName || '').trim() || (custDigits ? '0' + custDigits.slice(-10) : 'عميل')
    const channelLabel = opts.channel === 'whatsapp' ? 'واتساب' : 'شات الموقع'
    const preview = (opts.preview || '').replace(/\s+/g, ' ').trim().slice(0, 80)

    const rows = [...ids].map((rid) => ({
      recipient_id: rid,
      type: 'marid_admin_reply',
      title: `🧞 المارد رد على ${who}`,
      body: `${preview || 'رد جديد'} · ${channelLabel}`,
      url: '/admin/marid-monitor',
      data: { icon: '/marid-icon-192.png', channel: opts.channel },
    }))
    await admin.from('notification_queue').insert(rows as never)
  } catch {
    /* best-effort — مايوقفش الرد */
  }
}

// 🔔 (١٢ أغسطس ٢٠٢٦) إشعار بوش لكل أدمن لما رسالة واردة جديدة توصل لمحادثة
// موقوفة (paused/blocked). من غيره المحادثة الموقوفة «ثقب أسود»: العميل بيبعت
// والمارد ساكت ومحدش واخد باله — زي ما حصل مع مورد ضاحي (٧–١١ أغسطس): ٤ أيام
// رسايل ومنتجات من غير رد ولا تنبيه، واتكشفت بالصدفة بعدها بيوم.
// best-effort تمامًا — مايوقفش المعالجة. (الحدّ الزمني بيتفحص عند النداء.)
export async function notifyAdminsPausedInbound(opts: {
  customerName?: string | null
  customerPhone?: string | null
  status: string
  preview: string
}): Promise<void> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const variants = new Set<string>()
    for (const p of adminPhones()) {
      const ten = p.slice(-10)
      variants.add('20' + ten); variants.add('+20' + ten); variants.add('0' + ten)
    }

    const ids = new Set<string>()
    const { data: byRole } = await admin.from('profiles').select('id').eq('role', 'admin')
    for (const r of (byRole || []) as Array<{ id: string }>) ids.add(r.id)
    const { data: byPhone } = await admin.from('profiles').select('id').in('phone', [...variants])
    for (const r of (byPhone || []) as Array<{ id: string }>) ids.add(r.id)
    if (ids.size === 0) return

    const custDigits = (opts.customerPhone || '').replace(/\D/g, '')
    const who = (opts.customerName || '').trim() || (custDigits ? '0' + custDigits.slice(-10) : 'عميل')
    const preview = (opts.preview || '').replace(/\s+/g, ' ').trim().slice(0, 80)

    const rows = [...ids].map((rid) => ({
      recipient_id: rid,
      type: 'wa_paused_inbound',
      title: `⏸️ ${who} بيبعت ومحادثته موقوفة`,
      body: `${preview || 'رسالة جديدة'} · الحالة: ${opts.status}`,
      url: '/admin/wa-review',
      data: { icon: '/marid-icon-192.png', channel: 'whatsapp', status: opts.status },
    }))
    await admin.from('notification_queue').insert(rows as never)
  } catch {
    /* best-effort */
  }
}
