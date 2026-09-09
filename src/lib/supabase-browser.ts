import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { safeStorage } from '@/lib/safe-storage'

// ============================================================
// Browser-side Supabase client (uses ANON key, respects RLS)
// Use this in client components for user-authenticated queries.
//
// ⚠️ التخزين لازم يعدّي على safeStorage.
//
// العميل ده بيتعمل وقت تحميل الموديول، وبيتحمّل في كل صفحة.
// سفاري في التصفح الخاص بيرمي SecurityError لما تلمس
// localStorage — فلو supabase-js لمسها وهو بيتبني، الموديول
// كله بيقع، وكل مكوّن مستورده بيقع معاه، والماركت بليس بيطلع
// صفحة فاضية. ده اللي محمد كان شايفه.
//
// الغلاف بيرجّع null بدل ما يرمي — يبقى المستخدم مش مسجّل
// دخول، بس الصفحة بتترسم.
// ============================================================
// 🔒 (٩/٩/٢٠٢٦) قفل في الذاكرة بدل navigator.locks.
//    محمد: «تاب حسابي بيلف على الفاضي» على التطبيق المثبّت بس. supabase-js
//    بياخد قفل navigator.locks في getSession/الريفريش، والقفل ده بيعلّق في
//    الـPWA لو تاب/ووركر ميّت ماسكه — فـgetSession() مابترجّعش أبدًا وأي شاشة
//    مستنياها بتلف للأبد. (نفس السبب اللي خلّى financeRpc.ts يبطّل supabase-js
//    يوم ٢٥/٨.) القفل هنا بيسلسل النداءات جوّه نفس الصفحة بس — وده كفاية لأن
//    التخزين عندنا safeStorage/localStorage ومفيش تابات بتتشارك ريفريش.
let madmonaInprocLockChain: Promise<unknown> = Promise.resolve()
const madmonaInprocLock = <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  const run = madmonaInprocLockChain.then(fn, fn)
  madmonaInprocLockChain = run.catch(() => undefined)
  return run
}

export const supabaseBrowser = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: madmonaInprocLock,
      storage: {
        getItem: (key) => safeStorage.get(key),
        setItem: (key, value) => {
          safeStorage.set(key, value)
        },
        removeItem: (key) => safeStorage.remove(key),
      },
    },
  }
)
