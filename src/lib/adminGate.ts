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


/**
 * 🧑‍💼 (٢٥ أغسطس ٢٠٢٦) هل الطلب ده جاي من موظف إعلانات مضمونة داخل
 * بجلسة الأبليكيشن (Supabase Auth)؟
 * محمد: «اعلانات شهد لسة مش بتنزل مع انها ضايفاها من تاب شغلي» —
 * السبب كان إن راوتات /api/admin/* بتقبل كوكي اللوحة بس، وموظفين
 * الأبليكيشن معندهمش الكوكي ده فكل حفظ كان بيرجع 401 «لازم تدخل من
 * بوابة الأدمن». الحل على مستوى المشروع: الراوتات بتاعة الإعلانات
 * بتقبل كمان توكن جلسة Supabase لو صاحبه staff إعلانات فعلي
 * (is_listings_staff_uid — نفس منطق is_admin_or_listings_staff).
 * edge-safe: fetch بس، من غير @supabase/supabase-js.
 */
export async function isListingsStaffRequest(request: Request): Promise<boolean> {
  try {
    const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    // توكنات Supabase JWT بتبدأ بـeyJ — أسرار السيرفر اتفحصت في isAdminRequest
    if (!bearer || !bearer.startsWith('eyJ')) return false
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!base || !anonKey || !serviceKey) return false

    // ١) التوكن ده بتاع مين؟
    const uRes = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
    })
    if (!uRes.ok) return false
    const user = (await uRes.json()) as { id?: string }
    if (!user?.id) return false

    // ٢) هو staff إعلانات مضمونة فعلًا؟
    const rRes = await fetch(`${base}/rest/v1/rpc/is_listings_staff_uid`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_uid: user.id }),
    })
    if (!rRes.ok) return false
    return (await rRes.json()) === true
  } catch {
    return false
  }
}

/** كوكي اللوحة **أو** موظف إعلانات بجلسة الأبليكيشن — لراوتات الإعلانات بس. */
export async function isAdminOrListingsStaffRequest(request: Request): Promise<boolean> {
  if (await isAdminRequest(request)) return true
  return isListingsStaffRequest(request)
}
