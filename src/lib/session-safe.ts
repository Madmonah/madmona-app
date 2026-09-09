'use client'
// ============================================================================
// ⏱️ getSessionSafe — «هات الجلسة، بس ماتعلّقش الشاشة»
//
// (٩/٩/٢٠٢٦) محمد: «تاب حسابي بيلف على الفاضي» على التطبيق المثبّت على
//   تليفون محمد عبدالجابر — وعلى أي متصفح تاني بنفس حسابه بيفتح.
//   الجذر: supabase-js بياخد قفل `navigator.locks` في getSession/الريفريش،
//   والقفل ده بيعلّق في الـPWA لو فيه تاب/ووركر ميّت ماسكه (نفس السبب اللي
//   خلّى financeRpc.ts يبطّل supabase-js يوم ٢٥/٨). getSession() مابترجّعش
//   أبدًا → أي شاشة مستنياها بتلف للأبد (حسابي · درج الـ٣ شرط).
//
//   القاعدة: أي شاشة واجهة ماتستناش getSession أكتر من كام ثانية —
//   لو اتأخّرت نكمّل كإن مفيش جلسة (اللي معاه توكن واتساب بيكمّل بيه).
// ============================================================================
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Session } from '@supabase/supabase-js'

export async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const t = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), ms) })
  try { return await Promise.race([p, t]) } finally { if (timer) clearTimeout(timer) }
}

/** الجلسة أو null — ومستحيل تعلّق أكتر من `ms` (الافتراضي ٤ ثواني) */
export async function getSessionSafe(ms = 4000): Promise<Session | null> {
  try {
    const r = await withTimeout(supabaseBrowser.auth.getSession(), ms, null)
    return r?.data?.session ?? null
  } catch {
    return null
  }
}
