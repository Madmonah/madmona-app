'use client'

// ============================================================================
// useTasksLive — خيط واحد بيربط كل شاشات المهام ببعض
// ----------------------------------------------------------------------------
// 🔔 (٢٢ أغسطس ٢٠٢٦ — محمد: «عايز الشات يسمع في تاب تاسكات وتاب تاسكات
//    يسمع في الشات»)
//
// المهام بتتعرض في شاشتين بيقروا من مصدرين مختلفين:
//    · تاب Task في الشات  (/chat/tasks)      → /api/team/tasks
//    · «مهامي» في «شغلي»  (/account/work)    → get_my_work_home()
// فلما مهمة تتقفل في واحدة، التانية مكانتش تعرف غير لما تتفتح من جديد.
//
// الهوك ده بيسمع من تلات مصادر، وكل واحد فيهم بيغطّي حالة التاني:
//
//   ١) الريل-تايم من Supabase — أي تغيير في daily_tasks أو flow_tasks
//      بيوصل لكل الشاشات المفتوحة، حتى لو على موبايل تاني أو موظف تاني.
//      (الجدولين اتضافوا للـpublication في sql/2026-08-22_tasks_realtime.sql)
//
//   ٢) BroadcastChannel — بين تابات نفس المتصفح. أسرع من الشبكة، وبيشتغل
//      حتى لو الريل-تايم اتقطع.
//
//   ٣) الرجوع للشاشة (visibilitychange / focus) — شبكة أمان أخيرة: لو
//      الاتنين فوق فشلوا، أول ما المستخدم يرجع للتاب بيتحدّث.
//
// أي شاشة بتقفل مهمة لازم تنادي `pingTasksChanged()` عشان باقي التابات
// تتحدّث فورًا من غير ما تستنى الريل-تايم.
// ============================================================================

import { useEffect, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

const CHANNEL = 'madmona-tasks'

/** ابعت إشارة لباقي التابات إن فيه مهمة اتغيّرت. */
export function pingTasksChanged() {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CHANNEL)
      bc.postMessage({ t: Date.now() })
      bc.close()
    }
  } catch { /* المتصفح مش داعم — الريل-تايم هيغطّيها */ }
}

/**
 * @param onChange بيتنادي كل ما مهمة تتغيّر من أي مكان. خليها مستقرة
 *                 (useCallback) عشان الاشتراك ما يتعملش من أول وجديد.
 * @param enabled  سيبها false لحد ما المستخدم يبقى مسجّل دخول.
 */
export function useTasksLive(onChange: () => void, enabled = true) {
  const cb = useRef(onChange)
  cb.current = onChange

  useEffect(() => {
    if (!enabled) return
    let alive = true
    // بنجمّع النداءات المتقاربة في نداء واحد — التحديث الواحد ممكن
    // يولّد أكتر من حدث (UPDATE + إشارة البرودكاست).
    let timer: ReturnType<typeof setTimeout> | null = null
    const fire = () => {
      if (!alive) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { if (alive) cb.current() }, 250)
    }

    // ١) ريل-تايم
    const ch = supabaseBrowser
      .channel('tasks-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flow_tasks' }, fire)
      .subscribe()

    // ٢) تابات نفس المتصفح
    let bc: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(CHANNEL)
        bc.onmessage = fire
      }
    } catch { /* تجاهل */ }

    // ٣) الرجوع للشاشة
    const onVis = () => { if (document.visibilityState === 'visible') fire() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', fire)

    return () => {
      alive = false
      if (timer) clearTimeout(timer)
      supabaseBrowser.removeChannel(ch)
      if (bc) bc.close()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', fire)
    }
  }, [enabled])
}
