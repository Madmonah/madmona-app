// src/lib/wa-safety.ts
// ============================================================================
// 🛡️ حدود أمان الإرسال — **مصدر واحد**، بيتقري من الداتابيز.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم / الفاصل / ساعات الإرسال يبقوا ديناميك»)
//
//    قبل كده الحدود كانت متفرّقة على مصدرين، والاتنين تغييرهم محتاج نشر:
//      • `WA_MAX_PER_DAY` · `WA_MIN_GAP_SEC` · `WA_MAX_GAP_SEC`
//        → متغيرات بيئة على Vercel (تغييرها = دخول على Vercel + redeploy)
//      • `startHour: 10` · `endHour: 20`
//        → **أرقام مكتوبة بالنص** في `wa-queue.ts` (تغييرها = كوميت ونشر)
//
//    يعني لو الرقم بدأ ياخد تحذيرات ومحتاج تهدية فورية، مافيش طريقة تقلّل
//    الحد من غير ما تستنى نشر كامل. دلوقتي كلهم في `whatsapp_config`
//    وبيتغيّروا من الشاشة على طول.
//
// ⚠️ الترتيب: الداتابيز → متغيّر البيئة القديم → الرقم الأصلي. يعني لو
//    الصفوف اتمسحت من `whatsapp_config` السلوك بيرجع زي ما كان بالظبط.
// ============================================================================

import { supabase as supabaseAdmin } from '@/lib/supabase'

export interface WaSafety {
  /** أقصى عدد رسايل تسويقية لكل رقم في اليوم */
  maxPerDay: number
  /** أقل فاصل بين رسالتين (ثانية) */
  minGapSec: number
  /** أكبر فاصل بين رسالتين (ثانية) — الفاصل الفعلي عشوائي بينهم */
  maxGapSec: number
  /** أول ساعة يسمح فيها بالإرسال (بتوقيت القاهرة، ٢٤ ساعة) */
  startHour: number
  /** آخر ساعة (مش شاملة) — 20 يعني آخر رسالة 19:59 */
  endHour: number
}

/** القيم اللي كانت شغّالة قبل ما نخلّيها ديناميك — الملاذ الأخير. */
export const SAFETY_DEFAULTS: WaSafety = {
  maxPerDay: Number(process.env.WA_MAX_PER_DAY || 25),
  minGapSec: Number(process.env.WA_MIN_GAP_SEC || 60),
  maxGapSec: Number(process.env.WA_MAX_GAP_SEC || 180),
  startHour: 10,
  endHour: 20,
}

export const SAFETY_KEYS = {
  maxPerDay: 'wa_max_per_day',
  minGapSec: 'wa_min_gap_sec',
  maxGapSec: 'wa_max_gap_sec',
  startHour: 'wa_start_hour',
  endHour: 'wa_end_hour',
} as const

/**
 * حدود لازم تفضل معقولة مهما اتكتب في الداتابيز — قيمة غلط هنا معناها
 * إما حظر الرقم (حد يومي ٥٠٠) أو توقف الإرسال خالص (ساعات مقلوبة).
 */
function clampSafety(s: WaSafety): WaSafety {
  const n = (v: number, lo: number, hi: number, fb: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fb

  const out: WaSafety = {
    maxPerDay: n(s.maxPerDay, 1, 200, SAFETY_DEFAULTS.maxPerDay),
    minGapSec: n(s.minGapSec, 5, 3600, SAFETY_DEFAULTS.minGapSec),
    maxGapSec: n(s.maxGapSec, 5, 7200, SAFETY_DEFAULTS.maxGapSec),
    startHour: n(s.startHour, 0, 23, SAFETY_DEFAULTS.startHour),
    endHour: n(s.endHour, 1, 24, SAFETY_DEFAULTS.endHour),
  }

  // الفاصل الأكبر مايقلّش عن الأصغر — لو حصل، بنساويهم.
  if (out.maxGapSec < out.minGapSec) out.maxGapSec = out.minGapSec

  // نافذة مقلوبة أو صفر = مفيش وقت إرسال خالص، والطابور هيقف للأبد.
  // بنرجّع النافذة الأصلية بدل ما نوقف الشغل.
  if (out.endHour <= out.startHour) {
    out.startHour = SAFETY_DEFAULTS.startHour
    out.endHour = SAFETY_DEFAULTS.endHour
  }

  return out
}

/** بيقرا الحدود من `whatsapp_config`. أي مفتاح ناقص بياخد قيمته القديمة. */
export async function getSafety(): Promise<WaSafety> {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_config')
      .select('key, value')
      .in('key', Object.values(SAFETY_KEYS))

    const cfg: Record<string, string> = {}
    for (const r of ((data ?? []) as Array<{ key: string; value: string }>)) cfg[r.key] = r.value

    const pick = (k: string, fb: number) => {
      const raw = (cfg[k] ?? '').trim()
      if (raw === '') return fb
      const v = Number(raw)
      return Number.isFinite(v) ? v : fb
    }

    return clampSafety({
      maxPerDay: pick(SAFETY_KEYS.maxPerDay, SAFETY_DEFAULTS.maxPerDay),
      minGapSec: pick(SAFETY_KEYS.minGapSec, SAFETY_DEFAULTS.minGapSec),
      maxGapSec: pick(SAFETY_KEYS.maxGapSec, SAFETY_DEFAULTS.maxGapSec),
      startHour: pick(SAFETY_KEYS.startHour, SAFETY_DEFAULTS.startHour),
      endHour: pick(SAFETY_KEYS.endHour, SAFETY_DEFAULTS.endHour),
    })
  } catch {
    // الداتابيز مش راضية ترد؟ نكمّل بالقيم القديمة بدل ما نوقف الإرسال.
    return { ...SAFETY_DEFAULTS }
  }
}

/** بيحفظ الحدود بعد ما يعدّلها للحدود المعقولة. بيرجّع اللي اتحفظ فعلًا. */
export async function saveSafety(patch: Partial<WaSafety>): Promise<WaSafety> {
  const current = await getSafety()
  const next = clampSafety({ ...current, ...patch })

  const rows = (Object.keys(SAFETY_KEYS) as Array<keyof WaSafety>).map((k) => ({
    key: SAFETY_KEYS[k],
    value: String(next[k]),
  }))

  await supabaseAdmin
    .from('whatsapp_config')
    .upsert(rows as never, { onConflict: 'key' })

  return next
}
