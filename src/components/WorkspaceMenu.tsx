'use client'
// ============================================================================
// 🎛️ WorkspaceMenu — لوحة تحكم واحدة في قايمة الـ٣ شرط
//
// (٢٨ أغسطس ٢٠٢٦) محمد:
//   «لوحة التحكم المحطوطة دي خاصة بالبيزنس اللي B2B واللي مربوط
//    بالأكونت واللي بيتم عرض المنتج أو الخدمة بتاعتهم في الماركت بليس.
//    ليه بقى بيظهر ليا تاب صيانة وده برّه الموديل؟ ومش عارف شايف تاب
//    تاني مكتوب عليه نظام إدارة بيزنسك مع إنك عارف إني أدمن منصة
//    مضمونة… وحتى أنا لو صاحب بيزنس B2B مش هيظهر ليا ٢ لوحة تحكم
//    مفصولين عن بعض. أنا عايز أدمج نظام الB2B بالماركت بليس بتاع
//    مضمونة وبورصة العقارات — مش عايز كل واحد فيهم في اتجاه.
//    ولوحة الإدارة الكاملة سواء لمضمونة أو صاحب البيزنس تظهر في
//    التاب اللي فيها ٣ شرط».
//
// 🐞 اللي كان غلط:
//   ① **لوحتين منفصلتين**: «لوحة الإدارة» + «نظام إدارة بيزنسك»
//   ② **الموديولات بتظهر للكل** من غير شرط
//   ③ **«صيانة» بتظهر لمضمونة** لأن حسابها متسجّل `model: rentals`
//      — ومضمونة **منصة** مش شركة إيجارات
//
// ✅ الحل: **لوحة واحدة**، محتواها بيتحدد من مين أنت:
//   · أدمن مضمونة → لوحة المنصة (كل النظام)
//   · صاحب بيزنس  → موديولات نشاطه هو
//   · زائر         → مايشوفش حاجة
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  LayoutDashboard, LayoutGrid, Package, Boxes, ShoppingCart, CalendarDays,
  Star, Users, Wallet, UtensilsCrossed, KeyRound, Factory, Workflow,
  Warehouse, Building2, Wrench, ClipboardList, ChevronLeft, Tag, Megaphone,
} from 'lucide-react'

type Mod = { key: string; label: string; href: string; icon: React.ElementType }

/** 🗂️ موديولات البيزنس — نفس أسماء business_modules() */
const BUSINESS: Record<string, Omit<Mod, 'key'>> = {
  listings:         { label: 'إعلاناتي',      href: '/supplier/erp/listings',    icon: LayoutGrid },
  projects:         { label: 'مشاريعي',       href: '/supplier/erp/projects',    icon: Building2 },
  products:         { label: 'منتجاتي',       href: '/supplier/erp/products',    icon: Package },
  materials:        { label: 'الخامات',       href: '/supplier/erp/materials',   icon: Boxes },
  inventory:        { label: 'المخزون',       href: '/supplier/erp/inventory',   icon: Warehouse },
  catalog:          { label: 'الكتالوج',      href: '/supplier/erp/catalog',     icon: Tag },
  orders:           { label: 'الطلبات',       href: '/supplier/erp/orders',      icon: ShoppingCart },
  bookings:         { label: 'الحجوزات',      href: '/supplier/erp/bookings',    icon: CalendarDays },
  reviews:          { label: 'التقييمات',     href: '/supplier/erp/reviews',     icon: Star },
  crm:              { label: 'عملائي',        href: '/supplier/erp/crm',         icon: Users },
  team:             { label: 'فريقي',         href: '/supplier/erp/team',        icon: Users },
  accounting:       { label: 'حساباتي',       href: '/supplier/erp/accounting',  icon: Wallet },
  menu:             { label: 'المنيو',        href: '/supplier/erp/menu',        icon: UtensilsCrossed },
  tables:           { label: 'الطاولات',      href: '/supplier/erp/tables',      icon: UtensilsCrossed },
  kitchen:          { label: 'المطبخ',        href: '/supplier/erp/kitchen',     icon: UtensilsCrossed },
  units:            { label: 'الوحدات',       href: '/supplier/erp/units',       icon: KeyRound },
  contracts:        { label: 'العقود',        href: '/supplier/erp/contracts',   icon: ClipboardList },
  maintenance:      { label: 'الصيانة',       href: '/supplier/erp/maintenance', icon: Wrench },
  production:       { label: 'أوامر التشغيل', href: '/supplier/erp/production',  icon: Factory },
  stages:           { label: 'المراحل',       href: '/supplier/erp/stages',      icon: Workflow },
  services_catalog: { label: 'خدماتي',        href: '/supplier/erp/services',    icon: Wrench },
  schedule:         { label: 'المواعيد',      href: '/supplier/erp/schedule',    icon: CalendarDays },
  leads:            { label: 'الليدز',        href: '/supplier/erp/leads',       icon: Users },
}

/** 🏛️ لوحة مضمونة — المنصة كلها في مكان واحد */
const PLATFORM: Mod[] = [
  { key: 'admin',     label: 'الإدارة',       href: '/admin',                  icon: LayoutDashboard },
  { key: 'listings',  label: 'الإعلانات',     href: '/admin/listings',         icon: LayoutGrid },
  { key: 'bourse',    label: 'البورصة',       href: '/real-estate/market',     icon: Building2 },
  { key: 'demand',    label: 'طلبات لايف',    href: '/real-estate/requests',   icon: Megaphone },
  { key: 'suppliers', label: 'الموردين',      href: '/admin/suppliers',        icon: Users },
  { key: 'team',      label: 'الفريق',        href: '/admin/team',             icon: Users },
  { key: 'crm',       label: 'مكالماتي',      href: '/crm',                    icon: Users },
  { key: 'finance',   label: 'الحسابات',      href: '/admin/business-finance', icon: Wallet },
]

export default function WorkspaceMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [mods, setMods] = useState<Mod[]>([])
  const [title, setTitle] = useState('')
  const [href, setHref] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return

        // 🏛️ أدمن مضمونة؟ → لوحة المنصة
        const { data: staff } = await (supabaseBrowser.rpc as unknown as (
          f: string,
        ) => Promise<{ data: unknown }>)('is_madmona_staff')

        if (staff === true) {
          if (!alive) return
          setTitle('لوحة مضمونة')
          setHref('/admin')
          setMods(PLATFORM)
          return
        }

        // 🏪 صاحب بيزنس؟ → موديولات نشاطه هو
        const { data: sup } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { limit: (n: number) => Promise<{ data: unknown }> } } }
        }).from('marketplace_suppliers').select('id, business_name')
          .eq('profile_id', session.user.id).limit(1)

        const s = (sup as { id: string; business_name: string }[])?.[0]
        if (!s || !alive) return

        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: s.id })

        const keys = ((data as { modules?: string[] })?.modules) || []
        if (!alive) return
        setTitle(s.business_name || 'بيزنسي')
        setHref('/supplier/erp')
        setMods(keys.filter((k) => BUSINESS[k]).map((k) => ({ key: k, ...BUSINESS[k] })))
      } catch { /* مش مسجّل — مايظهرش حاجة */ }
    })()
    return () => { alive = false }
  }, [])

  // 🙈 زائر عادي؟ مايشوفش حاجة
  if (mods.length === 0) return null

  return (
    <div className="pt-3 mt-2 border-t border-gray-100">
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          {title}
        </p>
        <Link href={href} onClick={onNavigate}
          className="text-[10.5px] font-bold text-[#059669] flex items-center gap-0.5 no-underline">
          الكل <ChevronLeft className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-1 px-1">
        {mods.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.key} href={m.href} onClick={onNavigate}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#FAFAF7] no-underline">
              <div className="w-9 h-9 rounded-xl bg-[#34D399]/12 flex items-center justify-center">
                <Icon className="w-[17px] h-[17px] text-[#059669]" />
              </div>
              <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">
                {m.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
