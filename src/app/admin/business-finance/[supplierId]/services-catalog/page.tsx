'use client'
// 🧩 (٩/٩/٢٠٢٦ — آخر الليل) قائمة الخدمات بقت تاب جوّه «المنتجات والخدمات» (بالبابين).
//    الشاشة القديمة كانت بتقرا suppliers بعميل anon → Loader للأبد لصاحب البيزنس («بتعلق»).
//    الكود القديم محفوظ في LegacyServicesCatalog.tsx (مش مربوط بأي مسار).
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ServicesCatalogRedirect({ params }: { params: { supplierId: string } }) {
  const router = useRouter()
  useEffect(() => { router.replace(`/admin/business-finance/${params.supplierId}/products?tab=services`) }, [router, params.supplierId])
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>
}
