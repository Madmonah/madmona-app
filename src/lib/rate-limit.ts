// src/lib/rate-limit.ts
// =====================================================================
// 🔒 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) حد معدل بسيط (نافذة ثابتة) فوق
// جدول api_rate_limits + الدالة الذرّية rate_limit_hit في الداتابيز.
// السيرفرليس ملوش ذاكرة مشتركة بين الـinstances فالعدّ لازم يكون في مكان
// مركزي. fail-open عمدًا: لو الداتابيز اتعبت مانمنعش مستخدم شرعي —
// الحد ده ضد الإغراق مش خط الدفاع الوحيد.
// =====================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

/** true = مسموح، false = عدّى الحد. المفتاح يفضّل يكون '<scope>:<ip>' */
export async function rateLimitOk(
  sb: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await sb.rpc('rate_limit_hit', {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    } as never)
    if (error) return true // fail-open
    return data !== false
  } catch {
    return true // fail-open
  }
}

/** IP العميل من هيدرز Vercel — أول قيمة في x-forwarded-for */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const xff = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  return xff || req.headers.get('x-real-ip') || 'unknown'
}
