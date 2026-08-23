'use client'
// =====================================================================
// ⏱️ نبضة الحضور — بتشتغل في **كل صفحات الأبليكيشن** مش صفحة واحدة
//
// 🐞 (٢٣ أغسطس ٢٠٢٦ — محمد: «موديل الحضور والانصراف بيسجل انصراف
//    والابليكيشن مفتوح»)
//
//    اللي كان بيحصل بالظبط:
//      • النبضة كانت متحطوطة **جوّه صفحة /account/work بس**.
//      • وكانت بتقف تمامًا في حالتين:
//          `if (document.hidden) return`   ← الموظف فتح تاب تاني أو قفل الشاشة
//          `if (!pos) return`              ← الـGPS اتأخر أو فشل (جوّه مبنى)
//      • و`auto_clockout_offline_sessions` بتقفل أي جلسة بقالها **١٠ دقايق**
//        من غير نبضة.
//
//    فالموظف بيفتح الأبليكيشن → يتسجّل حضوره → يروح لتاب التاسكات أو الشات
//    (يعني بيشتغل!) → النبضة تقف → بعد ١٠ دقايق النظام يقول «خرج».
//
//    الدليل من الداتابيز: **كل** جلسة حضور في اليومين اللي فاتوا قافلة
//    بـ`auto_offline` من غير استثناء واحد، ومدد زي ٠ و١ و٢ و٥ دقايق.
//    يعني الموديل كان بيسجّل وقت غلط للفريق كله، مش حالة فردية.
//
//    الإصلاح هنا:
//      ① الكومبوننت ده بيتحط في اللاي-أوت فالنبضة بتفضل شغّالة في أي صفحة.
//      ② مابنوقفش على `document.hidden` — بننبض برضه.
//      ③ لو الـGPS فشل بناخد آخر موقع اتقرا (بحد أقصى ١٠ دقايق) عشان
//         تأخيرة GPS ماتقفلش يوم شغل. بعد الـ١٠ دقايق بنبطّل — عشان لو
//         الموظف مشي فعلًا مانفضلش نحسبله وقت وهو مش موجود.
//      ④ بننبض كمان أول ما الصفحة ترجع قدّام (visibilitychange/focus).
//
//    ⚠️ الدالة `employee_auto_attendance` هي اللي بتقرر (حضور/نبضة/انصراف)
//       حسب المسافة من الفرع — إحنا بنبعت الموقع بس.
// =====================================================================

import { useEffect, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type AutoEvent = { branch: string; action: string; distance_m?: number; reason?: string }

/** أقصى عمر لآخر موقع محفوظ نستخدمه لو الـGPS مارضيش يرد. */
const POS_MAX_AGE_MS = 10 * 60 * 1000
const BEAT_EVERY_MS = 60 * 1000

function getPos(): Promise<{ lat: number; lng: number; acc: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 },
    )
  })
}

export default function AttendancePulse({ onEvent }: { onEvent?: (e: AutoEvent) => void }) {
  const lastPos = useRef<{ lat: number; lng: number; acc: number; at: number } | null>(null)
  // 🚧 مش موظف؟ بنبطّل خالص بدل ما نفضل نطلب موقعه كل دقيقة.
  const stopped = useRef(false)
  const busy = useRef(false)

  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    async function beat() {
      if (cancelled || stopped.current || busy.current) return
      busy.current = true
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return

        let pos = await getPos()
        if (pos) {
          lastPos.current = { ...pos, at: Date.now() }
        } else if (lastPos.current && Date.now() - lastPos.current.at < POS_MAX_AGE_MS) {
          // الـGPS اتأخر — بنكمّل بآخر موقع معروف عشان مايتحسبش انصراف
          pos = { lat: lastPos.current.lat, lng: lastPos.current.lng, acc: lastPos.current.acc }
        }
        if (!pos) return

        const { data } = await (supabaseBrowser.rpc as unknown as (
          fn: string, args: Record<string, unknown>,
        ) => Promise<{ data: { ok?: boolean; events?: AutoEvent[] } | null }>)(
          'employee_auto_attendance',
          { p_lat: pos.lat, p_lng: pos.lng, p_accuracy_m: pos.acc },
        )

        const events = data?.events || []
        // مفيش أي فرع مربوط بالحساب ده → مش موظف، بطّل النبض نهائيًا.
        if (data?.ok && events.length === 0) { stopped.current = true; return }

        const ev = events.find((e) => e.action === 'clock_in' || e.action === 'clock_out')
        if (ev && onEvent) onEvent(ev)
      } catch (e) {
        console.error('[attendance-pulse] failed:', e)
      } finally {
        busy.current = false
      }
    }

    beat()
    iv = setInterval(beat, BEAT_EVERY_MS)

    // أول ما يرجع للأبليكيشن ننبض على طول — مانستناش الدقيقة تخلص
    const onVisible = () => { if (!document.hidden) beat() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      cancelled = true
      if (iv) clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  return null
}
