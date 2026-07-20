import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ============================================================
// Server-side admin client (used only inside API routes)
// IMPORTANT: This uses the SERVICE_ROLE_KEY which bypasses RLS.
// Never import this from a client component.
// ============================================================
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

// ============================================================
// نسخة غير مطبوعة — للجداول اللي لسه مش في الأنواع المولّدة
//
// `src/types/supabase.ts` قديم ومافيهوش جداول الواتساب
// (`whatsapp_conversations`, `whatsapp_messages`) ولا الدوال بتاعتها،
// فالعميل المطبوع بيرجّع `never` وأي استعلام عليها بيدّي خطأ نوع.
//
// باقي الكود كان بيحلّها بإنشاء عميل جديد غير مطبوع في كل ملف.
// ده أنضف: نقطة واحدة، والسبب مكتوب.
//
// 🔧 الحل الدائم: إعادة توليد الأنواع
//    npx supabase gen types typescript --project-id mjhflxpxunwycbiquoig > src/types/supabase.ts
//    وبعدها نشيل ده ونستخدم `supabase` عادي.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = supabase as any
