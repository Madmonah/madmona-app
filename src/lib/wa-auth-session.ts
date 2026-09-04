// src/lib/wa-auth-session.ts
// ============================================================================
// 🔐 رقم الدخول والتوثيق — **مصدر واحد**، ومعزول عن أرقام الحملات.
//
// محمد (٤ سبتمبر ٢٠٢٦): «عايز أربط حساب الموبايل بتاع إنشاء الحساب
//   وتسجيل الدخول وتوثيق الرقم بحساب مايكونش بيبعت أي رسايل خالص»،
//   وبعدها: «ممكن نبدأ 9982 ولو مش متوصل نشتغل بـ1551».
//
// 🐞 اللي كان بيحصل قبل كده — تلات مسارات بتلات سلوكيات:
//   · `/api/auth/otp`        → `sendText` من غير `session` خالص، يعني
//                              OpenWA بياخد **أول رقم متصل**.
//   · `/api/auth/forgot-otp` → 982 وإلا **337**، بقراءة `enabled` اليدوي بس.
//   · `/api/auth/wa`         → 982 وإلا أول جلسة `ready` — و337 أول واحد
//                              في القايمة الرسمية بعد 982.
//   التلاتة كانوا بيقعوا على **337** — وهو نفس الرقم اللي بيشيل حملات
//   الواتساب. يعني حملة باردة تتفلتر = الدخول وإنشاء الحساب يقعوا مع بعض.
//
// ✅ القاعدة دلوقتي: الترتيب 9982 → 1551، و**رقم الحملة ممنوع** يستخدم
//    للدخول مهما كانت حالته. الترتيب نفسه في `whatsapp_config.auth_wa_order`
//    عشان يتغيّر من غير نشر.
//
// ⚠️ أي مسار جديد بيبعت كود دخول أو توثيق **لازم** ينادي `pickAuthWaSession()`
//    — ممنوع `sendText` من غير `session` في أي مسار auth.
// ============================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'
import { SESSION_PHONES } from '@/lib/wa-ack-gate'

/** الترتيب الافتراضي لو المفتاح مش موجود في الداتابيز. */
export const AUTH_WA_DEFAULT_ORDER = ['201002229982', '201114621551'] as const

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')

/** أرقام الجلسات اللي حالتها `ready` على OpenWA دلوقتي. */
async function readyNumbers(): Promise<Set<string>> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('key, value')
      .in('key', ['openwa_url', 'openwa_api_key'])
    const cfg = Object.fromEntries(
      ((data ?? []) as Array<{ key: string; value: string }>).map((r) => [r.key, r.value]),
    )
    if (!cfg.openwa_url) return new Set()

    // الدخول ماينتظرش أكتر من ٢.٥ ثانية — أحسن نبعت من الافتراضي
    // من إننا نعلّق صفحة تسجيل الدخول في وش المستخدم.
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 2500)
    const res = await fetch(cfg.openwa_url.replace(/\/$/, '') + '/api/sessions', {
      headers: cfg.openwa_api_key ? { 'x-api-key': cfg.openwa_api_key } : {},
      signal: ac.signal,
    }).finally(() => clearTimeout(t))
    if (!res.ok) return new Set()

    const j = await res.json()
    const arr: Array<{ phone?: string; status?: string }> =
      Array.isArray(j) ? j : (j.sessions || j.data || [])
    return new Set(
      arr.filter((x) => x.status === 'ready').map((x) => digits(x.phone)).filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

/** رقم الحملات الحالي (بالأرقام) — ممنوع الدخول يخرج منه. */
async function campaignNumber(): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'queue_send_session')
      .maybeSingle()
    const name = (data as { value?: string } | null)?.value?.trim()
    if (!name) return null
    // المفتاح ممكن يبقى اسم جلسة (madmona-337) أو رقم — الاتنين مقبولين
    return digits(SESSION_PHONES[name] ?? name) || null
  } catch {
    return null
  }
}

async function authOrder(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('value')
      .eq('key', 'auth_wa_order')
      .maybeSingle()
    const raw = (data as { value?: string } | null)?.value?.trim()
    if (raw) {
      const list = raw.split(',').map(digits).filter(Boolean)
      if (list.length) return list
    }
  } catch { /* نكمّل بالافتراضي */ }
  return [...AUTH_WA_DEFAULT_ORDER]
}

export interface AuthWaPick {
  /** الرقم اللي هيتبعت منه (2010xxxxxxxx) */
  session: string
  /** ليه اتختار — بيتسجّل في اللوج عشان التشخيص */
  reason: 'ready' | 'fallback_not_ready' | 'unknown_status'
}

/**
 * بيختار رقم الدخول/التوثيق: أول رقم في `auth_wa_order` حالته `ready`،
 * مع استبعاد رقم الحملات دايمًا. لو مقدرناش نقرا الحالة بنرجّع الأول
 * في الترتيب بدل ما نوقف الدخول.
 */
export async function pickAuthWaSession(): Promise<AuthWaPick> {
  const [order, campaign, ready] = await Promise.all([
    authOrder(), campaignNumber(), readyNumbers(),
  ])
  const allowed = order.filter((n) => n !== campaign)
  const list = allowed.length ? allowed : order   // لو الترتيب كله = رقم الحملة

  if (ready.size === 0) return { session: list[0], reason: 'unknown_status' }

  const live = list.find((n) => ready.has(n))
  if (live) return { session: live, reason: live === list[0] ? 'ready' : 'fallback_not_ready' }

  return { session: list[0], reason: 'unknown_status' }
}

/** نفس الاختيار، بيرجّع الرقم بس — للمسارات اللي مش محتاجة السبب. */
export async function authWaSession(): Promise<string> {
  return (await pickAuthWaSession()).session
}
