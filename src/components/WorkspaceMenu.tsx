'use client'
// ============================================================================
// 🎛️ WorkspaceMenu — لوحة تحكم واحدة في قايمة الـ٣ شرط
//
// (١ سبتمبر ٢٠٢٦) البروتوكول — محمد:
//   «في التاب اللي فيه الـ٣ شرط في الموبايل يتحط لوحة التحكم بتاعت
//    الفينانس، وإعلاناته تكون محطوطة كمنتج أو خدمة أو إيجار أو منيو
//    المطعم أو الوحدة لو مطوّر عقاري (في حالة المطوّر ينزل له موديل
//    شركة المقاولات كامل). شيل تاب نظام إدارة بيزنسك من حسابي.
//    وبالنسبة لموديل مضمونة نفس النظام».
//
// 🎯 القاعدة: **الفينانس أولًا** — لكل بيزنس (مضمونة أو مورد أو مطوّر)،
//    وبعدها موديولات نشاطه اللي بتعرض إعلاناته بالشكل المناسب.
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  LayoutDashboard, LayoutGrid, Package, Boxes, ShoppingCart, CalendarDays,
  Star, Users, Wallet, UtensilsCrossed, KeyRound, Factory, Workflow,
  Warehouse, Building2, Wrench, ClipboardList, ChevronLeft, Tag, Megaphone,
  TrendingUp, Receipt, HardHat, Ruler, FileText,
} from 'lucide-react'

type Mod = { key: string; label: string; href: string; icon: React.ElementType }

/** 💰 الفينانس — أول حاجة لكل بيزنس */
// 🔗 (١/٩) الصفحات الموجودة فعلًا: accounting هي الفينانس —
//    الباقي تابات جوّاها بالـhash.
const FINANCE: Mod[] = [
  { key: 'overview',  label: 'الأوفرفيو',  href: '/supplier/erp/accounting',           icon: TrendingUp },
  { key: 'income',    label: 'الإيرادات',  href: '/supplier/erp/accounting#income',    icon: Wallet },
  { key: 'expenses',  label: 'المصروفات',  href: '/supplier/erp/accounting#expenses',  icon: Receipt },
  { key: 'invoices',  label: 'الفواتير',   href: '/supplier/erp/accounting#invoices',  icon: FileText },
]

/** 🗂️ موديولات النشاط — بتعرض الإعلانات بالشكل المناسب لكل مسار */
const BUSINESS: Record<string, Omit<Mod, 'key'>> = {
  // 🛍️ بيع — الإعلانات كمنتجات
  products:         { label: 'منتجاتي',       href: '/supplier/erp/products',    icon: Package },
  inventory:        { label: 'المخزون',       href: '/supplier/erp/products#inventory',   icon: Warehouse },
  catalog:          { label: 'الكتالوج',      href: '/supplier/erp/catalog',     icon: Tag },
  orders:           { label: 'الطلبات',       href: '/supplier/erp/crm#orders',      icon: ShoppingCart },
  // 🔑 إيجار — الإعلانات كوحدات
  units:            { label: 'الوحدات',       href: '/supplier/erp/products#units',       icon: KeyRound },
  bookings:         { label: 'الحجوزات',      href: '/supplier/erp/crm#bookings',    icon: CalendarDays },
  contracts:        { label: 'العقود',        href: '/supplier/erp/crm#contracts',   icon: ClipboardList },
  maintenance:      { label: 'الصيانة',       href: '/supplier/erp/products#maintenance', icon: Wrench },
  // 💇 خدمات — الإعلانات كخدمات
  services_catalog: { label: 'خدماتي',        href: '/supplier/erp/catalog',    icon: Wrench },
  schedule:         { label: 'المواعيد',      href: '/supplier/erp/crm#schedule',    icon: CalendarDays },
  // 🍽️ مطاعم — الإعلانات كمنيو
  menu:             { label: 'المنيو',        href: '/supplier/erp/catalog',        icon: UtensilsCrossed },
  tables:           { label: 'الطاولات',      href: '/supplier/erp/catalog#tables',      icon: UtensilsCrossed },
  kitchen:          { label: 'المطبخ',        href: '/supplier/erp/production',     icon: UtensilsCrossed },
  // 🏗️ مطوّر — موديل المقاولات كامل
  projects:         { label: 'مشاريعي',       href: '/supplier/erp/projects',    icon: Building2 },
  stages:           { label: 'مراحل التنفيذ', href: '/supplier/erp/production',      icon: Workflow },
  materials:        { label: 'الخامات',       href: '/supplier/erp/materials',   icon: Boxes },
  production:       { label: 'أوامر التشغيل', href: '/supplier/erp/production',  icon: Factory },
  contractors:      { label: 'المقاولين',     href: '/supplier/erp/projects#contractors', icon: HardHat },
  surveys:          { label: 'المساحات',      href: '/supplier/erp/projects#surveys',     icon: Ruler },
  // 👥 مشترك
  listings:         { label: 'إعلاناتي',      href: '/supplier/erp/products',    icon: LayoutGrid },
  crm:              { label: 'عملائي',        href: '/supplier/erp/crm',         icon: Users },
  leads:            { label: 'الليدز',        href: '/supplier/erp/crm#leads',       icon: Users },
  team:             { label: 'فريقي',         href: '/supplier/erp/crm#team',        icon: Users },
  reviews:          { label: 'التقييمات',     href: '/supplier/erp/crm#reviews',     icon: Star },
}

/** 🏗️ موديل المقاولات الكامل للمطوّر */
const DEVELOPER_MODULES = [
  'projects', 'stages', 'materials', 'production', 'contractors', 'surveys',
  'units', 'contracts', 'listings', 'crm', 'leads', 'team',
]

/** 🏛️ لوحة مضمونة — نفس النظام: فينانس أولًا */
// 🏛️ (١/٩) لوحة مضمونة — على الصفحات اللي **عليها البيانات فعلًا**.
//    /admin/team كانت 404 — الفريق في /admin/staff.
const PLATFORM: Mod[] = [
  { key: 'company',   label: 'الشركة',        href: '/admin/company',          icon: LayoutDashboard },
  { key: 'staff',     label: 'الفريق',        href: '/admin/staff',            icon: Users },
  { key: 'listings',  label: 'الإعلانات',     href: '/admin/listings',         icon: LayoutGrid },
  { key: 'suppliers', label: 'الموردين',      href: '/admin/suppliers',        icon: Users },
  { key: 'bourse',    label: 'البورصة',       href: '/real-estate/market',     icon: Building2 },
  { key: 'demand',    label: 'طلبات لايف',    href: '/real-estate/requests',   icon: Megaphone },
  { key: 'crm',       label: 'مكالماتي',      href: '/crm',                    icon: Users },
  { key: 'tasks',     label: 'التاسكات',      href: '/admin/task-review',      icon: ClipboardList },
]

const PLATFORM_FINANCE: Mod[] = [
  { key: 'dash',      label: 'الأوفرفيو',     href: '/admin/dashboard',        icon: TrendingUp },
  { key: 'fin',       label: 'الفينانس',      href: '/admin/business-finance', icon: Wallet },
  { key: 'payroll',   label: 'المرتبات',      href: '/admin/payroll',          icon: Receipt },
  { key: 'commission',label: 'العمولات',      href: '/admin/commissions',      icon: Receipt },
]

export default function WorkspaceMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [finance, setFinance] = useState<Mod[]>([])
  const [mods, setMods] = useState<Mod[]>([])
  const [title, setTitle] = useState('')
  const [href, setHref] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return

        // 🏛️ أدمن مضمونة → لوحة المنصة (فينانس أولًا)
        const { data: staff } = await (supabaseBrowser.rpc as unknown as (
          f: string,
        ) => Promise<{ data: unknown }>)('is_madmona_staff')

        if (staff === true) {
          if (!alive) return
          setTitle('لوحة مضمونة')
          setHref('/admin/company')
          setFinance(PLATFORM_FINANCE)
          setMods(PLATFORM)
          return
        }

        // 🏪 صاحب بيزنس → فينانس + موديولات نشاطه
        const { data: sup } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { limit: (n: number) => Promise<{ data: unknown }> } } }
        }).from('suppliers').select('id, business_name, industry')
          .eq('auth_user_id', session.user.id).limit(1)

        const s = (sup as { id: string; business_name: string; industry?: string }[])?.[0]
        if (!s || !alive) return

        setTitle(s.business_name || 'بيزنسي')
        setHref('/supplier/erp')
        setFinance(FINANCE)

        // 🏗️ مطوّر عقاري → موديل المقاولات الكامل
        if (s.industry === 'مطوّر عقاري') {
          setMods(DEVELOPER_MODULES.filter((k) => BUSINESS[k]).map((k) => ({ key: k, ...BUSINESS[k] })))
          return
        }

        // 🗂️ غيره → موديولات نشاطه من business_modules
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: s.id })

        const keys = ((data as { modules?: string[] })?.modules) || []
        if (!alive) return
        setMods(keys.filter((k) => BUSINESS[k]).map((k) => ({ key: k, ...BUSINESS[k] })))
      } catch { /* مش مسجّل — مايظهرش حاجة */ }
    })()
    return () => { alive = false }
  }, [])

  if (mods.length === 0 && finance.length === 0) return null

  const Grid = ({ items }: { items: Mod[] }) => (
    <div className="grid grid-cols-4 gap-1 px-1">
      {items.map((m) => {
        const Icon = m.icon
        return (
          <Link key={m.key} href={m.href} onClick={onNavigate}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#FAFAF7] no-underline">
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/12 flex items-center justify-center">
              <Icon className="w-[17px] h-[17px] text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{m.label}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="pt-3 mt-2 border-t border-gray-100">
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
        <Link href={href} onClick={onNavigate}
          className="text-[10.5px] font-bold text-[#059669] flex items-center gap-0.5 no-underline">
          الكل <ChevronLeft className="w-3 h-3" />
        </Link>
      </div>

      {/* 💰 الفينانس أولًا — البروتوكول */}
      {finance.length > 0 && (
        <>
          <p className="text-[9.5px] font-bold text-gray-400 px-3 mb-1">💰 الفينانس</p>
          <Grid items={finance} />
        </>
      )}

      {/* 🗂️ موديولات النشاط */}
      {mods.length > 0 && (
        <>
          <p className="text-[9.5px] font-bold text-gray-400 px-3 mt-3 mb-1">🗂️ الإدارة</p>
          <Grid items={mods} />
        </>
      )}
    </div>
  )
}
