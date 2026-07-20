// 🧭 تخزين آمن — بديل localStorage
//
// ٢١ يوليو ٢٠٢٦: محمد قال «سفاري مش عايز يعرض الماركتبليس».
//
// السبب: سفاري في **التصفح الخاص** بيرمي استثناء لما تلمس
// localStorage — مش بيرجّع null، بيرمي `SecurityError`.
// وعندنا ٧٩ استخدام من غير حماية، فأول واحد فيهم بيقتل
// الصفحة كلها قبل ما تترسم.
//
// نفس الحكاية بتحصل لو المستخدم قافل الكوكيز، أو المساحة
// اتملت (QuotaExceededError).
//
// الغلاف ده بيبلع الخطأ ويرجّع null — الصفحة تشتغل من غير
// ذاكرة بدل ما تقع.

function store(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const s = window.localStorage
    // لمسة اختبار — في سفاري الخاص السطر ده هو اللي بيرمي
    const probe = '__madmona_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export const safeStorage = {
  get(key: string): string | null {
    try {
      return store()?.getItem(key) ?? null
    } catch {
      return null
    }
  },

  set(key: string, value: string): boolean {
    try {
      const s = store()
      if (!s) return false
      s.setItem(key, value)
      return true
    } catch {
      // المساحة اتملت أو التخزين مقفول — مش سبب لوقوع الصفحة
      return false
    }
  },

  remove(key: string): void {
    try {
      store()?.removeItem(key)
    } catch {
      /* تجاهل */
    }
  },

  /** متاح ولا لأ — للحالات اللي عايزة تعرف قبل ما تعتمد عليه */
  available(): boolean {
    return store() !== null
  },
}
