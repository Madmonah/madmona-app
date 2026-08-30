'use client'
// ============================================================================
// 🏛️ /supplier/erp — نافذة الـERP الكاملة للبيزنس
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز نظام الـERP يبان بالموديول الكامل بالتابات
//   اللي احنا هنفعّلها لكل بيزنس، بحد أقصى ٥ موظفين زي ما اتفقنا»
//   + «تيكوود نشاطه مصنع، فلو مفيش موديول مصنع ياريت نبنيه».
//
// التابات بتتحدد من `business_modules()` في الداتابيز — مش قايمة ثابتة:
//   · الأساسية للكل: إعلانات · طلبات · حجوزات · تقييمات · فريق · حسابات
//   · حسب نموذج البيزنس: مصنع (أوامر تشغيل · خامات · مراحل · مخزون)
//     · مطعم (منيو · طاولات · مطبخ) · إيجارات (وحدات · عقود · صيانة)
//   · حسب النشاط الفعلي من الإعلانات
// ============================================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import {
  Loader2, LayoutGrid, Package, ShoppingCart, CalendarDays, Users, Wallet,
  Star, Store, UtensilsCrossed, KeyRound, Tag, ArrowLeft, Factory, Boxes,
  Workflow, Warehouse, FileText, Wrench, ClipboardList, Percent, AlertCircle,
} from 'lucide-react'

type Modules = {
  model: string
  tracks: string[]
  modules: string[]
  employees: { used: number; cap: number; remaining: number }
}

/** 🧩 خريطة الموديول → شكله في الواجهة */
const MODULE_UI: Record<string, { label: string; desc: string; icon: typeof Package; href: string; soon?: boolean }> = {
  listings:        { label: 'إعلاناتي', desc: 'كل الإعلانات — إضافة وتعديل', icon: LayoutGrid, href: '/supplier/marketplace' },
  orders:          { label: 'الطلبات', desc: 'طلبات العملاء وحالتها', icon: ShoppingCart, href: '/supplier/marketplace/orders' },
  bookings:        { label: 'الحجوزات', desc: 'المواعيد والحجوزات', icon: CalendarDays, href: '/supplier/marketplace/bookings' },
  reviews:         { label: 'التقييمات', desc: 'آراء العملاء', icon: Star, href: '/supplier/marketplace/reviews' },
  team:            { label: 'الفريق', desc: 'الموظفين وصلاحياتهم', icon: Users, href: '/supplier/team' },
  accounting:      { label: 'الحسابات', desc: 'الإيرادات والمستحقات', icon: Wallet, href: '/supplier/erp/accounting' },
  products:        { label: 'منتجاتي', desc: 'المصدر — تعدّل هنا فيتغيّر في الماركت بليس', icon: Package, href: '/supplier/erp/products' },
  catalog:         { label: 'العرض في الماركت بليس', desc: 'إيه اللي يشوفه العملاء وإيه اللي يفضل داخلي', icon: Store, href: '/supplier/erp/catalog' },
  crm:             { label: 'عملائي', desc: 'العملاء وتعاملاتهم معاك', icon: Users, href: '/supplier/erp/crm' },
  bulk_products:   { label: 'المنتجات بالجملة', desc: 'إضافة وتعديل منتجات كتير مرة واحدة', icon: Package, href: '/supplier/marketplace/bulk-products' },
  // 🏭 موديول المصنع
  production:      { label: 'أوامر التشغيل', desc: 'الأوامر الجارية ومراحلها', icon: Factory, href: '/supplier/erp/production' },
  materials:       { label: 'الخامات', desc: 'المخزون الخام وحد إعادة الطلب', icon: Boxes, href: '/supplier/erp/materials' },
  stages:          { label: 'مراحل الإنتاج', desc: 'تتبّع الشغل جوّه المصنع', icon: Workflow, href: '/supplier/erp/production' },
  inventory:       { label: 'المخزون', desc: 'الجاهز للبيع', icon: Warehouse, href: '/supplier/erp/materials' },
  // مطعم
  menu:            { label: 'المنيو', desc: 'الأصناف والأسعار', icon: UtensilsCrossed, href: '/supplier/dashboard' },
  tables:          { label: 'الطاولات', desc: 'إدارة الصالة', icon: ClipboardList, href: '/supplier/dashboard', soon: true },
  kitchen:         { label: 'المطبخ', desc: 'طلبات التحضير', icon: UtensilsCrossed, href: '/supplier/dashboard', soon: true },
  // إيجارات
  units:           { label: 'الوحدات', desc: 'الوحدات المتاحة والمؤجّرة', icon: KeyRound, href: '/supplier/bookings' },
  contracts:       { label: 'العقود', desc: 'عقود الإيجار ومواعيدها', icon: FileText, href: '/supplier/bookings', soon: true },
  maintenance:     { label: 'الصيانة', desc: 'طلبات الصيانة', icon: Wrench, href: '/supplier/bookings', soon: true },
  // خدمات
  services_catalog:{ label: 'الخدمات', desc: 'الخدمات المعروضة وأسعارها', icon: Tag, href: '/supplier/marketplace' },
  schedule:        { label: 'الجدول', desc: 'مواعيد الخدمات', icon: CalendarDays, href: '/supplier/marketplace/bookings' },
  projects:        { label: 'المشاريع', desc: 'المشاريع الجارية', icon: ClipboardList, href: '/supplier/marketplace', soon: true },
  leads:           { label: 'العملاء المحتملين', desc: 'الاستفسارات', icon: Users, href: '/supplier/marketplace', soon: true },
  promotions:      { label: 'العروض', desc: 'الخصومات والعروض', icon: Percent, href: '/supplier/marketplace', soon: true },
}

const MODEL_LABELS: Record<string, string> = {
  manufacturing: '🏭 مصنع', retail: '🏪 تجارة', restaurant: '🍽️ مطعم',
  rentals: '🔑 تأجير', services: '🛠️ خدمات', realestate: '🏢 عقارات', mixed: 'متعدد',
}

export default function SupplierErpPage() {
  const [biz, setBiz] = useState<Business | null>(null)
  const [mods, setMods] = useState<Modules | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business)
      try {
        const { data } = await (supabaseBrowser.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: acc.business.id })
        setMods(data as Modules)
      } catch { /* التابات الأساسية هتظهر برضه */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  if (!biz) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
        <h1 className="font-black text-lg mb-2">الصفحة دي للموردين</h1>
        <p className="text-sm text-gray-600 mb-4">لو عندك بيزنس على مضمونة وشايف الرسالة دي، كلّم الدعم.</p>
        <Link href="/marketplace" className="text-[#059669] font-bold text-sm">ارجع للماركت بليس</Link>
      </div>
    )
  }

  const list = mods?.modules?.length
    ? [...new Set(mods.modules)]
    : ['listings', 'products', 'orders', 'bookings', 'reviews', 'catalog', 'crm', 'team', 'accounting']
  const emp = mods?.employees

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        {biz.logo_url
          ? <img src={biz.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
          : <div className="w-11 h-11 rounded-xl bg-[#F1EEE6] flex items-center justify-center"><Store className="w-5 h-5 text-[#059669]" /></div>}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-gray-900 truncate">{biz.business_name}</h1>
          <p className="text-[11px] text-gray-500">
            نظام إدارة البيزنس{mods?.model ? ` · ${MODEL_LABELS[mods.model] || mods.model}` : ''}
          </p>
        </div>
      </div>

      {/* الأرقام + حد الموظفين */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="إعلانات" v={biz.listings_count ?? 0} icon={LayoutGrid} />
        <Stat label="حجوزات" v={biz.bookings_count ?? 0} icon={CalendarDays} />
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-500 font-bold">الفريق</span>
          </div>
          <p className="font-black text-gray-900 tabular">
            {emp ? `${emp.used} / ${emp.cap}` : '—'}
          </p>
        </div>
      </div>

      {emp && emp.remaining === 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11.5px] font-bold text-amber-900">
            وصلت الحد الأقصى للموظفين ({emp.cap}). كلّم مضمونة لو محتاج تزوّد.
          </p>
        </div>
      )}

      {/* الموديولات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {list.map((key) => {
          const m = MODULE_UI[key]
          if (!m) return null
          return (
            <Link key={key} href={m.href}
              className={`flex items-start gap-3 rounded-2xl border bg-white p-3.5 transition ${
                m.soon ? 'border-gray-200 opacity-60' : 'border-gray-200 hover:border-[#34D399]'}`}>
              <div className="w-9 h-9 rounded-xl bg-[#34D399]/12 flex items-center justify-center shrink-0">
                <m.icon className="w-4.5 h-4.5 text-[#059669]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm text-gray-900">
                  {m.label}
                  {m.soon && <span className="text-[10px] font-bold text-gray-400 mr-1.5">(قريبًا)</span>}
                </p>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{m.desc}</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400 mt-5 leading-relaxed">
        التابات بتظهر حسب نشاط بيزنسك — مش كل بيزنس محتاج كل حاجة.
        لو نشاطك اتغيّر أو محتاج موديول مش ظاهر، كلّم مضمونة.
      </p>
    </div>
  )
}

function Stat({ label, v, icon: Icon }: { label: string; v: number; icon: typeof Package }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[11px] text-gray-500 font-bold">{label}</span>
      </div>
      <p className="font-black text-gray-900 tabular">{Number(v).toLocaleString('ar-EG')}</p>
    </div>
  )
}
