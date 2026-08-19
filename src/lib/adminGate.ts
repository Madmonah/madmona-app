// src/lib/adminGate.ts
// =====================================================================
// قفل لوحة الإدارة (Owner-only Admin Gate)
//
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «عايز الدخول للأدمن يكون عن طريق ايميل -
//    رقم تليفون - باسورد (موظفين مضمونة فقط)») — الباسورد المشترك
//    الواحد (ADMIN_PW_SHA256 / ADMIN_SESSION_VALUE) اتلغى بالكامل.
//    دلوقتي كل موظف له حساب مستقل (platform_admins) وجلسة مستقلة
//    (platform_admin_sessions) — التفاصيل في src/lib/platformAdmin.ts.
//    `isAdminRequest` هنا فضل بنفس التوقيع (async → boolean) عشان الـ٢٢
//    راوت اللي بينادوه من غير ما نلمسهم، بس دلوقتي بيتأكد من جلسة موظف
//    حقيقية بدل ما يقارن بصمة باسورد ثابتة.
//
// 🔒 (١٢ أغسطس ٢٠٢٦ — الأرشيف) البصمة وقيمة الجلسة القديمتين كانتا اتنقلوا
// من ثوابت مكتوبة في الريبو → متغيرات بيئة على Vercel. دلوقتي المتغيرات
// دي (ADMIN_PW_SHA256 / ADMIN_SESSION_VALUE / ADMIN_PASSWORD) بقت غير
// مستخدمة خالص — تقدر تتشال من Vercel لما تحب.
// =====================================================================

// ⚠️ الملف ده بيتحمّل جوّه middleware.ts (Edge runtime) — ممنوع نستورد هنا
// أي حاجة فيها node:crypto (زي platformAdmin.ts اللي بتعمل scrypt للباسورد).
// عشان كده بنستخدم فقط ثوابت edge-safe (platformAdminConst.ts) ونداء REST
// خفيف على Supabase مباشرة (fetch عادي) بدل عميل @supabase/supabase-js
// الكامل، بالظبط زي أسلوب middleware.ts نفسه.
import { PLATFORM_ADMIN_COOKIE } from './platformAdminConst'

export const ADMIN_COOKIE = PLATFORM_ADMIN_COOKIE

// مدة الجلسة: 30 يوم
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 30

// صفحة الدخول (لازم تكون بره /admin عشان ميحصلش loop)
export const ADMIN_ENTRY_PATH = '/admin-entry'

async function isValidSessionToken(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!base || !serviceKey) return false
    const nowIso = new Date().toISOString()
    const res = await fetch(
      `${base}/rest/v1/platform_admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${encodeURIComponent(nowIso)}&select=token`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    )
    if (!res.ok) return false
    const rows = await res.json()
    return Array.isArray(rows) && rows.length > 0
  } catch {
    return false
  }
}

/**
 * هل الطلب ده جاي من أدمن؟ — بيتأكد من جلسة موظف مضمونة حقيقية
 * (كوكي platform_admin_sessions)، أو أسرار سيرفر-لسيرفر (كرونات/Edge
 * Functions) — نفس ترتيب middleware.ts.
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const raw = request.headers.get('cookie') || ''
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${PLATFORM_ADMIN_COOKIE}=`))
  if (hit) {
    const token = decodeURIComponent(hit.slice(PLATFORM_ADMIN_COOKIE.length + 1))
    if (token && (await isValidSessionToken(token))) return true
  }

  // أسرار سيرفر-لسيرفر — الكرونات وEdge Functions (نفس اللي middleware.ts بيقبله)
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const serverSecrets = [process.env.CRON_SECRET, process.env.WA_SERVICE_SECRET].filter(Boolean)
  if (bearer && serverSecrets.includes(bearer)) return true
  const maSecret = request.headers.get('x-madmona-secret')
  if (maSecret && serverSecrets.includes(maSecret)) return true

  return false
}
