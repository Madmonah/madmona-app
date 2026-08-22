'use client'

// 👤 (٢٢ أغسطس ٢٠٢٦) هل اللي فاتح الموقع دلوقتي من فريق مضمونة؟ وكام حاجة مستنياه؟
// ---------------------------------------------------------------------------
// محمد: «عايز تاب تفتح من مضمونة دوت كوم من تاب شغلي»
// الهوك ده بيغذّي تاب «شغلي» في الشريط السفلي وفي قايمة الهيدر.
//
// ⚠️ ده بيتنادى من كومبوننت موجود في **كل صفحة على الموقع**، فلازم يفضل رخيص:
//   • لو مفيش جلسة أصلًا → مفيش أي نداء شبكة خالص (وده حال ٩٩٪ من الزوار).
//   • النتيجة بتتخزّن في `sessionStorage` — يعني نداء واحد لكل تبويب متصفح،
//     مش نداء مع كل تنقّل بين الصفحات.
//   • العدّادات بتتحدّث لما ترجع للتاب (`visibilitychange`) عشان الرقم
//     مايفضلش قديم بعد ما الموظف يخلّص تاسك.
//
// ⚠️ `is_madmona_staff()` جوّه `crm_my_badge` هي الحكم الحقيقي — ده مجرد
//    عرض. أي حد يزوّر الفلاج ده في المتصفح هيلاقي الشاشة نفسها بترفضه.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export type StaffBadge = { staff: boolean; tasks?: number; due?: number }

const KEY = 'madmona:staff-badge'

export function useMadmonaStaff(): StaffBadge {
  const [badge, setBadge] = useState<StaffBadge>(() => {
    if (typeof window === 'undefined') return { staff: false }
    try {
      const raw = sessionStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as StaffBadge) : { staff: false }
    } catch { return { staff: false } }
  })

  useEffect(() => {
    let alive = true

    async function check() {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) {
          // زائر عادي — مفيش نداء، ونظّف أي أثر قديم من يوزر خرج
          try { sessionStorage.removeItem(KEY) } catch { /* — */ }
          if (alive) setBadge({ staff: false })
          return
        }
        const { data, error } = await (supabaseBrowser.rpc as unknown as (
          f: string, a?: Record<string, unknown>,
        ) => Promise<{ data: StaffBadge | null; error: unknown }>)('crm_my_badge')
        if (error || !data) return
        if (!alive) return
        setBadge(data)
        try { sessionStorage.setItem(KEY, JSON.stringify(data)) } catch { /* — */ }
      } catch { /* التنقّل مايتعطّلش عشان عدّاد */ }
    }

    check()
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis) }
  }, [])

  return badge
}
