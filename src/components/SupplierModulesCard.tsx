'use client'
// ============================================================================
// 🧩 SupplierModulesCard — تابات لوحة المورد جوّه «حسابي»
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز التابات اللي في لوحة التحكم لأي مورد
//   تكون هي اللي ظاهرة في الهوم بتاع تاب حسابي».
//
// 🐞 المشكلة: القايمة في /account كانت **ثابتة في الكود** — كل مورد
//    بيشوف نفس ٦ روابط، ومفيهاش الموديولات اللي اتبنت (منتجاتي ·
//    المواد · العملاء · الكتالوج · أوامر التشغيل).
//
// ✅ دلوقتي بتقرا من `business_modules()` — نفس مصدر /supplier/erp،
//    فالمورد يشوف تاباته هو حسب نشاطه، والقايمة بتتحدّث لوحدها لما
//    نضيف موديول جديد.
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  LayoutGrid, Package, Wrench, Store, ShoppingBag, CalendarDays, Star,
  Users, Wallet, Factory, Boxes, UtensilsCrossed, KeyRound, Tag,
  ClipboardCheck, ShieldCheck, ChevronLeft, Loader2, Building2,
} from 'lucide-react'

type Mod = { label: string; sub: string; href: string; icon: typeof Package; bg: string }

/** 🧩 خريطة الموديول → شكله في «حسابي» */
const MAP: Record<string, Mod> = {
  listings:   { label: 'إعلاناتي', sub: 'كل الإعلانات — إضافة وتعديل', href: '/supplier/marketplace', icon: LayoutGrid, bg: 'bg-[#34D399]/10 text-[#059669]' },
  projects:   { label: 'مشاريعي', sub: 'مشاريعك في البورصة — السداد والتسليم', href: '/supplier/erp/projects', icon: Building2, bg: 'bg-cyan-50 text-cyan-700' },
  products:   { label: 'منتجاتي', sub: 'المصدر — تعدّل هنا فيتغيّر في الماركت بليس', href: '/supplier/erp/products', icon: Package, bg: 'bg-emerald-50 text-emerald-600' },
  materials:  { label: 'المواد والأدوات', sub: 'مخزونك الداخلي وحد إعادة الطلب', href: '/supplier/erp/materials', icon: Wrench, bg: 'bg-amber-50 text-amber-600' },
  catalog:    { label: 'العرض في الماركت بليس', sub: 'إيه اللي يشوفه العملاء', href: '/supplier/erp/catalog', icon: Store, bg: 'bg-teal-50 text-teal-600' },
  orders:     { label: 'الطلبات', sub: 'الطلبات الجديدة والجارية', href: '/supplier/marketplace/orders', icon: ShoppingBag, bg: 'bg-blue-50 text-blue-600' },
  bookings:   { label: 'الحجوزات', sub: 'المواعيد والحجوزات', href: '/supplier/marketplace/bookings', icon: CalendarDays, bg: 'bg-indigo-50 text-indigo-600' },
  reviews:    { label: 'التقييمات', sub: 'آراء العملاء', href: '/supplier/marketplace/reviews', icon: Star, bg: 'bg-yellow-50 text-yellow-600' },
  crm:        { label: 'عملائي', sub: 'العملاء وتعاملاتهم معاك', href: '/supplier/erp/crm', icon: Users, bg: 'bg-purple-50 text-purple-600' },
  team:       { label: 'الفريق', sub: 'الموظفين وصلاحياتهم', href: '/supplier/team', icon: Users, bg: 'bg-sky-50 text-sky-600' },
  accounting: { label: 'الحسابات', sub: 'الإيرادات والمستحقات', href: '/supplier/erp/accounting', icon: Wallet, bg: 'bg-gray-100 text-gray-700' },
  production: { label: 'أوامر التشغيل', sub: 'الأوامر الجارية ومراحلها', href: '/supplier/erp/production', icon: Factory, bg: 'bg-orange-50 text-orange-600' },
  stages:     { label: 'مراحل الإنتاج', sub: 'تتبّع الشغل جوّه المصنع', href: '/supplier/erp/production', icon: Factory, bg: 'bg-orange-50 text-orange-600' },
  inventory:  { label: 'المخزون', sub: 'الجاهز للبيع', href: '/supplier/erp/products', icon: Boxes, bg: 'bg-lime-50 text-lime-700' },
  batches:    { label: 'التشغيلات والصلاحية', sub: 'أرقام التشغيل وتواريخ الانتهاء', href: '/supplier/erp/production', icon: ClipboardCheck, bg: 'bg-rose-50 text-rose-600' },
  quality_control: { label: 'مراقبة الجودة', sub: 'فحص التشغيلات', href: '/supplier/erp/production', icon: ShieldCheck, bg: 'bg-rose-50 text-rose-600' },
  menu:       { label: 'منيو المطعم', sub: 'الأصناف والأسعار', href: '/supplier/dashboard', icon: UtensilsCrossed, bg: 'bg-orange-50 text-orange-600' },
  units:      { label: 'الوحدات', sub: 'المتاح والمؤجّر', href: '/supplier/bookings', icon: KeyRound, bg: 'bg-cyan-50 text-cyan-600' },
  services_catalog: { label: 'الخدمات', sub: 'الخدمات وأسعارها', href: '/supplier/erp/catalog', icon: Tag, bg: 'bg-violet-50 text-violet-600' },
}

/** الترتيب: الأهم يوميًا الأول */
const ORDER = ['listings', 'projects', 'products', 'catalog', 'menu', 'orders', 'bookings',
  'production', 'materials', 'inventory', 'batches', 'quality_control',
  'units', 'services_catalog', 'crm', 'reviews', 'team', 'accounting']

export default function SupplierModulesCard({ supplierId }: { supplierId: string }) {
  const [mods, setMods] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: supplierId })
        if (!alive) return
        const m = (data as { modules?: string[] })?.modules || []
        setMods([...new Set(m)])
      } catch { /* الافتراضي تحت */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [supplierId])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" />
      </div>
    )
  }

  const list = (mods.length ? mods : ['listings', 'orders', 'bookings', 'team'])
    .filter((k) => MAP[k])
  const sorted = [...new Set(list)].sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  return (
    <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          نظام إدارة بيزنسك
        </p>
        <Link href="/supplier/erp" className="text-[11px] font-bold text-[#059669]">
          الكل
        </Link>
      </div>
      {sorted.map((k, i) => {
        const m = MAP[k]
        return (
          <div key={k}>
            {i > 0 && <div className="h-px bg-gray-100 mx-6" />}
            <Link href={m.href} className="flex items-center gap-3 px-6 py-3.5 active:bg-gray-50">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.bg}`}>
                <m.icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{m.label}</p>
                <p className="text-[11px] text-gray-500 truncate">{m.sub}</p>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          </div>
        )
      })}
    </div>
  )
}
