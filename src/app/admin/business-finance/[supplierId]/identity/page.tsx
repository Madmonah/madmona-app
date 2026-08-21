'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import IdentityTab from '@/components/business/IdentityTab'

/* ============================================================================
   /admin/business-finance/[supplierId]/identity — هوية البيزنس
   ============================================================================
   🎯 (٢١ أغسطس ٢٠٢٦) محمد: «لو مش موجود ليها تاب في الداشبورد ضيفها».

   نفس المحتوى اللي في «إعدادات ← الهوية»، بس كتاب مستقل في لوحة الإدارة
   عشان يتلاقى من غير ما حد يدوّر جوّه الإعدادات. المكوّن واحد —
   `components/business/IdentityTab` — فمفيش نسختين يتفرقوا مع الوقت.
   ============================================================================ */

export default function BusinessIdentityPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Cairo, Inter, system-ui, sans-serif' }}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/admin/business-finance/${supplierId}`}
            className="w-9 h-9 rounded-full bg-[#FAFAF7] border border-gray-100 grid place-items-center">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669]">IDENTITY</p>
            <h1 className="text-xl md:text-2xl font-black text-[#1A2E26]">هوية البيزنس</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              اللوجو والغلاف والوصف ومعرض الصور والألوان — ده اللي العميل بيشوفه أول ما يفتح صفحتك.
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <IdentityTab supplierId={supplierId} />
      </main>
    </div>
  )
}
