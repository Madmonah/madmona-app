'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ChevronLeft, Loader2, Copy, Check, ExternalLink, Briefcase,
  UserPlus, CalendarCheck, Crown, ShieldCheck, Store, Sparkles,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type LinkItem = { label: string; path: string; share?: boolean }
type Group = { title: string; icon: React.ReactNode; items: LinkItem[]; desc?: string
  // 🎯 (٢ سبتمبر ٢٠٢٦) محمد: «اخفي الأقسام اللي مش بتخص نوع البيزنس».
  //    القسم بيظهر لو **أي** مفتاح من needs موجود في موديولات النشاط.
  //    من غير needs = قسم أساسي بيظهر للكل.
  needs?: string[] }

export default function LinksHubPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('https://www.madmonacairo.com')
  const [copied, setCopied] = useState<string | null>(null)
  const [mods, setMods] = useState<string[] | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    ;(async () => {
      const { data: s } = await supabase.from('suppliers').select('business_name, join_slug').eq('id', supplierId).single()
      setSupplier(s)
      const { data: br } = await supabase.from('supplier_branches').select('code, name').eq('supplier_id', supplierId).order('code')
      setBranches(br || [])
      // موديولات النشاط — الفلترة بتتبني عليها
      try {
        const { data: bm } = await (supabase.rpc as unknown as (
          f: string, a: Record<string, unknown>,
        ) => Promise<{ data: unknown }>)('business_modules', { p_supplier_id: supplierId })
        setMods(((bm as { modules?: string[] })?.modules) || [])
      } catch { setMods([]) }
      setLoading(false)
    })()
  }, [supplierId])

  function copy(url: string) {
    navigator.clipboard?.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 1500)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div>

  const baseAdmin = `/admin/business-finance/${supplierId}`
  const slug = supplier?.join_slug || supplierId
  const name = supplier?.business_name || 'النشاط'

  const groups: Group[] = [
    {
      title: 'لوحة الإدارة والمالية', icon: <ShieldCheck className="w-4 h-4" />,
      desc: 'محمية بتسجيل دخول — للأدمن وصاحب النشاط بس',
      items: [
        { label: 'اللوحة الرئيسية', path: baseAdmin },
        { label: 'التأكيدات (تيبس + طلبات + موظفين)', path: `${baseAdmin}/confirmations` },
        { label: 'Dashboard', path: `${baseAdmin}/dashboard` },
        { label: 'الفريق', path: `${baseAdmin}/team` },
        { label: 'إضافة موظفين Bulk', path: `${baseAdmin}/team/bulk-add` },
        { label: 'الفروع', path: `${baseAdmin}/branches` },
        { label: 'العملاء', path: `${baseAdmin}/customers` },
        { label: 'المواعيد', path: `${baseAdmin}/appointments` },
        { label: 'إدارة الحجوزات', path: `${baseAdmin}/bookings` },
        { label: 'قائمة الانتظار', path: `${baseAdmin}/waitlist` },
        { label: 'المخزون', path: `${baseAdmin}/inventory` },
        { label: 'قائمة الخدمات', path: `${baseAdmin}/services-catalog` },
        { label: 'ربط خدمة-منتج', path: `${baseAdmin}/services` },
        { label: 'المصاريف', path: `${baseAdmin}/expenses` },
        { label: 'الحضور', path: `${baseAdmin}/attendance` },
        { label: 'جرد الكاش', path: `${baseAdmin}/cash-recon` },
        { label: 'المرتبات (+ تعديل + سجل التغييرات)', path: `${baseAdmin}/payroll` },
        { label: 'طلبات شراء', path: `${baseAdmin}/purchase-orders` },
        { label: 'الموردين', path: `${baseAdmin}/vendors` },
        { label: 'العروض', path: `${baseAdmin}/promotions` },
        { label: 'متابعة العملاء · CRM', path: `${baseAdmin}/crm` },
        { label: 'المستندات', path: `${baseAdmin}/documents` },
        { label: 'سجل التعديلات', path: `${baseAdmin}/audit-log` },
        { label: 'عملاء في خطر', path: `${baseAdmin}/at-risk` },
        { label: 'مواعيد العمل (Shifts)', path: `${baseAdmin}/shifts` },
        { label: 'التقييمات', path: `${baseAdmin}/ratings` },
        { label: 'ملصقات QR للفروع', path: `${baseAdmin}/qr-posters` },
        { label: 'تسجيل عملية', path: `${baseAdmin}/operations` },
        { label: 'تصدير تقارير', path: `${baseAdmin}/reports` },
        { label: 'VAT Report', path: `${baseAdmin}/vat-report` },
        { label: 'الإعدادات', path: `${baseAdmin}/settings` },
        { label: 'الصلاحيات', path: `${baseAdmin}/permissions` },
        { label: 'هوية البيزنس', path: `${baseAdmin}/identity` },
        { label: 'جدول التاسكات اليومي', path: `${baseAdmin}/schedule` },
        { label: 'المهام', path: `${baseAdmin}/flow-tasks` },
        { label: 'المونيتور', path: `${baseAdmin}/monitor` },
        { label: 'أجهزة البصمة', path: `${baseAdmin}/attendance-devices` },
        { label: 'السلف', path: `${baseAdmin}/advances` },
        { label: 'التكليفات', path: `${baseAdmin}/assignments` },
        { label: 'الطلبات', path: `${baseAdmin}/requests` },
        { label: 'مستندات الشركة', path: `${baseAdmin}/company-docs` },
      ],
    },
    {
      title: 'الفلوس والحسابات', icon: <Sparkles className="w-4 h-4" />,
      desc: 'دفتر اليومية والأرباح والتحصيل',
      items: [
        { label: 'الحسابات والقيود', path: `${baseAdmin}/accounting` },
        { label: 'الأرباح والخسائر', path: `${baseAdmin}/pnl` },
        { label: 'التحصيل', path: `${baseAdmin}/collections` },
      ],
    },
    {
      title: 'المنتجات والوحدات', icon: <Store className="w-4 h-4" />,
      desc: 'الكتالوج والمعرض والوحدات والتوكيلات',
      needs: ['products', 'catalog', 'units', 'inventory', 'listings'],
      items: [
        { label: 'الكتالوج', path: `${baseAdmin}/catalog` },
        { label: 'الوحدات', path: `${baseAdmin}/units` },
        { label: 'المعرض', path: `${baseAdmin}/showroom` },
        { label: 'التوكيلات', path: `${baseAdmin}/brands` },
        { label: 'الاستيراد', path: `${baseAdmin}/import` },
        { label: 'طلبات التسعير', path: `${baseAdmin}/quote-orders` },
      ],
    },
    {
      title: 'المقاولات والمشاريع', icon: <Briefcase className="w-4 h-4" />,
      desc: 'لأصحاب المقاولات والتطوير العقاري',
      needs: ['projects', 'stages', 'production', 'units', 'contracts'],
      items: [
        { label: 'المشاريع', path: `${baseAdmin}/projects` },
        { label: 'جدول الكميات (BOQ)', path: `${baseAdmin}/boq` },
        { label: 'المراحل', path: `${baseAdmin}/milestones` },
        { label: 'المقاولين من الباطن', path: `${baseAdmin}/subcontractors` },
        { label: 'المناقصات', path: `${baseAdmin}/tenders` },
        { label: 'أوامر التغيير', path: `${baseAdmin}/variation-orders` },
        { label: 'مستخلصات الدفع', path: `${baseAdmin}/payment-certificates` },
        { label: 'الضمانات', path: `${baseAdmin}/guarantees` },
        { label: 'الفحوصات', path: `${baseAdmin}/inspections` },
        { label: 'طلبات الخامات', path: `${baseAdmin}/material-requests` },
        { label: 'التقارير اليومية', path: `${baseAdmin}/daily-reports` },
        { label: 'مصاريف المشاريع', path: `${baseAdmin}/expenses-projects` },
        { label: 'عهدة المشاريع', path: `${baseAdmin}/custody-projects` },
      ],
    },
    {
      title: 'المعدات والعهدة', icon: <CalendarCheck className="w-4 h-4" />,
      desc: 'المعدات والورشة والعهدة',
      needs: ['projects', 'production', 'materials', 'maintenance'],
      items: [
        { label: 'المعدات', path: `${baseAdmin}/equipment` },
        { label: 'سجل المعدات', path: `${baseAdmin}/equipment-logs` },
        { label: 'العهدة', path: `${baseAdmin}/custody` },
        { label: 'الورشة والصيانة', path: `${baseAdmin}/workshop` },
      ],
    },
    {
      title: 'بوابة المالك', icon: <Crown className="w-4 h-4" />,
      desc: `لصاحب ${name} — نظرة عامة على الشغل`,
      items: [{ label: `بوابة مالك ${name}`, path: `/owner/${supplierId}` }],
    },
    {
      title: 'لوحة الموظفين', icon: <Briefcase className="w-4 h-4" />,
      desc: 'كل موظف يدخل من حسابه',
      items: [
        { label: 'لوحة الموظف (حضور + تاسكات + تيبس + مواعيد)', path: `/me` },
        { label: 'تسجيل دخول', path: `/login` },
      ],
    },
    // 📨 (٢٠ أغسطس ٢٠٢٦) اللينك اللي بيتبعت **لصاحب البيزنس** نفسه.
    //    محمد: «شكل محترف أو لينك نبعته لكل بيزنس نقوله تقدر تدير البيزنس
    //    بتاعك من هنا». قبل كده مكانش فيه غير لينك انضمام **الموظفين**
    //    وبوابة المالك بالـUUID — ولا واحد فيهم ينفع يتبعت لصاحب بيزنس
    //    لسه مادخلش المنصة.
    {
      title: 'دعوة صاحب البيزنس', icon: <Sparkles className="w-4 h-4" />,
      desc: `اللينك ده تبعته لصاحب ${name} — بيوريه شغله المعروض عندنا ولوحته وبيدخّله`,
      items: [{ label: `دعوة ${name} لإدارة بيزنسه`, path: `/manage/${slug}`, share: true }],
    },
    {
      title: 'تسجيل الموظفين الجدد', icon: <UserPlus className="w-4 h-4" />,
      desc: 'اللينك ده تبعته للموظفين عشان يسجّلوا أرقامهم',
      items: [{ label: `لينك انضمام موظفي ${name}`, path: `/join/${slug}`, share: true }],
    },
    {
      title: 'واجهة العملاء (الصفحة الرئيسية)', icon: <Sparkles className="w-4 h-4" />,
      desc: `الصفحة اللي تبعتها لعملاء ${name} — منها يحجزوا ويشوفوا الخدمات ويدخلوا حسابهم`,
      items: [{ label: `صفحة ${name} للعملاء`, path: `/s/${slug}`, share: true }],
    },
    {
      title: 'حجز العملاء (لكل فرع)', icon: <CalendarCheck className="w-4 h-4" />,
      desc: 'لينكات للعملاء يحجزوا أونلاين — تبعتها أو تحطها في البايو',
      // 🔗 (٢٠ أغسطس ٢٠٢٦) كان `/book/${b.code}` — والمسار ده **مش موجود**.
      //    اتأكدت لايف: بيرجّع 404. يعني كل زرار «حجز» صاحب البيزنس بيشيره
      //    من هنا كان بيودّي العميل لصفحة مش لاقية. `/at/<code>` هو
      //    الصفحة الشغّالة للفرع (بتفتح 200).
      items: branches.map((b: any) => ({ label: `حجز · ${b.name}`, path: `/at/${b.code}`, share: true })),
    },
    {
      title: 'عام', icon: <Store className="w-4 h-4" />,
      items: [
        { label: 'الصفحة الرئيسية للحساب', path: `/home` },
        { label: 'سوق مضمونة', path: `/marketplace` },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href={baseAdmin} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">ALL LINKS</p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">كل لينكات {name}</h1>
          <p className="text-sm text-[#6B7280] mt-1">دوس على أي لينك يفتح، أو انسخه بزرار النسخ</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {groups
          // 🎯 (٢/٩) قسم متخصص بيظهر بس لو نشاط البيزنس بيستخدمه.
          //    mods === null معناها لسه بتتحمّل → نعرض الكل (مانخفيش
          //    حاجة بالغلط وقت التحميل).
          .filter((g) => !g.needs || mods === null || g.needs.some((k) => mods.includes(k)))
          .map((g) => (
          <section key={g.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-[#059669]">{g.icon}</span>
                <h2 className="text-sm font-black text-[#1A2E26]">{g.title}</h2>
                <span className="text-[10px] font-bold bg-white border border-gray-200 text-[#6B7280] px-1.5 py-0.5 rounded-full">{g.items.length}</span>
              </div>
              {g.desc && <p className="text-[11px] text-[#6B7280] mt-1">{g.desc}</p>}
            </div>
            <div className="divide-y divide-gray-100">
              {g.items.map((it) => {
                const full = origin + it.path
                return (
                  <div key={it.path} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1A2E26] flex items-center gap-1.5">
                        {it.label}
                        {it.share && <span className="text-[9px] font-bold bg-[#34D399]/10 text-[#059669] px-1.5 py-0.5 rounded">قابل للمشاركة</span>}
                      </p>
                      <p className="text-[11px] text-[#6B7280] font-mono truncate" dir="ltr">{full}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => copy(full)} className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-[#34D399]/10 text-[#059669] transition-colors" title="نسخ">
                        {copied === full ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a href={it.path} target="_blank" rel="noopener" className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-[#34D399]/10 text-[#059669] transition-colors" title="افتح">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        <p className="text-center text-[10px] text-[#6B7280]">madmonacairo.com · {name}</p>
      </main>
    </div>
  )
}
