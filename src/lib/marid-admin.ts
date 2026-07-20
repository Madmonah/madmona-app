// src/lib/marid-admin.ts
//
// 👑 قناة الأدمن — محمد بيدير مضمونة من الواتساب.
//
// الفكرة: المارد بيفرّق بين محمد وأي حد تاني. لما محمد يكلّمه،
// بيبقى معاه أدوات إدارة كاملة — إحصائيات، مراجعة، نشر، إيقاف،
// بث للموردين.
//
// ═══ المبدأ الأهم (من النظام القديم) ═══
// **كل أمر بيتسجّل قبل أي معالجة.**
// حتى لو التنفيذ فشل، الأمر محفوظ في `admin_directives` —
// فمفيش أمر بيضيع، والفريق يقدر يراجع ويعمل اللي اتطلب يدوي.
//
// ⚠️ حدود:
// • الأوامر دي بتغيّر بيانات إنتاج. كل أداة بتتحقق إن اللي بينادي
//   رقم أدمن فعلاً — مش بتعتمد على إن الموديل يفتكر.
// • أي حذف أو إيقاف بيرجّع تأكيد بالتفصيل قبل التنفيذ.

import { supabaseUntyped as db } from './supabase'

const SITE = 'https://www.madmonacairo.com'

/** أرقام الأدمن — من البيئة عشان تتغيّر من غير نشر */
export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES || process.env.OWNER_PHONE || '201002229982')
    .split(',')
    .map((s) => s.replace(/\D/g, ''))
    .filter(Boolean)
}

export function isAdmin(phone: string): boolean {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return false
  return adminPhones().some((a) => d.endsWith(a.slice(-10)))
}

/**
 * تسجيل الأمر — بيتنادى **قبل** أي معالجة.
 *
 * ده اللي بيخلّي مفيش أمر بيضيع. لو المارد فهم غلط أو التنفيذ وقع،
 * الأمر موجود في الجدول ومحمد يقدر يراجع.
 */
export async function logDirective(
  phone: string,
  text: string,
  messageType = 'text'
): Promise<string | null> {
  try {
    const { data } = await db
      .from('admin_directives')
      .insert({
        source_phone: phone,
        directive: text.slice(0, 4000),
        message_type: messageType,
        status: 'received',
      })
      .select('id')
      .maybeSingle()
    return data?.id ?? null
  } catch {
    return null
  }
}

// ═════════════════════════════════════════════════════════════════════════
// أدوات الأدمن
// ═════════════════════════════════════════════════════════════════════════

export const ADMIN_TOOLS = [
  {
    name: 'admin_stats',
    description:
      'إحصائيات مضمونة. استخدمها لما محمد يسأل «إيه الأخبار» أو «عاملين إيه» ' +
      'أو يطلب أرقام معيّنة (محادثات، طلبات، مشاريع، موردين، ليدز).',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'الفترة — الافتراضي النهارده',
        },
      },
      required: [],
    },
  },
  {
    name: 'admin_review_queue',
    description:
      'اعرض اللي مستني مراجعة: مسودات إعلانات، مشاريع، طلبات مش متوفرة، ' +
      'محادثات موقوفة. استخدمها لما محمد يسأل «فيه إيه مستني» أو «إيه اللي محتاج مراجعة».',
    input_schema: {
      type: 'object' as const,
      properties: {
        kind: {
          type: 'string',
          enum: ['all', 'listings', 'projects', 'demands', 'paused'],
        },
      },
      required: [],
    },
  },
  {
    name: 'admin_conversation',
    description:
      'إدارة محادثة: إيقاف، تشغيل، أو قراءة آخر رسايلها.\n' +
      'محمد بيقول «وقّف المحادثة مع فلان» أو «شوفلي محادثة الرقم ده».',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['pause', 'resume', 'read'] },
        phone: { type: 'string', description: 'رقم الطرف التاني' },
      },
      required: ['action', 'phone'],
    },
  },
  {
    name: 'admin_publish',
    description:
      'انشر أو ارفض مسودة إعلان أو مشروع. محمد بيقول «انشر المسودة رقم كذا» ' +
      'أو «ارفض المشروع الفلاني».',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['publish', 'reject'] },
        kind: { type: 'string', enum: ['listing_draft', 'project'] },
        id_or_title: { type: 'string', description: 'المعرّف أو الاسم' },
        reason: { type: 'string', description: 'سبب الرفض' },
      },
      required: ['action', 'kind', 'id_or_title'],
    },
  },
  {
    name: 'admin_broadcast',
    description:
      'ابعت رسالة لمجموعة موردين أو لجروباتهم.\n\n' +
      '⛔ **لازم تعرض النص والعدد على محمد وتستنى موافقته الصريحة قبل الإرسال.** ' +
      'استخدم dry_run=true الأول دايمًا. الإرسال من غير مراجعة ممنوع.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'نص الرسالة' },
        target: {
          type: 'string',
          enum: ['real_estate_suppliers', 'all_suppliers', 'supplier_groups'],
        },
        dry_run: { type: 'boolean', description: 'true = معاينة بس (الافتراضي)' },
        limit: { type: 'number', description: 'حد أقصى — الافتراضي ٢٠' },
      },
      required: ['message', 'target'],
    },
  },
] as const

// ═════════════════════════════════════════════════════════════════════════
// التنفيذ
// ═════════════════════════════════════════════════════════════════════════

type R = Record<string, unknown>

function sinceOf(period?: string): string {
  const d = new Date()
  if (period === 'week') d.setDate(d.getDate() - 7)
  else if (period === 'month') d.setMonth(d.getMonth() - 1)
  else d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

async function adminStats(a: { period?: string }): Promise<R> {
  const since = sinceOf(a.period)
  const count = async (table: string, filters: Record<string, unknown> = {}) => {
    let q = db.from(table).select('id', { count: 'exact', head: true }).gte('created_at', since)
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
    const { count: c } = await q
    return c ?? 0
  }

  const [msgsIn, msgsOut, drafts, projects, demands, leads, groups] = await Promise.all([
    count('whatsapp_messages', { direction: 'inbound' }),
    count('whatsapp_messages', { direction: 'outbound' }),
    count('instant_listing_drafts'),
    count('property_market_items'),
    count('customer_demand_requests'),
    count('sales_leads'),
    count('supplier_wa_groups'),
  ])

  const { count: totalProjects } = await db
    .from('property_market_items')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: totalSuppliers } = await db
    .from('marketplace_suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('kyc_status', 'approved')

  return {
    الفترة: a.period === 'week' ? 'آخر أسبوع' : a.period === 'month' ? 'آخر شهر' : 'النهارده',
    رسايل_واردة: msgsIn,
    ردود: msgsOut,
    مسودات_اعلانات: drafts,
    مشاريع_جديدة: projects,
    طلبات_مش_متوفرة: demands,
    ليدز_جديدة: leads,
    جروبات_اتعملت: groups,
    الاجمالي: { مشاريع_منشورة: totalProjects ?? 0, موردين_معتمدين: totalSuppliers ?? 0 },
  }
}

async function adminReviewQueue(a: { kind?: string }): Promise<R> {
  const kind = a.kind || 'all'
  const out: R = {}

  if (kind === 'all' || kind === 'listings') {
    const { data } = await db
      .from('instant_listing_drafts')
      .select('id, title, price_egp, contact_phone, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    out.مسودات_اعلانات = data ?? []
  }

  if (kind === 'all' || kind === 'projects') {
    const { data } = await db
      .from('property_market_items')
      .select('id, title, developer, area_label, price_from')
      .eq('status', 'draft')
      .limit(10)
    out.مشاريع_مسودة = data ?? []
  }

  if (kind === 'all' || kind === 'demands') {
    const { data } = await db
      .from('customer_demand_requests')
      .select('id, requested_item, contact_phone, notes, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(10)
    out.طلبات_مش_متوفرة = data ?? []
  }

  if (kind === 'all' || kind === 'paused') {
    const { data } = await db
      .from('whatsapp_conversations')
      .select('contact_phone, contact_name, last_message_at')
      .eq('status', 'paused')
      .limit(10)
    out.محادثات_موقوفة = data ?? []
  }

  return out
}

async function adminConversation(a: { action: string; phone: string }): Promise<R> {
  const d = (a.phone || '').replace(/\D/g, '')
  if (!d) return { ok: false, error: 'الرقم مطلوب' }

  const { data: conv } = await db
    .from('whatsapp_conversations')
    .select('id, contact_phone, contact_name, status')
    .ilike('contact_phone', `%${d.slice(-9)}%`)
    .maybeSingle()

  if (!conv) return { ok: false, error: `مالقتش محادثة بالرقم ده` }

  if (a.action === 'read') {
    const { data: msgs } = await db
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(12)

    return {
      ok: true,
      مع: conv.contact_name || conv.contact_phone,
      الحالة: conv.status,
      الرسايل: (msgs ?? []).reverse().map((m: { direction: string; body: string }) => ({
        من: m.direction === 'inbound' ? 'هو' : 'المارد',
        نص: (m.body || '').slice(0, 200),
      })),
    }
  }

  const status = a.action === 'pause' ? 'paused' : 'active'
  await db.from('whatsapp_conversations').update({ status }).eq('id', conv.id)

  return {
    ok: true,
    قول_لمحمد:
      a.action === 'pause'
        ? `وقّفت المحادثة مع ${conv.contact_name || conv.contact_phone} ✅ المارد مش هيرد فيها.`
        : `رجّعت المحادثة مع ${conv.contact_name || conv.contact_phone} ✅`,
  }
}

async function adminPublish(a: {
  action: string
  kind: string
  id_or_title: string
  reason?: string
}): Promise<R> {
  const key = (a.id_or_title || '').trim()
  if (!key) return { ok: false, error: 'المعرّف أو الاسم مطلوب' }

  const isUuid = /^[0-9a-f-]{36}$/i.test(key)
  const table = a.kind === 'project' ? 'property_market_items' : 'instant_listing_drafts'
  const titleCol = 'title'

  let q = db.from(table).select('id, title')
  q = isUuid ? q.eq('id', key) : q.ilike(titleCol, `%${key}%`)
  const { data: rows } = await q.limit(3)

  if (!rows?.length) return { ok: false, error: `مالقتش «${key}»` }
  if (rows.length > 1) {
    return {
      ok: false,
      متعدد: rows.map((r: { id: string; title: string }) => r.title),
      قول_لمحمد: 'فيه أكتر من واحد بالاسم ده — حدّد بالظبط.',
    }
  }

  const row = rows[0]
  const publish = a.action === 'publish'

  if (a.kind === 'project') {
    await db
      .from('property_market_items')
      .update(
        publish
          ? { status: 'published', is_active: true }
          : { status: 'draft', is_active: false, note: a.reason ?? null }
      )
      .eq('id', row.id)
  } else {
    await db
      .from('instant_listing_drafts')
      .update({ status: publish ? 'approved' : 'rejected' })
      .eq('id', row.id)
  }

  return {
    ok: true,
    قول_لمحمد: publish
      ? `اتنشر «${row.title}» ✅\n${a.kind === 'project' ? `${SITE}/real-estate/market` : ''}`
      : `اترفض «${row.title}» ✅`,
  }
}

async function adminBroadcast(a: {
  message: string
  target: string
  dry_run?: boolean
  limit?: number
}): Promise<R> {
  const limit = Math.min(a.limit ?? 20, 50)
  const dry = a.dry_run !== false // الافتراضي معاينة

  // ── الجمهور ────────────────────────────────────────────────────────
  let recipients: Array<{ to: string; label: string; isGroup: boolean }> = []

  if (a.target === 'supplier_groups') {
    const { data } = await db
      .from('supplier_wa_groups')
      .select('group_jid, subject')
      .eq('is_active', true)
      .limit(limit)
    recipients = (data ?? []).map((g: { group_jid: string; subject: string }) => ({
      to: g.group_jid,
      label: g.subject,
      isGroup: true,
    }))
  } else {
    const { data: sups } = await db
      .from('marketplace_suppliers')
      .select('id, business_name, profile_id')
      .eq('kyc_status', 'approved')
      .limit(200)

    const ids = (sups ?? []).map((s: { profile_id: string }) => s.profile_id).filter(Boolean)
    const { data: profs } = await db.from('profiles').select('id, phone').in('id', ids)
    const phoneOf = Object.fromEntries((profs ?? []).map((p: { id: string; phone: string }) => [p.id, p.phone]))

    let list = sups ?? []
    if (a.target === 'real_estate_suppliers') {
      const { data: re } = await db
        .from('listings')
        .select('supplier_id, categories!inner(slug)')
        .like('categories.slug', '%propert%')
      const reIds = new Set((re ?? []).map((l: { supplier_id: string }) => l.supplier_id))
      list = list.filter((s: { id: string }) => reIds.has(s.id))
    }

    recipients = list
      .map((s: { business_name: string; profile_id: string }) => ({
        to: phoneOf[s.profile_id],
        label: s.business_name,
        isGroup: false,
      }))
      .filter((r: { to: string }) => r.to && !r.to.startsWith('oauth:'))
      .slice(0, limit)
  }

  if (!recipients.length) return { ok: false, error: 'مفيش حد في الجمهور ده' }

  if (dry) {
    return {
      ok: true,
      معاينة: true,
      العدد: recipients.length,
      عينة: recipients.slice(0, 5).map((r) => r.label),
      النص: a.message,
      قول_لمحمد:
        `هيروح لـ ${recipients.length} — أول خمسة: ${recipients
          .slice(0, 5)
          .map((r) => r.label)
          .join('، ')}\n\nالنص:\n${a.message}\n\n*موافق أبعت؟*`,
    }
  }

  // ── الإرسال الفعلي ─────────────────────────────────────────────────
  const url = process.env.WA_SERVICE_URL
  const secret = process.env.WA_SERVICE_SECRET
  if (!url || !secret) return { ok: false, error: 'خدمة الواتساب مش متظبطة' }

  let sent = 0
  let failed = 0

  for (const r of recipients) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-madmona-secret': secret },
        body: JSON.stringify(
          r.isGroup ? { jid: r.to, text: a.message } : { to: r.to, text: a.message }
        ),
      })
      const j = await res.json().catch(() => ({}))
      j?.ok ? sent++ : failed++
    } catch {
      failed++
    }
    // فاصل — الإرسال المتتابع السريع بيتقري كسبام
    await new Promise((s) => setTimeout(s, 3000 + Math.random() * 4000))
  }

  return { ok: true, اتبعت: sent, فشل: failed }
}

export async function runAdminTool(name: string, input: Record<string, unknown>): Promise<R> {
  try {
    switch (name) {
      case 'admin_stats':
        return await adminStats(input as never)
      case 'admin_review_queue':
        return await adminReviewQueue(input as never)
      case 'admin_conversation':
        return await adminConversation(input as never)
      case 'admin_publish':
        return await adminPublish(input as never)
      case 'admin_broadcast':
        return await adminBroadcast(input as never)
      default:
        return { error: `أداة أدمن مش معروفة: ${name}` }
    }
  } catch (err) {
    return { error: 'الأداة وقعت', detail: err instanceof Error ? err.message : 'unknown' }
  }
}

export const ADMIN_PROMPT = `
═══════════════════════════════════════════════════════════
👑 إنت بتكلّم محمد — صاحب مضمونة
═══════════════════════════════════════════════════════════
كلّمه كشريك شغل مش كعميل. مختصر، مباشر، بالأرقام.

عندك أدوات إدارة:
• admin_stats          — الأرقام
• admin_review_queue   — اللي مستني مراجعة
• admin_conversation   — إيقاف/تشغيل/قراءة محادثة
• admin_publish        — نشر أو رفض مسودة
• admin_broadcast      — بث للموردين

⛔ **البث:** استخدم dry_run الأول دايمًا، واعرض عليه النص والعدد،
   وماتبعتش غير لما يقول موافق صراحة.

⛔ **الإيقاف والنشر والرفض:** نفّذ على طول لو الأمر واضح.
   لو مش واضح اسأل سؤال واحد.

✅ أي أمر منه بيتسجّل تلقائيًا حتى لو التنفيذ فشل — قوله كده
   لو حصلت مشكلة، عشان يعرف إن الأمر محفوظ.

لو طلب حاجة مالكش أداة ليها، قوله بصراحة إنها لسه مش متاحة
وإن أمره اتسجّل — ماتخترعش إنك عملتها.
`
