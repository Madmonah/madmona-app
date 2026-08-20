import { supabaseBrowser } from './supabase-browser'

/* ============================================================================
   isPlatformStaff — هل اليوزر ده من شركة مضمونة؟
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «لسه بيكتب لأحمد سامي "للأدمن فقط"!!!!!»
      وقبلها: «أنا عايز الأدمن وموظفين مضمونة يعدّلوا أي إعلان — دول أدمن».

   المشكلة: ٩ صفحات أدمن بتسأل سؤال واحد:
       profiles.role !== 'admin'  →  «الصفحة دي للأدمن فقط»

   وموظفين مضمونة دورهم `business_ops` مش `admin`:
       أحمد سامي · سامية · شهد · عبير  →  كلهم business_ops
       محمد ناصف                        →  admin
   فالأربعة اتقفلت في وشهم رغم إنهم موظفين الشركة اللي بتدير المنصة.

   ⚠️ ليه ماغيّرناش دورهم لـ`admin` وخلاص؟
      عشان `role = 'admin'` بيشغّل دالة `is_admin()` في الداتابيز، ودي
      مستخدمة في **بوليسيهات RLS على طول المنصة** — يعني كنا هنفتح كل
      الجداول لأي حد يتضاف لمضمونة، حتى لو صلاحياته لسه مااتفتحتش
      (زي عبير النهاردة: صفر صلاحيات). وده يناقض «كل واحد بصلاحياته».

   فالسؤال بقى: **أدمن المنصة أو موظف في الشركة الأم** — والصلاحيات
   التفصيلية بتفضل شغّالة زي ما هي جوّه كل تاب.
   ============================================================================ */

export async function isPlatformStaff(): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) return false

    const { data: prof } = await supabaseBrowser
      .from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    if ((prof as { role?: string } | null)?.role === 'admin') return true

    const { data } = await (supabaseBrowser.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: boolean | null }>)('is_madmona_staff')
    return data === true
  } catch (e) {
    console.error('[platform-staff] check failed:', e)
    return false
  }
}
