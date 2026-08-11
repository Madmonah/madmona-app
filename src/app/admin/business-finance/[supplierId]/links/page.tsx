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
type Group = { title: string; icon: React.ReactNode; items: LinkItem[]; desc?: string }

export default function LinksHubPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState('https://www.madmonacairo.com')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    ;(async () => {
      // @ts-expect-error rpc typing
      const { data: s } = await supabase.from('suppliers').select('business_name, join_slug').eq('id', supplierId).single()
      setSupplier(s)
      // @ts-expect-error rpc typing
      const { data: br } = await supabase.from('supplier_branches').select('code, name').eq('supplier_id', supplierId).order('code')
      setBranches(br || [])
      setLoading(false)
    })()
  }, [supplierId])

  function copy(url: string) {
    navigator.clipboard?.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 1500)
  }

  if (loading) return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#2B4521] animate-spin" /></div>

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
        { label: 'حملات WhatsApp', path: `${baseAdmin}/whatsapp-campaigns` },
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
      items: branches.map((b: any) => ({ label: `حجز · ${b.name}`, path: `/book/${b.code}`, share: true })),
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
          <Link href={baseAdmin} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">ALL LINKS</p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">كل لينكات {name}</h1>
          <p className="text-sm text-[#6B7280] mt-1">دوس على أي لينك يفتح، أو انسخه بزرار النسخ</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {groups.map((g) => (
          <section key={g.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAF7] border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-[#2B4521]">{g.icon}</span>
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
                        {it.share && <span className="text-[9px] font-bold bg-[#2B4521]/10 text-[#2B4521] px-1.5 py-0.5 rounded">قابل للمشاركة</span>}
                      </p>
                      <p className="text-[11px] text-[#6B7280] font-mono truncate" dir="ltr">{full}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => copy(full)} className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-[#2B4521]/10 text-[#2B4521] transition-colors" title="نسخ">
                        {copied === full ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a href={it.path} target="_blank" rel="noopener" className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-[#2B4521]/10 text-[#2B4521] transition-colors" title="افتح">
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
