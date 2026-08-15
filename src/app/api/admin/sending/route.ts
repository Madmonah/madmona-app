// src/app/api/admin/sending/route.ts
// ============================================================================
// 📡 «مين بيبعت إيه» — نداء واحد بيجمع حاجتين:
//    ① تاريخ من الداتابيز (RPC sending_overview): إيه اتبعت ووصل ولا لأ.
//    ② **حالة الأجهزة الحية من OpenWA** — مين متصل دلوقتي فعلًا.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «عايز لينك بين الأجهزة المتوصلة بأوبن واتساب
//    والشاشات بتاعتنا») من غير ② الشاشة بتوريك الماضي بس. اختبار الإرسال
//    امبارح فشل بـ «Session is not connected» — ومفيش شاشة كانت بتقول ده
//    قبل ما نجرب. دلوقتي بيبان قبل ما تبعت.
//
// ⚠️ /admin/wa-numbers بيقرا من WA_SERVICE_URL — ده جسر Baileys **اللي
//    اتشال**. عشان كده بيعرض أرقام مش موجودة. الصفحة دي بتقرا من OpenWA
//    اللي بيبعت فعلًا.
//
// 🔒 الحارس بقى `isAdminRequest` من `@/lib/adminGate` — بيقبل كوكي جلسة
//    الأدمن زي الـmiddleware. قبل كده كان بيقارن بـ`ADMIN_PASSWORD` القديم
//    اللي اتشال في مراجعة ١٢ أغسطس، فكان بيرجّع 401 دايمًا والصفحة ماكانتش تفتح.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// نداء OpenWA لوحده ممكن ياخد ٨ ثواني — الحد الافتراضي ١٠ ثواني كان ممكن
// يقطع الطلب ويرجّع ٥٠٠ فاضي من غير أي رسالة.
export const maxDuration = 30


interface OpenWaSession {
  id?: string
  name?: string
  phone?: string | number
  status?: string
}

interface Device {
  id: string
  name: string
  phone: string | null
  status: string
  connected: boolean
  used_by: string[]
}

interface SenderRow {
  name: string
  session: string
  source: string
  /** سطر توضيحي صغير تحت الاسم — ممكن يبقى فاضي */
  note: string | null
  /** المُرسِل ده شغّال دلوقتي ولا مقفول */
  active: boolean
}

// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «عايز شاشات الإرسال تكون ديناميك»)
//
//    الليستة دي كانت **٣ سطور متكتوبة في الكود** بتقرا من `WA_CAMPAIGN_SESSION`
//    بس. وده كان بيكدب عليك: الجدول بيقول إن «طابور الواتساب» بيبعت من
//    `madmona-982` — في حين إن الكرون بيقرا `whatsapp_config.queue_send_session`
//    اللي قيمته **`madmona-337`**. يعني الشاشة كانت بتوريك رقم والرسايل
//    بتخرج من رقم تاني خالص.
//
//    دلوقتي الليستة بتتبني من **نفس المصادر اللي الكرونات بتقرا منها**:
//      ① `whatsapp_config.queue_send_session`  → طابور الواتساب
//      ② `whatsapp_campaign_messages.session`  → الرسايل اللي اتخصّصلها رقم
//         مختلف من شاشة «ابعت» (العمود الجديد بتاع النهاردة)
//      ③ `whatsapp_config.paced_send_sessions` → التناوب المتدرّج (كل رقم سطر)
//      ④ `WA_CAMPAIGN_SESSION`                 → إشعارات الحجز والوكلاء
//    فأي تغيير في الإعدادات بيبان هنا على طول من غير نشر كود.
async function senderMap(): Promise<SenderRow[]> {
  const envSession = process.env.WA_CAMPAIGN_SESSION || 'madmona-982'

  const [{ data: cfgRows }, { data: overrides }] = await Promise.all([
    supabase
      .from('whatsapp_config')
      .select('key, value')
      .in('key', [
        'queue_send_session',
        'queue_send_enabled',
        'paced_send_enabled',
        'paced_send_session',
        'paced_send_sessions',
        'paced_send_rotate_idx',
      ]),
    supabase
      .from('whatsapp_campaign_messages')
      .select('session')
      .eq('status', 'queued')
      .not('session', 'is', null)
      .limit(2000),
  ])

  const cfg: Record<string, string> = {}
  for (const r of ((cfgRows ?? []) as Array<{ key: string; value: string }>)) cfg[r.key] = r.value

  const rows: SenderRow[] = []

  // ① الطابور العادي
  const queueSession = (cfg.queue_send_session || '').trim()
  rows.push({
    name: 'طابور الواتساب',
    session: queueSession || envSession,
    source: queueSession ? 'whatsapp_config.queue_send_session' : 'WA_CAMPAIGN_SESSION (احتياطي)',
    note: queueSession ? null : 'مفيش قيمة في whatsapp_config — بيقع على متغيّر البيئة',
    active: cfg.queue_send_enabled !== '0',
  })

  // ② رسايل اتخصّصلها رقم من شاشة «ابعت»
  // العمود `session` اتضاف النهاردة (١٥ أغسطس) وأنواع Supabase المولّدة
  // في الريبو لسه ماتجدّدتش، فبتقول «الكولوم مش موجود». المرور بـ`unknown`
  // هو نفس الأسلوب المستخدم في باقي الملفات لحد ما نعيد توليد الأنواع.
  const counts = new Map<string, number>()
  for (const r of ((overrides ?? []) as unknown as Array<{ session: string | null }>)) {
    const s = (r.session || '').trim()
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  for (const [s, n] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
    rows.push({
      name: 'رسايل مخصّصة في الطابور',
      session: s,
      source: 'whatsapp_campaign_messages.session',
      note: `${n} رسالة مستنية اختارت الرقم ده من شاشة «ابعت»`,
      active: true,
    })
  }

  // ③ الإرسال المتدرّج — كل رقم في التناوب سطر لوحده
  const rotation = (cfg.paced_send_sessions || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const pacedOn = cfg.paced_send_enabled === '1'
  const pacedList = rotation.length > 0 ? rotation : [cfg.paced_send_session || '201026222337']
  const rotIdx = Number(cfg.paced_send_rotate_idx || 0)
  pacedList.forEach((s, i) => {
    const isNext = rotation.length > 1 && i === rotIdx % rotation.length
    rows.push({
      name: pacedList.length > 1 ? `الإرسال المتدرّج (${i + 1}/${pacedList.length})` : 'الإرسال المتدرّج',
      session: s,
      source: rotation.length > 0 ? 'whatsapp_config.paced_send_sessions' : 'paced_send_session (قديم)',
      note: pacedOn
        ? (isNext ? 'الدور عليه في الدفعة الجاية' : null)
        : 'مقفول (paced_send_enabled = 0)',
      active: pacedOn,
    })
  })

  // ④ إشعارات الحجز والوكلاء — لسه من متغيّر البيئة
  rows.push({
    name: 'إشعارات الحجز والوكلاء',
    session: envSession,
    source: 'WA_CAMPAIGN_SESSION',
    note: 'متغيّر بيئة على Vercel — تغييره محتاج إعادة نشر',
    active: true,
  })

  return rows
}

async function fetchDevices(senders: SenderRow[]) {
  const base = (process.env.OPENWA_URL || '').replace(/\/$/, '')
  const key = process.env.OPENWA_API_KEY || ''
  if (!base || !key) {
    return { reachable: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص', devices: [] as Device[] }
  }
  try {
    const r = await fetch(`${base}/api/sessions`, {
      headers: { 'x-api-key': key },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!r.ok) {
      return { reachable: false, error: `OpenWA رد ${r.status}`, devices: [] as Device[] }
    }
    const list = (await r.json()) as OpenWaSession[]
    const devices: Device[] = (Array.isArray(list) ? list : []).map((s) => {
      const name = String(s.name ?? s.id ?? '—')
      const phone = s.phone != null ? String(s.phone).replace(/\D/g, '') : null
      // المُرسِل ممكن يشاور على الجلسة باسمها أو برقمها — الاتنين بيتطابقوا
      const used = senders
        .filter((x) => x.session === name || (phone && x.session === phone))
        .map((x) => x.name)
      return {
        id: String(s.id ?? name),
        name,
        phone,
        status: String(s.status ?? 'unknown'),
        connected: s.status === 'ready',
        used_by: used,
      }
    })
    return { reachable: true, error: null as string | null, devices }
  } catch (e) {
    return { reachable: false, error: (e as Error).message, devices: [] as Device[] }
  }
}

// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «الراوت رجّع 500 مش JSON — (رد فاضي)»)
//    أي استثناء مش متمسوك هنا بيخلّي Vercel يرجّع ٥٠٠ **بجسم فاضي**، فمفيش
//    ولا معلومة تقول إيه اللي وقع. الغلاف ده بيمسك أي حاجة ويرجّعها JSON
//    فيها اسم الخطأ ورسالته — الشاشة بتعرضها زي ما هي.
export async function GET(request: Request) {
  try {
    return await handle(request)
  } catch (e) {
    const err = e as Error
    console.error('[admin/sending] unhandled:', err)
    return NextResponse.json(
      { error: 'Unhandled', detail: `${err?.name || 'Error'}: ${err?.message || String(e)}` },
      { status: 500 },
    )
  }
}

async function handle(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 15 Aug 2026: supabase-js does `rpc(fn){ return this.rest.rpc(...) }`, so a
  // detached `supabase.rpc` loses `this` and throws at call time:
  //   TypeError: Cannot read properties of undefined (reading 'rest')
  // Call it as a method instead. (A plain cast keeps the generics shallow;
  // .bind() here trips TS2589 on the generated types.)
  const rpc = (fn: string, a?: Record<string, unknown>) =>
    (supabase as unknown as {
      rpc: (f: string, x?: Record<string, unknown>) =>
        Promise<{ data: unknown; error: { message: string } | null }>
    }).rpc(fn, a)

  // الليستة بقت بتقرا من الداتابيز، فلازم تيجي الأول — بعدين الأجهزة بالتوازي
  // مع الـRPC الكبير.
  const senders = await senderMap()
  const [db, live] = await Promise.all([rpc('sending_overview'), fetchDevices(senders)])

  if (db.error) {
    console.error('[admin/sending] rpc error:', db.error.message)
    return NextResponse.json({ error: 'Failed', detail: db.error.message }, { status: 500 })
  }

  const base = (db.data ?? {}) as Record<string, unknown>

  // 🔗 اللينك: كل مُرسِل + حالة جهازه الحية. لو الجلسة مش في القايمة
  //    يبقى الجهاز مش موجود على OpenWA خالص — وده أوضح سبب للفشل.
  const senderStatus = senders.map((s) => {
    const dev = live.devices.find((x) => x.name === s.session || x.phone === s.session)
    return {
      ...s,
      device_status: dev?.status ?? (live.reachable ? 'مش موجود على OpenWA' : 'مش معروف'),
      connected: dev?.connected ?? false,
      device_phone: dev?.phone ?? null,
    }
  })

  return NextResponse.json({
    ...base,
    openwa: { reachable: live.reachable, error: live.error },
    devices: live.devices,
    senders: senderStatus,
  })
}
