'use client'
// ============================================================================
// 🧩 SupplierModulesInline — موديولات نظام إدارة البيزنس في قايمة الموبايل
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «راجع التابات بتاعت نظام إدارة بيزنسك وانقلها
//   برّه أول ما تدوس على الـ٣ شرط الي فوق على الشمال في نسخة الموبايل،
//   مع تابات حسابي وضيف المنتج والتوظيف».
//
// 🎯 المورد كان لازم يدخل «حسابي» → «نظام الإدارة» → يختار الموديول.
//    دلوقتي الموديولات بتبان **على طول في القايمة** — نقرة واحدة بدل تلاتة.
//
// 🔒 وبتقرا من business_modules() — نفس مصدر /supplier/erp، فكل مورد
//    يشوف موديولاته هو حسب نشاطه. والزائر العادي مايشوفش حاجة.
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  LayoutGrid, Package, Boxes, ShoppingCart, CalendarDays, Star, Users,
  Wallet, UtensilsCrossed, KeyRound, Factory, Workflow, Warehouse,
  Building2, Wrench, ClipboardList, ChevronLeft, Tag,
} from 'lucide-react'

type Mod = { key: string; label: string; href: string; icon: React.ElementType }

/** 🗂️ خريطة الموديولات — نفس أسماء business_modules() */
const MAP: Record<string, Omit<Mod, 'key'>> = {
  listings:         { label: 'إعلاناتي',      href: '/supplier/erp/listings',   icon: LayoutGrid },
  projects:         { label: 'مشاريعي',       href: '/supplier/erp/projects',   icon: Building2 },
  products:         { label: 'منتجاتي',       href: '/supplier/erp/products',   icon: Package },
  materials:        { label: 'الخامات',       href: '/supplier/erp/materials',  icon: Boxes },
  inventory:        { label: 'المخزون',       href: '/supplier/erp/inventory',  icon: Warehouse },
  catalog:          { label: 'الكتالوج',      href: '/supplier/erp/catalog',    icon: Tag },
  orders:           { label: 'الطلبات',       href: '/supplier/erp/orders',     icon: ShoppingCart },
  bookings:         { label: 'الحجوزات',      href: '/supplier/erp/bookings',   icon: CalendarDays },
  reviews:          { label: 'التقييمات',     href: '/supplier/erp/reviews',    icon: Star },
  crm:              { label: 'العملاء',       href: '/supplier/erp/crm',        icon: Users },
  team:             { label: 'الفريق',        href: '/supplier/erp/team',       icon: Users },
  accounting:       { label: 'الحسابات',      href: '/supplier/erp/accounting', icon: Wallet },
  menu:             { label: 'المنيو',        href: '/supplier/erp/menu',       icon: UtensilsCrossed },
  tables:           { label: 'الطاولات',      href: '/supplier/erp/tables',     icon: UtensilsCrossed },
  kitchen:          { label: 'المطبخ',        href: '/supplier/erp/kitchen',    icon: UtensilsCrossed },
  units:            { label: 'الوحدات',       href: '/supplier/erp/units',      icon: KeyRound },
  contracts:        { label: 'العقود',        href: '/supplier/erp/contracts',  icon: ClipboardList },
  maintenance:      { label: 'الصيانة',       href: '/supplier/erp/maintenance', icon: Wrench },
  production:       { label: 'أوامر التشغيل', href: '/supplier/erp/production', icon: Factory },
  stages:           { label: 'المراحل',       href: '/supplier/erp/stages',     icon: Workflow },
  services_catalog: { label: 'خدماتي',        href: '/supplier/erp/services',   icon: Wrench },
  schedule:         { label: 'المواعيد',      href: '/supplier/erp/schedule',   icon: CalendarDays },
  leads:            { label: 'الليدز',        href: '/supplier/erp/leads',      icon: Users },
}

export default function SupplierModulesInline({ onNavigate }: { onNavigate?: () => void }) {
  const [mods, setMods] = useState<Mod[]>([])
  const [bizName, setBizName] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return

        const { data: sup } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { limit: (n: number) => Promise<{ data: unknown }> } } }
        }).from('marketplace_suppliers').select('id, business_name')
          .eq('profile_id', session.user.id).limit(1)

        const s = (sup as { id: string; business_name: string }[])?.[0]
        if (!s || !alive) return
        setBizName(s.business_name)

        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: s.id })

        const keys = ((data as { modules?: string[] })?.modules) || []
        if (!alive) return
        setMods(keys.filter((k) => MAP[k]).map((k) => ({ key: k, ...MAP[k] })))
      } catch { /* مش مورد — الكارت بيخفي نفسه */ }
    })()
    return () => { alive = false }
  }, [])

  // 🙈 مش مورد؟ مايظهرش حاجة
  if (mods.length === 0) return null

  return (
    <div className="pt-2 mt-2 border-t border-gray-100">
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          نظام إدارة {bizName || 'بيزنسك'}
        </p>
        <Link href="/supplier/erp" onClick={onNavigate}
          className="text-[10.5px] font-bold text-[#059669] flex items-center gap-0.5 no-underline">
          الكل <ChevronLeft className="w-3 h-3" />
        </Link>
      </div>

      {/* 🔲 شبكة — أسرع في الوصول من قايمة طويلة */}
      <div className="grid grid-cols-3 gap-1.5 px-1">
        {mods.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.key} href={m.href} onClick={onNavigate}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-[#FAFAF7] no-underline">
              <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#059669]" />
              </div>
              <span className="text-[10.5px] font-bold text-gray-700 text-center leading-tight">
                {m.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
