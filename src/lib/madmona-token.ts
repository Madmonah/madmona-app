// ═══════════════════════════════════════════════════════════════════════
// 🔑 مصدر واحد لقراءة توكن مضمونة
//
// محمد (٢ سبتمبر ٢٠٢٦): «بدوس على حضور الفريق من تاب الـ٣ شرايط في نسخة
// الموبايل برضو مش شغالة» — بعد ما الدوال في الداتابيز اتصلحت واتأكدت
// إنها بترجّع ok=true بجلسته.
//
// 🐞 الجذر: التوكن بيتخزّن تحت **مفتاحين مختلفين** حسب باب الدخول:
//     • /login و واتساب و ماچيك لينك → 'madmona_token'
//     • جلسة Supabase (جوجل) عبر syncModuleSession → 'madmona_session_token'
//   وكل الشاشات بتقرا 'madmona_token' **بس**. فاللي داخل بجوجل التوكن
//   عنده موجود بالمفتاح التاني، والشاشة بتلاقي فاضي وترميه على /login.
//
//   وده بقى أوضح بعد ما صلّحنا قايمة الـ٣ شرط تشتغل بالبابين: القايمة
//   بقت تبان، واللينك اللي جوّاها لسه بباب واحد — فالمستخدم بيدوس
//   ويتقذف على شاشة الدخول.
//
// ⚠️ أي شاشة محتاجة توكن مضمونة تنادي `ensureMadmonaToken()` —
//    ممنوع قراءة `safeStorage.get('madmona_token')` مباشرة.
// ═══════════════════════════════════════════════════════════════════════

import { safeStorage } from '@/lib/safe-storage'

const PRIMARY = 'madmona_token'
const LEGACY = 'madmona_session_token'

/** قراءة فورية من المفتاحين — من غير أي نداء شبكة. */
export function readMadmonaToken(): string | null {
  try {
    const t = safeStorage.get(PRIMARY)
    if (t) return t
    const legacy = safeStorage.get(LEGACY)
    if (legacy) {
      // نوحّدهم عشان باقي الشاشات تلاقيه في مكانه الطبيعي
      try { safeStorage.set(PRIMARY, legacy) } catch { /* التخزين ممكن يكون مقفول */ }
      return legacy
    }
  } catch { /* ssr أو تخزين مقفول */ }
  return null
}

/**
 * زي `readMadmonaToken` بس لو مفيش توكن بيحاول **يولّده** من جلسة
 * Supabase عبر `whoami` (نفس آلية `syncModuleSession`).
 * بيرجّع null بس لما يكون فعلًا مفيش أي جلسة — وساعتها الرمي على
 * `/login` يبقى صح.
 */
export async function ensureMadmonaToken(): Promise<string | null> {
  const existing = readMadmonaToken()
  if (existing) return existing
  try {
    const m = await import('@/lib/madmonaSession')
    const s = await m.syncModuleSession()
    if (s?.token) {
      try { safeStorage.set(PRIMARY, s.token) } catch { /* */ }
      return s.token
    }
  } catch { /* مفيش جلسة Supabase */ }
  return null
}
