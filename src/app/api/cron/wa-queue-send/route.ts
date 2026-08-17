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
import { getSafety } from '@/lib/wa-safety'

export const runtime = 'nodejs'
export const maxDuration = 30

// 🔀 (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم يبقى ديناميك») السقف اليومي بقى
//    بيتقري من `whatsapp_config.wa_max_per_day` عن طريق `getSafety()`
//    جوّه الهاندلر. الثابت ده اتشال — كان متغيّر بيئة، تغييره محتاج نشر.
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

// 🛣️ (١٦ أغسطس ٢٠٢٦ — محمد: «عايز كل رقم بمسار») الإيقاف بقى **لكل رقم
//    لوحده**. قبل كده رقم واحد ميّت كان بيقفل الطابور كله (`queue_send_enabled=0`)
//    — وده كان صح لما كان فيه مسار واحد، وبقى غلط دلوقتي: رقم فاصل
//    مايصحّش يمنع الأرقام الشغّالة.
function haltLane(session: string) {
  return async (reason: string) => {
    await setConfig(`queue_halt_${session}`, `${new Date().toISOString()} — ${reason}`)
  }
}

/** هل المسار ده متوقف يدويًا أو بعد عطل؟ */
async function laneHalted(session: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('value')
      .eq('key', `queue_halt_${session}`)
      .maybeSingle()
    return ((data as { value?: string } | null)?.value ?? '').trim() || null
  } catch { return null }
}

interface QueueRow {
  id: string
  recipient_phone: string
  recipient_name: string | null
  message_content: string
  attempts: number | null
  /** 15 Aug 2026: per-message sender. null => whatsapp_config.queue_send_session */
  session: string | null
  /** 15 Aug 2026: اسم الحملة — حارس «رد بس» بيستعمله في وضع `campaigns` */
  template_vars: { campaign_name?: string } | null
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

  // 🔀 (١٥ أغسطس ٢٠٢٦) حدود الأمان من `whatsapp_config` — السقف اليومي هنا،
  //    والفواصل وساعات الإرسال بيستعملهم `wa-queue.ts` وهو بيبني الطابور.
  //    لازم تتقري بدري: السقف اليومي لكل مسار بيستعملها.
  const safety = await getSafety()

  // الرقم الافتراضي — أي رسالة `session` بتاعها فاضي بتمشي عليه.
  const DEFAULT_SESSION = await resolveSession()

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

  // ── ٢) السقف اليومي — لكل رقم لوحده، وللتسويق بس ────────────────────
  //
  // 🐞 (١٦ أغسطس ٢٠٢٦) العدّاد كان بيعدّ `status='sent'` بس. والرسالة أول
  //    ما يجيلها إيصال بتتحوّل لـ`delivered` ثم `read` — يعني بتخرج من
  //    العدّة خلال ثواني. النتيجة: **السقف اليومي عمره ما اتفعّل**. اتأكدنا
  //    عمليًا: ٤٣ رسالة خرجت في ليلة والعدّاد شايف واحدة.
  //    الصح: عدّ أي صف ليه `sent_at` النهاردة، مهما كانت حالته دلوقتي.
  //
  // 🛣️ وكمان بقى **لكل جلسة لوحدها** — واتساب بيحظر الرقم، مش الحساب.
  //    فسقف ٢٠٠ معناه ٢٠٠ لكل رقم، مش ٢٠٠ متقسّمين على الأرقام.
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const { data: todayRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('session, template_vars')
    .gte('sent_at', dayStart.toISOString())
    .limit(5000)

  const sentTodayBy = new Map<string, number>()
  for (const r of ((todayRaw ?? []) as unknown as Array<{ session: string | null; template_vars: { campaign_name?: string } | null }>)) {
    const camp = (r.template_vars?.campaign_name ?? '').trim()
    if (TRANSACTIONAL_CAMPAIGNS.includes(camp)) continue
    const key = (r.session || '').trim() || DEFAULT_SESSION
    sentTodayBy.set(key, (sentTodayBy.get(key) ?? 0) + 1)
  }
  const sentToday = Array.from(sentTodayBy.values()).reduce((a, b) => a + b, 0)

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
  // 🐞 (١٧ أغسطس ٢٠٢٦ — محمد: «انت ليه ملتزمتش بأنك ماتبعتش غير لما
  //    الرسالة توصل؟! — أنا بتكلم على بروتوكول 1551»)
  //
  //    كان عنده حق: قاعدة الـ٣ دقايق هنا كانت **بتلغي حكم بوابة التأكيد**
  //    من غير قصد. الرسالة اللي ماوصلتش بترجع `queued` بعد ٣ دقايق —
  //    فعمرها ما بتكمّل الـ٩ دقايق اللي البوابة محتاجاها عشان تحكم إن
  //    الرقم ميت وتقفل المسار. النتيجة على 1551: الرقم بيقبل من الـAPI
  //    ويرمي في الفراغ، و٣ أرقام اتحرقوا ×٣ محاولات من غير ولا إيصال.
  //
  //    الصح: إعادة الإرسال للمسار **اللي بيسلّم** بس (موبايل العميل هو
  //    المقفول). المسار اللي مامعهوش أي تسليم حديث — رسايله تتساب `sent`
  //    زي ما هي عشان البوابة تكمّل مهلتها وتقفله رسميًا.
  const retried: Array<{ id: string; attempts: number; action: string }> = []
  try {
    const staleCutoff = new Date(Date.now() - RETRY_AFTER_MS).toISOString()
    const { data: staleRaw } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select('id, attempts, recipient_phone, session')
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

    // صحة كل مسار له رسايل متأخرة: سلّم أي حاجة في آخر ٦ ساعات؟
    const staleRows = (staleRaw ?? []) as unknown as Array<{ id: string; attempts: number | null; session: string | null }>
    const laneHealthy = new Map<string, boolean>()
    for (const s of Array.from(new Set(staleRows.map((r) => (r.session || '').trim() || DEFAULT_SESSION)))) {
      const { count } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .eq('session_id', s)
        .in('status', ['delivered', 'read'])
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      laneHealthy.set(s, (count ?? 0) > 0)
    }

    for (const row of staleRows) {
      const n = row.attempts ?? 0
      // ⛔ المسار مش بيسلّم؟ ماتلمسش الصف — سيبه للبوابة تحكم على المسار
      if (!laneHealthy.get((row.session || '').trim() || DEFAULT_SESSION)) {
        retried.push({ id: row.id, attempts: n, action: 'left_for_gate' })
        continue
      }
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

  // ── ٣.٥) 🛣️ مسار لكل رقم ────────────────────────────────────────────
  //
  // (١٦ أغسطس ٢٠٢٦ — محمد: «عايز كل رقم بمسار»)
  //
  // قبل كده الكرون كان **مسار واحد**: يقيس بوابة التأكيد لرقم واحد،
  // ياخد رسالة واحدة مستحقة أيًا كان رقمها، ويبعتها. النتيجة إن حملتين
  // على رقمين مختلفين بيتنافسوا على نفس الدور — الاتنين بيبطّئوا للنص،
  // ورقم واقف بيوقّف اللي شغّال.
  //
  // دلوقتي: بنجيب المستحق كله، نقسّمه على الأرقام، وكل رقم بياخد بوابته
  // وسقفه ورسالته لوحده في نفس التشغيلة. رقمين = ضعف السرعة، ورقم واقف
  // مايأثرش على غيره.
  const FETCH = 300
  const nowIso = new Date().toISOString()
  const COLS = 'id, recipient_phone, recipient_name, message_content, attempts, session, template_vars'

  // 🥇 المعاملاتي الأول دايمًا: حجز جديد مايستناش ورا طابور دعاية.
  const { data: txRaw, error: txErr } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select(COLS)
    .eq('status', 'queued')
    .in('template_vars->>campaign_name', TRANSACTIONAL_CAMPAIGNS)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(FETCH)

  // 🐞 (١٧ أغسطس ٢٠٢٦ — محمد: «بحاول أبعت من رقم 1551 بس مش بيبعت»)
  //
  //    الجلب هنا كان عالمي: أقدم FETCH رسالة مستحقة أيًا كان رقمها. لما
  //    حملة كبيرة يتراكملها مستحق أكتر من FETCH على رقم واحد (cloud_reel:
  //    ٤٩٨ مستحقة على 337)، النافذة كلها بتتملي منه وأي حملة أحدث على
  //    رقم تاني **مابتظهرش خالص** — مسار 1551 كان جاهز و«دعوة مصانع»
  //    مستحقة من ساعة، وولا رسالة اتبعتت.
  //
  //    الحل: نجيب الأول قايمة الأرقام اللي ليها مستحق، وبعدين نجيب رسايل
  //    كل رقم **لوحده**. طول طابور رقم مابقاش بيحجب رقم تاني.
  const MK_FILTER = `(${[...PACED_CAMPAIGNS, ...TRANSACTIONAL_CAMPAIGNS].join(',')})`
  const { data: mkSessRaw, error: mkSessErr } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    // ⚠️ التايبس المتولدة قديمة ومش عارفة عمود session — نفس قصة q.select
    //    في شاشة الطابور. السترينج المتعدد بيعدّي، والمفرد لأ.
    .select('session, id')
    .eq('status', 'queued')
    .not('template_vars->>campaign_name', 'in', MK_FILTER)
    .lte('scheduled_for', nowIso)
    .limit(2000)
  const mkSessions = Array.from(new Set(
    ((mkSessRaw ?? []) as unknown as Array<{ session: string | null }>)
      .map((r) => (r.session || '').trim() || DEFAULT_SESSION),
  ))
  const mkPerLane = await Promise.all(mkSessions.map(async (s) => {
    let q = supabaseAdmin
      .from('whatsapp_campaign_messages')
      .select(COLS)
      .eq('status', 'queued')
      .not('template_vars->>campaign_name', 'in', MK_FILTER)
      .lte('scheduled_for', nowIso)
    // الرقم الافتراضي بياخد كمان الرسايل اللي session بتاعها فاضي
    q = s === DEFAULT_SESSION ? q.or(`session.eq.${s},session.is.null`) : q.eq('session' as never, s)
    return q.order('scheduled_for', { ascending: true }).limit(MAX_PER_RUN + 4)
  }))
  const mkErr = mkSessErr || mkPerLane.find((r) => r.error)?.error || null
  const mkRaw = mkPerLane.flatMap((r) => r.data ?? [])

  // 🔎 (5 Aug 2026) ماتبلعش الخطأ — ده كان مخبي عطل الطابور المتجمد
  const qErr = txErr || mkErr
  if (qErr) {
    return NextResponse.json({ ok: false, error: 'due query failed', detail: qErr.message })
  }

  // 🧹 ريبر الرسايل العالقة في 'sending' من تشغيلة ماتت في النص
  try {
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'queued' } as never)
      .eq('status', 'sending')
      .lt('locked_at', stuckCutoff)
  } catch { /* الريبر مايوقفش الإرسال */ }

  const laneOf = (r: QueueRow) => (r.session || '').trim() || DEFAULT_SESSION
  const lanes = new Map<string, { tx: QueueRow[]; mk: QueueRow[] }>()
  const bucket = (k: string) => {
    let b = lanes.get(k)
    if (!b) { b = { tx: [], mk: [] }; lanes.set(k, b) }
    return b
  }
  for (const r of ((txRaw ?? []) as unknown as QueueRow[])) bucket(laneOf(r)).tx.push(r)
  for (const r of ((mkRaw ?? []) as unknown as QueueRow[])) bucket(laneOf(r)).mk.push(r)

  if (lanes.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'مفيش رسايل مستحقة' })
  }

  const results: Array<{ id: string; phone: string; session: string; ok: boolean; error?: string }> = []
  const laneReport: Array<Record<string, unknown>> = []

  // المسارات بتشتغل **بالتوازي** — ده هو المقصود من «كل رقم بمسار».
  await Promise.all(Array.from(lanes.entries()).map(async ([session, b]) => {
    // (أ) المسار موقوف؟
    const halted = await laneHalted(session)
    if (halted) {
      laneReport.push({ session, skipped: `المسار موقوف: ${halted}` })
      return
    }

    // (ب) بوابة تأكيد الوصول — لكل رقم على حدة
    const gate = await ackGate({
      session,
      ackWaitMs: ACK_WAIT_MS,
      excludeCampaigns: PACED_CAMPAIGNS,
      sessionIsDefault: session === DEFAULT_SESSION,
      onHalt: haltLane(session),
    })
    if (!gate.proceed) {
      laneReport.push({ session, skipped: gate.reason, waiting: gate.waiting, waited_sec: gate.waited_sec, halted: gate.halted || undefined })
      return
    }

    // (ج) السقف اليومي بتاع الرقم ده — المعاملاتي بيعدّي فوقه
    const usedToday = sentTodayBy.get(session) ?? 0
    const capped = usedToday >= safety.maxPerDay
    const picks = b.tx.slice(0, MAX_PER_RUN)
    if (picks.length < MAX_PER_RUN && !capped) {
      picks.push(...b.mk.slice(0, MAX_PER_RUN - picks.length))
    }
    if (picks.length === 0) {
      laneReport.push({ session, skipped: capped ? `السقف اليومي اتوصل (${usedToday}/${safety.maxPerDay})` : 'مفيش مستحق', sent_today: usedToday })
      return
    }

    for (const row of picks) {
      // قفل متفائل — نحوّل الحالة قبل الإرسال عشان مانبعتش مرتين
      const { data: locked, error: lockErr } = await supabaseAdmin
        .from('whatsapp_campaign_messages')
        .update({ status: 'sending', attempts: (row.attempts ?? 0) + 1, locked_at: new Date().toISOString() } as never)
        .eq('id', row.id)
        .eq('status', 'queued')
        .select('id')

      if (lockErr) {
        results.push({ id: row.id, phone: row.recipient_phone, session, ok: false, error: 'lock: ' + lockErr.message })
        continue
      }
      if (!locked || locked.length === 0) continue // تشغيلة تانية خدتها

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
        // 🚨 حارس «رد بس» محتاج اسم الحملة عشان وضع `campaigns`
        campaign: row.template_vars?.campaign_name ?? null,
        // الرقم بتاع المسار — نفس اللي البوابة قاسته بالظبط
        session,
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

      results.push({ id: row.id, phone: row.recipient_phone, session, ok: sent.ok, error: sent.error })
    }

    laneReport.push({
      session,
      queued_due: b.tx.length + b.mk.length,
      sent: results.filter((r) => r.session === session && r.ok).length,
      sent_today: usedToday,
      cap: safety.maxPerDay,
    })
  }))

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    ...(retried.length > 0 ? { retried } : {}),
    lanes: laneReport,
    default_session: DEFAULT_SESSION,
    sent_today: sentToday + results.filter((r) => r.ok).length,
    daily_cap: safety.maxPerDay,
    results,
  })
}
