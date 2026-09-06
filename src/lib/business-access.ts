import { supabaseBrowser } from './supabase-browser'

/** 🔧 v_business لسه مش في الأنواع المولّدة — عميل غير مقيّد للاستعلامات دي */
type LooseQuery = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: unknown) => {
        limit: (n: number) => { maybeSingle: () => Promise<{ data: unknown }> }
        maybeSingle: () => Promise<{ data: unknown }>
      }
    }
  }
}
const db = supabaseBrowser as unknown as LooseQuery

/* ============================================================================
   business-access — باب واحد للسؤال: أنا مين، وأقدر أعمل إيه؟
   ============================================================================
   🏛️ (٢٨ أغسطس ٢٠٢٦) قرار معماري من محمد:
      «أي مورد هو في الآخر ليه نظام إدارة، فتاب الإعلانات عايزنها تبقى
       B2B وجوّاها تاب المنتجات أو الخدمات أو الإيجارات اللي بتسمع في
       الماركتبليس. اللي بيضيف إعلان كمورد لازم يكون عنده نافذة ERP
       حسب نشاطه».

   المشكلة اللي بيحلها:
     كان فيه **جدولين موردين بنفس الـid** — `suppliers` (البيانات
     التشغيلية) و`marketplace_suppliers` (التوثيق والتقييمات).
     كل شاشة كانت بتسأل جدول مختلف، فنفس المورد كان بيظهر مرتين:
     واحد بصلاحيات وواحد من غير — وده اللي محمد شافه مع تيكوود.

   الحل: **مصدر واحد للحقيقة** — `v_business` بتجمع الجدولين في صف
   واحد، والتابات بتتحدد أوتوماتيك من نشاط البيزنس الفعلي.
   ============================================================================ */

/** أنشطة البيزنس — بتحدد تابات نافذة الإدارة */
export type BusinessTrack = 'sales' | 'rentals' | 'products' | 'restaurants' | 'services'

export type Business = {
  id: string
  business_name: string
  logo_url: string | null
  cover_url: string | null
  commission_rate: number
  owner_id: string | null
  contact_phone: string | null
  city: string | null
  status: string | null
  kyc_status: string | null
  account_type: string | null
  has_erp: boolean
  is_platform_owner: boolean
  rating: number | null
  listings_count: number | null
  bookings_count: number | null
  /** 🌍 (٦/٩/٢٠٢٦) دولة/عملة البيزنس من v_business — أي سعر في شاشات ERP بيتطبع بيها */
  country: string | null
  currency: string | null
  /** 🎯 الأنشطة الفعلية — كل واحد بيفتح تاب في نافذة الإدارة */
  tracks: BusinessTrack[]
}

export type BusinessAccess = {
  business: Business | null
  mode: 'owner' | 'staff' | 'admin' | 'none'
  roleLabel: string | null
  canEdit: boolean
}

const DENIED: BusinessAccess = { business: null, mode: 'none', roleLabel: null, canEdit: false }

/** أسماء التابات بالعربي — نفس ترتيب أهميتها للمورد */
export const TRACK_LABELS: Record<BusinessTrack, string> = {
  products: 'المنتجات',
  services: 'الخدمات',
  rentals: 'الإيجارات',
  restaurants: 'المنيو والطلبات',
  sales: 'البيع',
}

/**
 * بيرجّع البيزنس بتاع اليوزر الحالي + صلاحيته عليه.
 *
 * @param preferId لو الصفحة عارفة البيزنس (مثلاً من الإعلان نفسه)
 *                 بنسأل عليه هو بالذات — بيحل حالة اللي شغّال في أكتر
 *                 من بيزنس.
 */
export async function resolveBusiness(preferId?: string | null): Promise<BusinessAccess> {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  if (!session?.user) return DENIED
  const uid = session.user.id

  // ① لو عارفين البيزنس — نسأل الداتابيز على صلاحيته مباشرة
  if (preferId) {
    const canEdit = await canEditBusiness(preferId)
    if (!canEdit) return DENIED
    const biz = await fetchBusiness(preferId)
    if (!biz) return DENIED
    return {
      business: biz,
      mode: biz.owner_id === uid ? 'owner' : 'staff',
      roleLabel: null,
      canEdit: true,
    }
  }

  // ② بيزنس اليوزر كمالك
  const { data: owned } = await db
    .from('v_business').select('*').eq('owner_id', uid).limit(1).maybeSingle()
  if (owned) {
    return { business: owned as unknown as Business, mode: 'owner', roleLabel: null, canEdit: true }
  }

  // ③ موظف — نسأل الدالة اللي الـRLS بتستخدمها (بتغطي supplier_staff
  //    و business_employees مع بعض)
  const { data: staffRow } = await supabaseBrowser
    .from('supplier_staff')
    .select('supplier_id, role_label')
    .eq('profile_id', uid).eq('is_active', true).limit(1).maybeSingle()
  const staffBizId = (staffRow as { supplier_id?: string } | null)?.supplier_id
  if (staffBizId && await canEditBusiness(staffBizId)) {
    const biz = await fetchBusiness(staffBizId)
    if (biz) {
      return {
        business: biz, mode: 'staff',
        roleLabel: (staffRow as { role_label?: string } | null)?.role_label ?? null,
        canEdit: true,
      }
    }
  }
  return DENIED
}

/** بيسأل الداتابيز مباشرة — نفس الدالة اللي الـRLS بتستخدمها */
export async function canEditBusiness(businessId: string): Promise<boolean> {
  if (!businessId) return false
  try {
    const { data } = await (supabaseBrowser.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>)('can_edit_supplier_listings', {
      p_supplier_id: businessId,
    })
    return data === true
  } catch {
    return false
  }
}

async function fetchBusiness(id: string): Promise<Business | null> {
  const { data } = await db.from('v_business').select('*').eq('id', id).maybeSingle()
  return (data as unknown as Business) ?? null
}
