// src/lib/adminGate.ts
// =====================================================================
// قفل لوحة الإدارة (Owner-only Admin Gate)
// 🔒 (١٢ أغسطس ٢٠٢٦ — مراجعة الأمان الشاملة) البصمة وقيمة الجلسة اتنقلوا
// من ثوابت مكتوبة في الريبو → متغيرات بيئة على Vercel:
//   ADMIN_PW_SHA256      بصمة SHA-256 لباسورد الأدمن
//   ADMIN_SESSION_VALUE  قيمة كوكي الجلسة (عشوائية، تدويرها = خروج كل الجلسات)
// السبب: القيم القديمة موجودة في تاريخ git للأبد — أي حد شاف الريبو كان
// يقدر يحط الكوكي في متصفحه ويبقى أدمن دائم. دلوقتي التدوير = تغيير env
// من غير نشر كود. لو المتغيرات مش متظبطة البوابة بتقفل (fail closed).
// =====================================================================

export const ADMIN_COOKIE = 'madmona_admin_session'

// بصمة الباسورد (SHA-256) — من البيئة فقط. فاضية = مفيش دخول بالباسورد.
export const ADMIN_PW_SHA256 = process.env.ADMIN_PW_SHA256 ?? ''

// قيمة الكوكي بعد الدخول الناجح — من البيئة فقط. فاضية = مفيش جلسات صالحة.
export const ADMIN_SESSION_VALUE = process.env.ADMIN_SESSION_VALUE ?? ''

// مدة الجلسة: 30 يوم
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 30

// صفحة الدخول (لازم تكون بره /admin عشان ميحصلش loop)
export const ADMIN_ENTRY_PATH = '/admin-entry'

// =====================================================================
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «صفحة مين بيبعت إيه والإرسال مش بتدخل»)
//
//    مراجعة الأمان بتاعة ١٢ أغسطس نقلت الباسورد من `ADMIN_PASSWORD`
//    (نص صريح) لـ `ADMIN_PW_SHA256` (بصمة) + كوكي جلسة، وحطّت الحارس
//    مركزي في `middleware.ts`. بس **١٩ راوت لسه بيقارنوا بـ
//    `process.env.ADMIN_PASSWORD`** جوّه الملفات نفسها:
//
//        const expected = process.env.ADMIN_PASSWORD
//        if (!expected) return false   // ← مفيش متغير = مقفول للأبد
//
//    يعني حتى لو الأدمن داخل بجلسة صحيحة والـmiddleware عدّاه، الفحص
//    الداخلي بيرجّع 401 مهما كتب — لأن المتغير القديم مابقاش موجود.
//    ده اللي كان بيمنع /admin/sending و /admin/send إنهم يفتحوا خالص.
//
//    الحل: مصدر واحد للفحص، بيقبل نفس اللي الـmiddleware بيقبله.
// =====================================================================

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * هل الطلب ده جاي من أدمن؟ بيقبل — بنفس ترتيب `middleware.ts`:
 *   (أ) كوكي جلسة الأدمن (المتصفح بيبعتها لوحدها وإنت داخل على /admin)
 *   (ب) هيدر `x-admin-password` مطابق لبصمة ADMIN_PW_SHA256
 *   (ج) `ADMIN_PASSWORD` القديم بالنص — سايبينه للسكريبتات القديمة بس
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  // (أ) الكوكي
  if (ADMIN_SESSION_VALUE) {
    const raw = request.headers.get('cookie') || ''
    const hit = raw.split(';').map(c => c.trim()).find(c => c.startsWith(`${ADMIN_COOKIE}=`))
    if (hit && decodeURIComponent(hit.slice(ADMIN_COOKIE.length + 1)) === ADMIN_SESSION_VALUE) return true
  }

  const pw = request.headers.get('x-admin-password')
  if (!pw) return false

  // (ب) البصمة الجديدة
  if (ADMIN_PW_SHA256 && (await sha256Hex(pw)) === ADMIN_PW_SHA256) return true

  // (ج) المتغير القديم بالنص
  const legacy = process.env.ADMIN_PASSWORD
  if (legacy && pw === legacy) return true

  return false
}
