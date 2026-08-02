// src/app/api/cron/wa-sync/route.ts
// ═══════════════════════════════════════════════════════════════════════
// مزامنة أرقام واتساب: لوحة OpenWA → المارد
//
// الفكرة: تربط أي رقم من لوحة OpenWA وخلاص. المسار ده بيلاقيه لوحده
// ويعمل الباقي:
//
//   ١) بيسجّل الويبهوك بتاعنا على الجلسة لو مش متسجّل
//      (من غيره الرسايل الواردة بتوصل OpenWA ومابتوصلناش —
//       وده بالظبط شكل «المارد ساكت» اللي بيضيّع ساعات في التشخيص)
//   ٢) بيعمل صف في wa_number_configs بالرقم، عشان الإرسال يعرف
//      يوجّه الرد للجلسة الصح
//
// بيشتغل كل ١٠ دقايق من كرون فيرسل، وبيتنادى كمان فورًا من
// /api/whatsapp/openwa أول ما تيجي رسالة من جلسة مش متسجّلة —
// فالرقم الجديد بيشتغل من أول رسالة مش بعد ١٠ دقايق.
//
// ⚠️ بيعمل reconcile مش إنشاء مرة واحدة: لو حد شال الويبهوك من اللوحة
//    بالغلط، الدورة الجاية بترجّعه. الصمت هنا أخطر من العطل الصريح.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const OPENWA_URL = (process.env.OPENWA_URL || '').replace(/\/$/, '')
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || ''
const SECRET = process.env.WA_SERVICE_SECRET || ''
const APP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.madmonacairo.com'

/** الويبهوك اللي المفروض يكون متسجّل على كل جلسة */
function webhookUrl(): string {
  const base = `${APP_ORIGIN.replace(/\/$/, '')}/api/whatsapp/openwa`
  return SECRET ? `${base}?token=${encodeURIComponent(SECRET)}` : base
}

function headers(): HeadersInit {
  return { 'Content-Type': 'application/json', 'x-api-key': OPENWA_API_KEY }
}

interface OwaSession {
  id: string
  name: string
  status: string
  phone?: string | number | null
  pushName?: string | null
}

interface OwaWebhook {
  id: string
  url: string
  active: boolean
}

export interface SyncResult {
  ok: boolean
  error?: string
  sessions: number
  webhooks_added: string[]
  numbers_added: string[]
  skipped: string[]
}

/**
 * المزامنة نفسها — متاحة للاستدعاء المباشر من مسارات تانية
 * (مثلاً مستقبِل الويبهوك لما يشوف جلسة مش متسجّلة).
 *
 * مابترميش أبدًا: أي فشل بيرجع في النتيجة. المزامنة حاجة مساعدة،
 * مايصحّش تكسر المسار اللي نادى عليها.
 */
export async function syncOpenWaNumbers(): Promise<SyncResult> {
  const out: SyncResult = { ok: true, sessions: 0, webhooks_added: [], numbers_added: [], skipped: [] }

  if (!OPENWA_URL || !OPENWA_API_KEY) {
    return { ...out, ok: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص' }
  }

  let list: OwaSession[]
  try {
    const r = await fetch(`${OPENWA_URL}/api/sessions`, {
      headers: headers(),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!r.ok) return { ...out, ok: false, error: `OpenWA رجّع ${r.status}` }
    list = (await r.json()) as OwaSession[]
  } catch (e) {
    return { ...out, ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بـOpenWA' }
  }

  out.sessions = list.length
  const want = webhookUrl()

  for (const s of list) {
    // ── ١) الويبهوك ────────────────────────────────────────────────────
    // بنقارن من غير الـtoken: لو السر اتغيّر، عايزين **نحدّث** الموجود
    // مش نضيف واحد تاني جنبه ونفضل نستقبل كل رسالة مرتين.
    try {
      const wr = await fetch(`${OPENWA_URL}/api/sessions/${s.id}/webhooks`, {
        headers: headers(),
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      })
      const hooks = wr.ok ? ((await wr.json()) as OwaWebhook[]) : []
      const ours = hooks.find((h) => (h.url || '').split('?')[0] === want.split('?')[0])

      if (!ours) {
        const cr = await fetch(`${OPENWA_URL}/api/sessions/${s.id}/webhooks`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ url: want, events: ['*'], retryCount: 3 }),
          signal: AbortSignal.timeout(12000),
        })
        if (cr.ok) out.webhooks_added.push(s.name)
        else out.skipped.push(`${s.name}: ويبهوك ${cr.status}`)
      } else if (ours.url !== want || !ours.active) {
        // نفس المسار بس السر اتغيّر أو اتوقف — نحدّثه في مكانه
        await fetch(`${OPENWA_URL}/api/sessions/${s.id}/webhooks/${ours.id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ url: want, events: ['*'], active: true }),
          signal: AbortSignal.timeout(12000),
        }).catch(() => {})
        out.webhooks_added.push(`${s.name} (تحديث)`)
      }
    } catch {
      out.skipped.push(`${s.name}: فشل فحص الويبهوك`)
    }

    // ── ٢) صف الرقم ────────────────────────────────────────────────────
    // الرقم مابيظهرش غير بعد ما الجلسة تتربط فعلاً. الجلسة اللي لسه
    // مستنية QR بنعدّيها — الدورة الجاية هتلاقيها.
    const phone = String(s.phone ?? '').replace(/\D/g, '')
    if (!phone) {
      out.skipped.push(`${s.name}: لسه مش مربوط`)
      continue
    }

    try {
      const { data: existing } = await supabaseUntyped
        .from('wa_number_configs')
        .select('session_id, transport')
        .eq('session_id', phone)
        .maybeSingle()

      if (!existing) {
        const { error } = await supabaseUntyped.from('wa_number_configs').insert({
          session_id: phone,
          label: s.pushName || s.name,
          transport: 'openwa',
          enabled: true,
        })
        if (error) out.skipped.push(`${phone}: ${error.message}`)
        else out.numbers_added.push(phone)
      } else if (existing.transport !== 'openwa') {
        // رقم قديم كان متوجّه لخدمة اتشالت — نرجّعه للمسار الشغال
        await supabaseUntyped
          .from('wa_number_configs')
          .update({ transport: 'openwa', updated_at: new Date().toISOString() })
          .eq('session_id', phone)
        out.numbers_added.push(`${phone} (تحويل)`)
      }
    } catch (e) {
      out.skipped.push(`${phone}: ${e instanceof Error ? e.message : 'فشل الحفظ'}`)
    }
  }

  return out
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const manual = request.headers.get('x-madmona-secret')
  const isCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = !!SECRET && manual === SECRET
  if (!isCron && !isManual) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await syncOpenWaNumbers()
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
