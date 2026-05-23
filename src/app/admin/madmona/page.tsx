import { redirect } from 'next/navigation'

/* ============================================================
   /admin/madmona — مضمونة company management front door

   مضمونة (the company itself) runs on the SAME comprehensive
   management dashboard that powers B2B partners, keyed by its
   own supplier id. This route is just a clean, memorable entry
   point into that full hub:
     الفريق · الحضور · المرتبات · المصاريف · المناوبات ·
     الفروع · جرد الكاش · طلبات الشراء · الموردين · التقارير · VAT
   ============================================================ */

const MADMONA_SUPPLIER_ID = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

export default function MadmonaManagementHQ() {
  redirect(`/admin/business-finance/${MADMONA_SUPPLIER_ID}`)
}
