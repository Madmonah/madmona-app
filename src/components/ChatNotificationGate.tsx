'use client'

import { useCallback, useEffect } from 'react'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
} from '@/lib/push-subscription'
import { supabaseBrowser } from '@/lib/supabase-browser'

// مشترك صامت لشات مضمونة (اتفق عليه محمد 26 يوليو: «لمسة المحادثة أفضل حاجة»).
//
// قبل كده كان ده بوابة إجبارية بتحاصر المستخدم بشاشة كاملة لحد ما يفعّل الإشعارات.
// اتشالت الشاشة الإجبارية بالكامل — التفعيل بقى بيحصل تلقائي أول ما المستخدم يفتح
// محادثة المارد أو أي جروب (لمسة الفتح = user gesture صالح للمتصفح).
//
// الكومبوننت ده بقى مسؤول عن حاجة واحدة بس: لو الإذن ممنوح بالفعل (أدمن أو مستخدم
// وافق قبل كده) بس الاشتراك مش متسجّل في الداتابيز، يسجّله بصمت — من غير أي UI.
// ده بيضمن إن إشعارات الأدمن على رد المارد تفضل شغّالة على أي جهاز يفتح الشات.
// مايعرضش أي شاشة أبدًا. مايطلبش إذن من مستخدم لسه ماوافقش. مايحاصرش حد.

export default function ChatNotificationGate() {
  const ensureSubscribed = useCallback(async () => {
    if (!isPushSupported()) return
    if (getNotificationPermission() !== 'granted') return // مانطلبش إذن — ده شغل «لمسة المحادثة»
    try {
      if (await isSubscribed()) return // متسجّل بالفعل
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) return // محتاج دخول عشان نربط الاشتراك — نسيبه لحد ما يسجّل
      await subscribeToPush() // اشتراك صامت — مفيش UI
    } catch { /* non-blocking */ }
  }, [])

  useEffect(() => { void ensureSubscribed() }, [ensureSubscribed])

  return null // مفيش UI إطلاقًا
}
