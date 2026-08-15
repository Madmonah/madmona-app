// src/app/api/cron/wa-queue-send/route.ts
// بيشتغل كل دقيقة — بياخد الرسايل المستحقة ويبعتها عن طريق المارد.
//
// أمان: بيبعت رسالة واحدة في كل تشغيلة كحد أقصى، وبيحترم السقف اليومي،
// وبيقف فورًا لو المارد مش متصل.
//
// 🚦 (١٤ أغسطس ٢٠٢٦ — محمد) البروتوكول المعتمد للإرسال الجماعي بقى مطبَّق
//    هنا كمان: **مايبعتش رسالة جديدة قبل ما اللي قبلها تتأكد إنها وصلت**.
//    قبل كده الكرون ده كان بيعلّم `sent` على أساس رد الـAPI بس — يعني رقم
//    ميت (بيقبل الرسالة ويرميها في الفراغ) كان يفضل يبعت ٢٥ رسالة/يوم
//    وإحنا فاكرينه شغّال. البوابة نفسها في `@/lib/wa-ack-gate`.
//
//    مفاتيح `whatsapp_config`:
//      queue_send_enabled   : '0' يوقفه · أي حاجة تانية (أو غياب المفتاح) = شغّال
//      queue_send_halt_note : سبب آخر وقفة (بيتكتب أوتوماتيك)

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendText, upsertConversation } from '@/lib/whatsapp'
import { ackGate } from '@/lib/wa-ack-gate'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_PER_DAY = Number(process.env.WA_MAX_PER_DAY || 25)
const MAX_PER_RUN = Number(process.env.WA_MAX_PER_RUN || 1)
// نفس مهلة wa-paced-send — ٩ دقايق قبل ما نعتبر الرسالة متأخرة
const ACK_WAIT_MS = Number(process.env.WA_QUEUE_ACK_WAIT_MS || 9 * 60 * 1000)
// ⏳ (١٤ أغسطس ٢٠٢٦ — محمد) «لو العميل أو المورد قافل تليفونه لازم يستنى
//    ٣ دقايق قبل إعادة الإرسال بعد التحقق من الحالة».
//    التحقق = الصف لسه `sent` ومفيهوش `delivered_at` ولا `read_at`.
const RETRY_AFTER_MS = Number(process.env.WA_RETRY_AFTER_MS || 3 * 60 * 1000)
const MAX_ATTEMPTS = Number(process.env.WA_MAX_ATTEMPTS || 3)
// 🔀 (١٥ أغسطس ٢٠٢٦) الجلسة بقت تتقري من `whatsapp_config.queue_send_session`
//    الأول، وبعدين متغيّر البيئة، وبعدين الافتراضي. السبب: تغيير الرقم
//    اللي بنبعت منه كان محتاج ديبلوي على Vercel — دلوقتي سطر SQL واحد،
//    زي `paced_send_session` بالظبط.
//
//    ليه ده مهم: اختبار ١٥ أغسطس فشل بـ«Session is not connected» من
//    `madmona-982`، وطلع إن `madmona-337` (+201026222337) بيسلّم ٩٥٪
//    مقابل ١٥٪ للـ982. من غير ده كنا هنستنى ديبلوي عشان نوجّه الإرسال.
const QUEUE_SESSION_FALLBACK = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'

async function resolveSession(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'queue_send_session')
      .maybeSingle()
    const v = (data as { value?: string } | null)?.value?.trim()
    if (v) return v
  } catch { /* لو القراية فشلت بنكمّل بالافتراضي */ }
  return QUEUE_SESSION_FALLBACK
}

async function setConfig(key: string, value: string) {
  await supabaseAdmin.from('whatsapp_config').upsert({ key, value } as never, { onConflict: 'key' })
}

async function haltQueue(reason: string) {
  await setConfig('queue_send_enabled', '0')
  await setConfig('queue_send_halt_note', `${new Date().toISOString()} — ${reason}`)
}

interface QueueRow {
  id: string
  recipient_phone: string
  recipient_name: string | null
  message_content: string
  attempts: number | null
  /** 15 Aug 2026: per-message sender. null => whatsapp_config.queue_send_session */
  session: string | null
}

export async function GET(request: NextRequest) {
  // Vercel Cron بيبعت الهيدر ده — أو سر يدوي
  const auth = request.headers.get('authorization')
  const secret = request.headers.get('x-madmona-secret')
  // 🔒 (١٢ أغسطس ٢٠٢٦) فحص وجود السر الأول — لو CRON_SECRET مش متظبط،
  //    `Bearer undefined` كان بيعدّي. (wa-sync كان بيعملها صح — دي كانت ناقصة هنا)
  const isVercelCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // ── ٠) مفتاح الإيقاف — بيتكتب أوتوماتيك لو الرقم بطّل يسلّم ─────────
  //    غياب المفتاح = شغّال (عشان نشرة جديدة ماتوقفش الطابور من غير قصد)
  {
    const { data: cfgRow } = await supabaseAdmin
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'queue_send_enabled')
      .maybeSingle()
    if ((cfgRow as { value?: string } | null)?.value === '0') {
      return NextResponse.json({ ok: true, skipped: 'الطابور موقوف (queue_send_enabled=0)' })
    }
  }

  // ── ١) المارد متصل؟ لو لأ منبعتش خالص ────────────────────────────────
  //
  // 🚨 (٢ أغسطس ٢٠٢٦) كان بيسأل `WA_SERVICE_URL/health` — وده جسر Baileys
  //    اللي اتشال. كان بيرجّع `connected:false` دايمًا، فالكرون كان بيقف
  //    عند البوابة دي كل دقيقة و**الطابور مقفول بالكامل** من غير أي أثر
  //    غير كلمة «المارد مش متصل» في رد مالوش قارئ.
  //
  //    دلوقتي بيسأل OpenWA: طالما فيه جلسة واحدة `ready`، الطابور يمشي.
  try {
    const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
    const key = process.env.OPENWA_API_KEY || ''
    if (!base || !key) {
      return NextResponse.json({ ok: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص' })
    }
    const h = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const list = (await h.json()) as Array<{ status?: string }>
    const anyReady = Array.isArray(list) && list.some((s) => s?.status === 'ready')
    if (!anyReady) {
      return NextResponse.json({ ok: true, skipped: 'مفيش رقم متصل على OpenWA', sent: 0 })
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: 'فشل فحص صحة المارد', sent: 0 })
  }

  // 📨 (١٤ أغسطس ٢٠٢٦ — محمد: «افتح حد الإرسال بس رسالة رسالة») الحملات
  //    المعاملاتية مالهاش علاقة بالسقف التسويقي. السقف ده اتحط عشان
  //    مانغرقش الناس بدعاية — مش عشان نمنع مورد يعرف إن عنده حجز بـ٢٥ ألف.
  //
  //    ⚠️ «افتح الحد» ≠ «افتح الحنفية». الرسايل دي بتعدّي من **نفس** بوابة
  //    التأكيد تحت (`ackGate`) و**نفس** MAX_PER_RUN=1. يعني لسه رسالة
  //    واحدة في المرة، وماحدش بياخد رسالة قبل ما اللي قبلها توصل فعلًا.
  //    اللي اتفتح هو السقف اليومي بس، مش الإيقاع.
  const TRANSACTIONAL_CAMPAIGNS = ['booking_alert']

  // ── ٢) السقف اليومي — للتسويق بس ─────────────────────────────────────
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const { data: todayRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id')
    .eq('status', 'sent')
    .gte('sent_at', dayStart.toISOString())
    .not('template_vars->>campaign_name', 'in', `(${TRANSACTIONAL_CAMPAIGNS.join(',')})`)

  const sentToday = (todayRaw ?? []).length
  // لو السقف اتوصل مانوقفش خالص — بنقفل التسويق ونسيب المعاملاتي يعدّي
  const marketingCapped = sentToday >= MAX_PER_DAY

  // ── ٣) الرسايل المستحقة ──────────────────────────────────────────────
  // ⚠️ (٦ أغسطس ٢٠٢٦) الحملات اللي ليها مُرسِل متخصص لازم تتستثنى هنا.
  //    `paced_20260806` بيديرها `/api/cron/wa-paced-send` بإيقاع 3 كل 3 دقايق
  //    وبوابة تأكيد تسليم. الكرون ده كان بيخطف صفوفها ويبعتها 1/دقيقة من 982 —
  //    يعني بيكسر الإيقاع والبوابة الاتنين، و15 رسالة فشلت كده لما 982 فصل.
  const PACED_CAMPAIGNS = ['paced_20260806']

  // ── ٣.٢) 🔁 إعادة إرسال اللي ماوصلش — قاعدة الـ٣ دقايق ───────────────
  //    الرقم المقفول بيقبل الرسالة من الـAPI (فبترجع ok) بس مابيجيلهاش
  //    إيصال. بنستنى ٣ دقايق، **نتحقق من الحالة** (لسه `sent` ومفيش
  //    `delivered_at` ولا `read_at`)، وساعتها بس نرجّعها للطابور.
  //
  //    السقف ٣ محاولات — بعد كده الرقم يتعلّم `failed` بدل ما نفضل
  //    نطبطب على تليفون مقفول للأبد.
  const retried: Array<{ id: string; attempts: number; action: string }> = []
  try {
    const staleCutoff = new Date(Date.now() - RETRY_AFTER_MS).toISOString()
    const { data: staleRaw } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select('id, attempts, recipient_phone')
      .eq('status', 'sent')
      .not('whatsapp_msg_id', 'is', null)
      .is('delivered_at', null)
      .is('read_at', null)
      .lte('sent_at', staleCutoff)
      // 🚨 لازم شبّاك زمني. من غير السطر ده الاستعلام بيلقط الـ٦٧ رسالة
      //    القديمة (٥–٨ أغسطس) اللي حالتها لسه `sent` من غير إيصال —
      //    وكان هيعيد إرسالها لـ٦٧ واحد دفعة واحدة. المحاولات الـ٣ كلها
      //    بتخلص في ٩ دقايق، فساعة شبّاك أكتر من كفاية.
      .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .not('template_vars->>campaign_name', 'in', `(${PACED_CAMPAIGNS.join(',')})`)
      .order('sent_at', { ascending: true })
      .limit(5)

    for (const row of (staleRaw ?? []) as Array<{ id: string; attempts: number | null }>) {
      const n = row.attempts ?? 0
      if (n >= MAX_ATTEMPTS) {
        await supabaseAdmin
          .from('whatsapp_campaign_messages')
          .update({
            status: 'failed',
            error_message: `ماوصلتش بعد ${MAX_ATTEMPTS} محاولات — الرقم غالبًا مقفول`,
          } as never)
          .eq('id', row.id)
          .eq('status', 'sent')
        retried.push({ id: row.id, attempts: n, action: 'failed' })
      } else {
        await supabaseAdmin
          .from('whatsapp_campaign_messages')
          .update({
            status: 'queued',
            scheduled_for: new Date().toISOString(),
            whatsapp_msg_id: null,
            sent_at: null,
            error_message: 'ماوصلتش خلال ٣ دقايق — إعادة إرسال',
          } as never)
          .eq('id', row.id)
          .eq('status', 'sent')
        retried.push({ id: row.id, attempts: n, action: 'requeued' })
      }
    }
  } catch { /* إعادة الإرسال مايوقفش الطابور */ }

  // ── ٣.٥) 🚦 بوابة تأكيد الوصول — البروتوكول المعتمد ──────────────────
  //    مايتبعتش رسالة جديدة قبل ما اللي قبلها يجيلها إيصال من OpenWA.
  //    بنقيس على نفس نطاق الكرون ده (كل الحملات ما عدا اللي ليها مُرسِل
  //    متخصص) وعلى جلسة الإرسال بتاعته لوحدها.
  const QUEUE_SESSION = await resolveSession()
  const gate = await ackGate({
    session: QUEUE_SESSION,
    ackWaitMs: ACK_WAIT_MS,
    excludeCampaigns: PACED_CAMPAIGNS,
    onHalt: haltQueue,
  })
  if (!gate.proceed) {
    return NextResponse.json({
      ok: !gate.halted,
      sent: 0,
      halted: gate.halted || undefined,
      skipped: gate.reason,
      waiting: gate.waiting,
      waited_sec: gate.waited_sec,
    }, gate.halted ? { status: 200 } : undefined)
  }

  // 🥇 المعاملاتي الأول دايمًا: حجز جديد مايستناش ورا طابور دعاية.
  //    بنجيبه لوحده، ولو مفيش نرجع للطابور العادي.
  const nowIso = new Date().toISOString()
  const COLS = 'id, recipient_phone, recipient_name, message_content, attempts, session'

  let { data: dueRaw, error: dueErr } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select(COLS)
    .eq('status', 'queued')
    .in('template_vars->>campaign_name', TRANSACTIONAL_CAMPAIGNS)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(MAX_PER_RUN)

  if (!dueErr && (dueRaw ?? []).length === 0) {
    if (marketingCapped) {
      return NextResponse.json({
        ok: true, sent: 0,
        skipped: 'السقف اليومي للتسويق اتوصل (المعاملاتي مفتوح ومفيش منه حاجة مستحقة)',
        sent_today: sentToday,
      })
    }
    ;({ data: dueRaw, error: dueErr } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select(COLS)
      .eq('status', 'queued')
      .not('template_vars->>campaign_name', 'in', `(${PACED_CAMPAIGNS.join(',')})`)
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(MAX_PER_RUN))
  }

  // 🧹 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) ريبر الرسايل العالقة:
  // القفل المتفائل بيقلب الصف لـ'sending' قبل الإرسال — لو الدالة اتقطعت
  // (timeout/crash) قبل ما تحدّث الحالة النهائية، الصف كان بيفضل 'sending'
  // للأبد: لا بيتبعت ولا بيتعاد ولا بيبان في استعلام المستحق. أي صف
  // 'sending' بقاله أكتر من ١٠ دقايق = تشغيلة ماتت في النص → نرجّعه
  // 'queued' فيتعاد في التشغيلة الجاية. (attempts اتزادت وقت القفل فمش
  // هيتكرر بلا حدود لو فيه فشل حقيقي متكرر.)
  try {
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'queued' } as never)
      .eq('status', 'sending')
      .lt('locked_at', stuckCutoff)
  } catch { /* الريبر مايوقفش الإرسال */ }

  // 🔎 (5 Aug 2026) ماتبلعش الخطأ — ده كان مخبي عطل الطابور المتجمد
  if (dueErr) {
    return NextResponse.json({ ok: false, error: 'due query failed', detail: dueErr.message })
  }

  const due = (dueRaw ?? []) as unknown as QueueRow[]
  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'مفيش رسايل مستحقة' })
  }

  const results: Array<{ id: string; phone: string; ok: boolean; error?: string }> = []

  for (const row of due) {
    // قفل متفائل — نحوّل الحالة قبل الإرسال عشان مانبعتش مرتين
    const { data: locked, error: lockErr } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'sending', attempts: (row.attempts ?? 0) + 1, locked_at: new Date().toISOString() } as never)
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id')

    // 🔎 (5 Aug 2026) لو القفل فشل بخطأ فعلي — سجّله في الرد بدل البلع
    if (lockErr) {
      results.push({ id: row.id, phone: row.recipient_phone, ok: false, error: 'lock: ' + lockErr.message })
      continue
    }
    if (!locked || locked.length === 0) continue // حد تاني خدها

    const conversationId = await upsertConversation({
      phone: row.recipient_phone,
      name: row.recipient_name ?? undefined,
      agentName: 'المارد',
    })

    const sent = await sendText({
      to: row.recipient_phone,
      body: row.message_content,
      conversationId: conversationId ?? undefined,
      agentName: 'المارد',
      aiGenerated: false,
      // 🔧 (5 Aug 2026) من غير session بيقع على جسر Baileys الميت ويرجع 404
      // (المصيدة المسجلة في الذاكرة) — لازم نحدد جلسة OpenWA صراحةً
      // (١٥ أغسطس) نفس الجلسة اللي البوابة قاستها — مش قراية تانية للـenv،
      // عشان مايحصلش إن البوابة تقيس رقم والإرسال يطلع من رقم تاني.
      // 📤 (١٥ أغسطس — محمد: «عايز أختار الرقم اللي هيبعت») الصف نفسه
      //    ممكن يحدد جلسته. فاضي = الجلسة العامة زي الأول.
      session: (row.session || '').trim() || QUEUE_SESSION,
    })

    await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({
        status: sent.ok ? 'sent' : 'failed',
        sent_at: sent.ok ? new Date().toISOString() : null,
        whatsapp_msg_id: sent.wa_message_id ?? null,
        error_message: sent.ok ? null : sent.error ?? 'unknown',
      } as never)
      .eq('id', row.id)

    results.push({ id: row.id, phone: row.recipient_phone, ok: sent.ok, error: sent.error })
  }

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    ...(retried.length > 0 ? { retried } : {}),
    session: QUEUE_SESSION,
    sent_today: sentToday + results.filter((r) => r.ok).length,
    daily_cap: MAX_PER_DAY,
    results,
  })
}
