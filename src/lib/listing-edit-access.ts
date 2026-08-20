import { supabaseBrowser } from './supabase-browser'

/* ============================================================================
   listing-edit-access — باب واحد للسؤال: أقدر أعدّل إعلانات البيزنس ده؟
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد: «أحمد سامي والموظفين لازم يدخلوا على شاشة
      المنتجات والبورصة وأي خدمة ويقدروا يعدّلوا فيها».

   المشكلة اللي بيحلها:
     كان في **تلات أنظمة صلاحيات مامتكلّمينش مع بعض**:
       ① `supplier_staff`            → اللي بتقراه صفحات /supplier/**
       ② `business_employees.permissions` → اللي بيتكتب من تاب الصلاحيات
       ③ `owns_supplier()` في الـRLS   → اللي بيقرر الحفظ ينفع ولا لأ

     كل صفحة كانت بتعمل الفحص بنفسها بالإيد، وكلها كانت بتسأل
     `supplier_staff` بس. فموظف مضمونة اللي صلاحياته متسجّلة في
     `business_employees` كان بيتقفل في وشّه، أو — الأسوأ — يعدّي الفحص
     ويحفظ ومايتحفظش حاجة لأن الـRLS رفضته في صمت.

   دلوقتي السؤال بيتسأل مرة واحدة، وفي **الداتابيز** — نفس الدالة بالظبط
   اللي الـRLS بتستخدمها (`can_edit_supplier_listings`). يعني اللي الواجهة
   بتقوله هو اللي الحفظ هيعمله، من غير مفاجآت.
   ============================================================================ */

export type ListingEditAccess = {
  allowed: boolean
  supplierId: string | null
  mode: 'owner' | 'staff' | 'none'
  roleLabel: string | null
}

const DENIED: ListingEditAccess = {
  allowed: false, supplierId: null, mode: 'none', roleLabel: null,
}

/** بيسأل الداتابيز مباشرة: أقدر أعدّل إعلانات البيزنس ده؟ */
export async function canEditListings(supplierId: string): Promise<boolean> {
  if (!supplierId) return false
  try {
    const { data } = await (supabaseBrowser.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>)('can_edit_supplier_listings', {
      p_supplier_id: supplierId,
    })
    return data === true
  } catch (e) {
    console.error('[listing-access] can_edit_supplier_listings failed:', e)
    return false
  }
}

/**
 * بيلاقي البيزنس اللي اليوزر ده بيشتغل عليه، ويقول له إيه حقه فيه.
 *
 * @param preferSupplierId لو الصفحة عارفة البيزنس (مثلاً من الإعلان نفسه)
 *                        بنسأل عليه هو بالذات — ده بيحل مشكلة الموظف
 *                        اللي شغّال في أكتر من بيزنس، وكان `maybeSingle()`
 *                        بيرمي خطأ ويقفله في **كل** البيزنس.
 */
export async function resolveListingAccess(
  preferSupplierId?: string | null,
): Promise<ListingEditAccess> {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  if (!session?.user) return DENIED
  const uid = session.user.id

  // ① لو عارفين البيزنس — نسأل عليه على طول
  if (preferSupplierId) {
    if (!(await canEditListings(preferSupplierId))) return DENIED
    const { data: owned } = await supabaseBrowser
      .from('marketplace_suppliers').select('id')
      .eq('id', preferSupplierId).eq('profile_id', uid).maybeSingle()
    let roleLabel: string | null = null
    if (!owned) {
      const { data: st } = await supabaseBrowser
        .from('supplier_staff').select('role_label')
        .eq('supplier_id', preferSupplierId).eq('profile_id', uid)
        .eq('is_active', true).maybeSingle()
      roleLabel = (st as { role_label?: string } | null)?.role_label ?? null
    }
    return {
      allowed: true,
      supplierId: preferSupplierId,
      mode: owned ? 'owner' : 'staff',
      roleLabel,
    }
  }

  // ② مش عارفين — نلاقي بيزنسه: مالك الأول
  const { data: owned } = await supabaseBrowser
    .from('marketplace_suppliers').select('id')
    .eq('profile_id', uid).limit(1).maybeSingle()
  if (owned?.id) {
    return { allowed: true, supplierId: owned.id, mode: 'owner', roleLabel: null }
  }

  // ③ موظف ماركتبليس — ⚠️ `limit(1)` مش `maybeSingle()` من غير فلتر،
  //    عشان اللي شغّال في أكتر من بيزنس مايتقفلش في كله
  const { data: staff } = await supabaseBrowser
    .from('supplier_staff')
    .select('supplier_id, role_label')
    .eq('profile_id', uid).eq('is_active', true)
    .limit(1).maybeSingle()
  if (staff?.supplier_id && await canEditListings(staff.supplier_id)) {
    return {
      allowed: true, supplierId: staff.supplier_id, mode: 'staff',
      roleLabel: (staff as { role_label?: string }).role_label ?? null,
    }
  }

  // ④ موظف شركة (business_employees) — الحالة اللي كانت ضايعة خالص
  const { data: ws } = await (supabaseBrowser.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: { memberships?: { supplier_id: string; role_ar: string | null }[] } | null }>)(
    'get_my_workspace')
  for (const m of ws?.memberships ?? []) {
    if (await canEditListings(m.supplier_id)) {
      return {
        allowed: true, supplierId: m.supplier_id, mode: 'staff',
        roleLabel: m.role_ar ?? null,
      }
    }
  }

  return DENIED
}
