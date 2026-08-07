// src/app/api/cron/wa-paced-send/route.ts
// ============================================================================
// 📤 الإرسال المتدرّج بتأكيد وصول (٦ أغسطس ٢٠٢٦ — طلب محمد)
//
// القاعدة اللي طلبها بالنص: «يبعت 3 رسايل من رقم 337، ويستنى تأكيد إنهم
// وصلوا، وبعدين يبعت من 1551 — كل 3 دقايق، 3 رسايل بس».
//
// إزاي بنتأكد إنها «وصلت» فعلًا؟ OpenWA بيبعت حدث `message.ack` على الويبهوك
// (1 = وصلت السيرفر · 2 = اتسلّمت للجهاز · 3 = اتقريت). الهاندلر في
// `/api/whatsapp/openwa` بقى يسجّلها على `whatsapp_messages.status`.
// فالكرون ده **مايبعتش دفعة جديدة** غير لما الدفعة اللي قبلها تبقى `delivered`.
//
// ⚠️ الأمان: لو دفعة ماوصلتش خلال المهلة → الكرون **بيقف لوحده** ويعلّم
//    `paced_send_enabled=0`. ده اللي بيفرق بين إرسال متحكَّم وبين حرق الرقم
//    (551 اتحظر قبل كده من الإرسال البارد).
//
// المفاتيح في `whatsapp_config`:
//   paced_send_enabled   : '1' يشتغل · '0' واقف
//   paced_send_session   : رقم/اسم جلسة OpenWA الحالية (201026222337 = 337)
//   paced_send_campaign  : اسم الحملة اللي بياخد منها
//   paced_send_halt_note : سبب آخر وقفة (بيتكتب أوتوماتيك)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { sendText, upsertConversation } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const maxDuration = 60

const BATCH = Number(process.env.WA_PACED_BATCH || 3)
const ACK_WAIT_MS = Number(process.env.WA_PACED_ACK_WAIT_MS || 9 * 60 * 1000)

type Cfg = Record<string, string>

async function readConfig(): Promise<Cfg> {
  const { data } = await supabaseAdmin
    .from('whatsapp_config')
    .select('key, value')
    .in('key', [
      'paced_send_enabled',
      'paced_send_session',
      'paced_send_sessions',
      'paced_send_rotate_idx',
      'paced_send_campaign',
    ])
  const cfg: Cfg = {}
  for (const r of (data ?? []) as Array<{ key: string; value: string }>) cfg[r.key] = r.value
  return cfg
}

async function setConfig(key: string, value: string) {
  await supabaseAdmin.from('whatsapp_config').upsert({ key, value } as never, { onConflict: 'key' })
}

async function halt(reason: string) {
  await setConfig('paced_send_enabled', '0')
  await setConfig('paced_send_halt_note', `${new Date().toISOString()} — ${reason}`)
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = request.headers.get('x-madmona-secret')
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = process.env.WA_SERVICE_SECRET && secret === process.env.WA_SERVICE_SECRET
  if (!isCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const cfg = await readConfig()
  if (cfg.paced_send_enabled !== '1') {
    return NextResponse.json({ ok: true, skipped: 'متوقف (paced_send_enabled != 1)' })
  }

  // 🔄 (٦ أغسطس ٢٠٢٦ — محمد) توزيع الحمل على الرقمين بالتناوب.
  //    كل دفعة بتخرج من رقم مختلف، فالإيقاع الفعلي لكل رقم بيبقى **النص**
  //    (3 رسايل كل 6 دقايق للرقم الواحد بدل كل 3) — أأمن بكتير للأرقام
  //    اللي واحد منها كان محظور قبل كده.
  //    `paced_send_sessions` = أرقام مفصولة بفاصلة. لو فاضية بيقع على
  //    `paced_send_session` القديم (رقم واحد) — متوافق مع القديم.
  const rotation = (cfg.paced_send_sessions || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  //
  // 🐞 (٧ أغسطس — بلاغ محمد: «مفيش ولا رسالة خرجت من 1551») المؤشر كان
  //    بيتقدّم **في كل تشغيلة للكرون**، حتى التشغيلات اللي بتقف تستنى تأكيد
  //    الوصول وماتبعتش حاجة. فالنمط بقى: تشغيلة تبعت (337) ← تشغيلة تستنى
  //    (وتاكل دور 1551) ← تشغيلة تبعت (337 تاني)… يعني **1551 عمره ما جه
  //    دوره**. الحل: المؤشر مايتقدّمش غير بعد ما رسالة تخرج فعلًا (تحت).
  const rotIdx = Number(cfg.paced_send_rotate_idx || 0)
  let session: string
  if (rotation.length > 1) {
    session = rotation[rotIdx % rotation.length]
  } else {
    session = rotation[0] || cfg.paced_send_session || '201026222337'
  }
  const campaign = cfg.paced_send_campaign || 'paced_20260806'

  // ── ١) الجلسة متصلة؟ ────────────────────────────────────────────────
  try {
    const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
    const key = process.env.OPENWA_API_KEY || ''
    if (!base || !key) return NextResponse.json({ ok: false, error: 'OPENWA غير مضبوط' })
    const r = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const list = (await r.json()) as Array<{ name?: string; phone?: string | number; status?: string }>
    const want = session.replace(/\D/g, '')
    const s = Array.isArray(list)
      ? list.find((x) => x.name === session || String(x.phone ?? '').replace(/\D/g, '') === want)
      : null
    if (!s) {
      await halt(`الجلسة ${session} مش موجودة في OpenWA`)
      return NextResponse.json({ ok: false, halted: true, error: `الجلسة ${session} مش موجودة` })
    }
    if (s.status !== 'ready') {
      await halt(`الجلسة ${session} حالتها ${s.status}`)
      return NextResponse.json({ ok: false, halted: true, error: `الجلسة مش ready (${s.status})` })
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: 'فشل فحص جلسات OpenWA — هنجرب الدورة الجاية' })
  }

  // ── ٢) الدفعة اللي فاتت وصلت؟ ───────────────────────────────────────
  // البوابة بتقرا **صف الحملة نفسه**: ويبهوك `message.ack` بيحوّله من
  // `sent` لـ`delivered`/`read`. فأي صف لسه `sent` = لسه ماوصلش.
  const { data: pendingAck } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id, whatsapp_msg_id, sent_at')
    .eq('status', 'sent')
    .eq('template_vars->>campaign_name', campaign)
    // الصفوف اللي مالهاش معرّف رسالة **مستحيل** يجيلها ack (اتبعتت قبل إصلاح
    // التقاط الـid) — فمنستنّاش عليها، وإلا البوابة بتتقفل للأبد على ماضٍ ميت.
    .not('whatsapp_msg_id', 'is', null)
    .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('sent_at', { ascending: false })
    .limit(20)

  const waiting = (pendingAck ?? []) as Array<{ id: string; whatsapp_msg_id: string | null; sent_at: string }>

  // 🩹 (٦ أغسطس ٢٠٢٦ — بعد أول تشغيل حقيقي) الشرط الأول كان «كل الدفعة
  //    تتسلّم»، وده وقّف الحملة كلها لأن **عميل واحد** موبايله مقفول فمجاش
  //    منه إيصال. ده غلط: إحنا عايزين نتأكد إن **الرقم بيسلّم**، مش إن كل
  //    مستقبِل أونلاين. فالقاعدة بقت: لو حتى رسالة واحدة من الشباك اتسلّمت
  //    → الرقم سليم، كمّل وسيب المتأخرين. الوقفة بتحصل بس لو **مفيش ولا
  //    إيصال خالص** بعد المهلة — يعني الرقم نفسه مش بيوصّل.
  if (waiting.length) {
    const fresh = waiting.filter(
      (w) => Date.now() - new Date(w.sent_at).getTime() <= ACK_WAIT_MS
    )
    if (fresh.length) {
      const newest = fresh.reduce((a, b) => (a.sent_at > b.sent_at ? a : b))
      return NextResponse.json({
        ok: true,
        skipped: 'مستني تأكيد وصول الدفعة اللي فاتت',
        waiting: fresh.length,
        waited_sec: Math.round((Date.now() - new Date(newest.sent_at).getTime()) / 1000),
      })
    }

    // كلهم عدّوا المهلة — **الرقم ده بالذات** سلّم أي حاجة في نفس الفترة؟
    //
    // 🐞 (٧ أغسطس) الفحص كان على الحملة كلها مش على الرقم. 337 بيسلّم 98%،
    //    فكان بيغطّي على 1551 اللي بعت 12 رسالة و**صفر اتسلّم** (رقم راجع من
    //    حظر ولسه مقيّد: الجلسة ready والـAPI بيقبل ويدّي ID والرسالة تروح في
    //    الفراغ). النتيجة إن رقم ميت فضل يبعت وإحنا فاكرينه شغّال.
    //    القياس دلوقتي **لكل رقم لوحده** عبر `whatsapp_messages.session_id`.
    const { count: deliveredCount } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .eq('session_id', session)
      .in('status', ['delivered', 'read'])
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())

    if (!deliveredCount) {
      await halt(
        `${waiting.length} رسالة من غير أي تأكيد تسليم خلال ${Math.round(ACK_WAIT_MS / 60000)} دقيقة، ومفيش ولا إيصال في آخر 6 ساعات — الجلسة ${session}`
      )
      return NextResponse.json({
        ok: false,
        halted: true,
        error: 'الرقم مش بيسلّم خالص — وقفت الإرسال',
        waiting: waiting.length,
      })
    }
    // فيه تسليم فعلي → المتأخرين دول موبايلاتهم مقفولة، مايوقفوش الحملة
  }

  // ── ٣) الدفعة الجاية (3 كحد أقصى) ───────────────────────────────────
  const { data: dueRaw } = await supabaseAdmin
    .from('whatsapp_campaign_messages')
    .select('id, recipient_phone, recipient_name, message_content, attempts')
    .eq('status', 'queued')
    .eq('template_vars->>campaign_name', campaign)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(BATCH)

  const due = (dueRaw ?? []) as Array<{
    id: string
    recipient_phone: string
    recipient_name: string | null
    message_content: string
    attempts: number | null
  }>

  if (!due.length) {
    return NextResponse.json({ ok: true, sent: 0, note: 'مفيش رسايل مستحقة', campaign, session })
  }

  const results: Array<{ phone: string; ok: boolean; error?: string }> = []

  for (const row of due) {
    const { data: locked } = await supabaseAdmin
      .from('whatsapp_campaign_messages')
      .update({ status: 'sending', attempts: (row.attempts ?? 0) + 1 } as never)
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id')
    if (!locked || locked.length === 0) continue

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

    results.push({ phone: row.recipient_phone, ok: sent.ok, error: sent.error })
  }

  // ✅ دلوقتي بس نقدّم دور التناوب — بعد ما الدفعة خرجت فعلًا، فالرقم التاني
  //    ياخد دوره كامل في الدفعة الجاية بدل ما ياكله انتظار تأكيد.
  if (rotation.length > 1 && results.length > 0) {
    await setConfig('paced_send_rotate_idx', String((rotIdx + 1) % rotation.length))
  }

  const failed = results.filter((r) => !r.ok)
  if (results.length > 0 && failed.length === results.length) {
    await halt(`كل الدفعة فشلت على ${session}: ${failed[0]?.error ?? 'غير معروف'}`)
  }

  return NextResponse.json({
    ok: true,
    session,
    campaign,
    sent: results.filter((r) => r.ok).length,
    failed: failed.length,
    halted: results.length > 0 && failed.length === results.length,
    results,
  })
}
