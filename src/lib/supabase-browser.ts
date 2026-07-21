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
export const supabaseBrowser = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
