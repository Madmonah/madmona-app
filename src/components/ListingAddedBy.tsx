'use client'
// ============================================================================
// 👤 ListingAddedBy — مين ضاف الإعلان (لفريق مضمونة بس)
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز أعرف منين أجيب مين اللي ضاف الإعلان،
//   أنا عايزها تظهر في شاشة الإعلان».
//
// 🔐 الدالة نفسها بترجّع null لغير فريق مضمونة — فحتى لو الكومبوننت
//    اترندر لعميل عادي، مش هيشوف حاجة. الحماية في الداتابيز مش في الواجهة.
// ============================================================================
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { UserCircle2 } from 'lucide-react'

type Info = {
  employee_id: string | null
  employee_name: string | null
  employee_role: string | null
  added_at: string | null
  supplier_added_by: string | null
}

export default function ListingAddedBy({ listingId }: { listingId: string }) {
  const [info, setInfo] = useState<Info | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('listing_added_by', { p_listing_id: listingId })
        if (alive && data) setInfo(data as Info)
      } catch { /* مش فريق مضمونة — مايظهرش حاجة */ }
    })()
    return () => { alive = false }
  }, [listingId])

  // 🔐 مفيش بيانات = مش فريق مضمونة، أو الإعلان مالوش إسناد
  if (!info) return null
  if (!info.employee_name && !info.supplier_added_by) {
    return (
      <div className="rounded-2xl bg-[#F1EEE6] border border-gray-200 p-3 mt-3" dir="rtl">
        <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
          <UserCircle2 className="w-3.5 h-3.5" /> الإعلان ده مالوش موظف مسند
        </p>
        <p className="text-[10.5px] text-gray-400 mt-0.5">
          اتعمل قبل ما نضيف الإسناد — أي إعلان جديد بيتسجّل باسم صاحبه تلقائيًا.
        </p>
      </div>
    )
  }

  const when = info.added_at
    ? new Date(info.added_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="rounded-2xl bg-[#34D399]/10 border border-[#34D399]/30 p-3 mt-3" dir="rtl">
      <p className="text-[11px] font-black text-[#059669] flex items-center gap-1.5 mb-1">
        <UserCircle2 className="w-3.5 h-3.5" /> بيانات الفريق
      </p>
      {info.employee_name && (
        <p className="text-[11.5px] text-gray-800">
          <b>أضاف الإعلان:</b> {info.employee_name}
          {info.employee_role ? ` · ${info.employee_role}` : ''}
          {when ? ` · ${when}` : ''}
        </p>
      )}
      {info.supplier_added_by && (
        <p className="text-[11.5px] text-gray-700 mt-0.5">
          <b>أضاف البيزنس:</b> {info.supplier_added_by}
        </p>
      )}
    </div>
  )
}
