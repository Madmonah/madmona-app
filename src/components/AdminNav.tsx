'use client'

// ⚰️ AdminNav — **الكومبوننت ده مش مستخدم في أي مكان.**
//
// (٢٢ أغسطس ٢٠٢٦) اتأكدت بالبحث في كل `src`: مفيش ولا ملف بيعمله import.
// التنقّل الحقيقي لصفحات الأدمن هو `AdminShell.tsx` — اللي بيتحقن من
// `src/app/admin/layout.tsx`. لو بتضيف صفحة أدمن جديدة، **حطّها في
// AdminShell مش هنا**، وإلا محدش هيشوفها (محمد: «مش شايف تاب الـCRM
// لا في الأدمن ولا في أي مكان» — وده كان السبب بالظبط).
//
// سايبينه بدل ما نمسحه لأن مجموعاته فيها تجميع مفيد لو حبينا نرجّع
// الدرج العائم يومًا ما.
//
// AdminNav — درج تنقّل موحّد لكل صفحات الأدمن (يوليو 2026).
// بيفتح من زرار عائم، بيعرض التابات الحقيقية بس مجمّعة في 9 مجموعات.

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, LayoutDashboard, Wallet, Building2, ShoppingBag, Users,
  Bot, MessageSquare, Megaphone, Settings, ChevronLeft, Headphones,
} from 'lucide-react'

const MADMONA_ERP = '/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

const NAV: { title: string; icon: typeof Menu; items: { href: string; label: string }[] }[] = [
  { title: 'القيادة', icon: LayoutDashboard, items: [
    { href: '/admin/dashboard', label: 'لوحة القيادة' },
    { href: '/admin/overview', label: 'كل الأدوات' },
    { href: '/admin/company', label: 'الشركة' },
    { href: '/admin/permissions', label: 'الصلاحيات' },
  ] },
  { title: 'إدارة مضمونة (ERP)', icon: Wallet, items: [
    { href: MADMONA_ERP, label: 'الإدارة الكاملة' },
  ] },
  { title: 'شركاء B2B', icon: Building2, items: [
    { href: '/admin/business-partners', label: 'الشركاء' },
    { href: '/admin/leads', label: 'Leads' },
  ] },
  // 📇 (٢١ أغسطس ٢٠٢٦) تتبّع شغل الفريق — محمد: «عايزين نعمل نظام يعمل تراك
  //    لموظفين مضمونة … الليد يتوزّع عليهم … وكله يكون ظاهر».
  { title: 'فريق مضمونة (CRM)', icon: Headphones, items: [
    { href: '/admin/crm', label: 'الأرقام والتوزيع' },
    { href: '/admin/staff', label: 'الموظفين' },
    { href: '/admin/flow-tasks', label: 'كل التاسكات' },
    { href: '/admin/task-review', label: '✅ مراجعة التاسكات' },
    { href: '/admin/payroll', label: '💼 المرتبات والعمولات' },
    { href: '/admin/commissions', label: '💰 عمولات مضمونة' },
  ] },
  { title: 'الماركت بليس', icon: ShoppingBag, items: [
    { href: '/admin/listings', label: 'الإعلانات' },
    // ⏸️ (٢١ أغسطس ٢٠٢٦) شاشة «الإعلانات الواقفة» — مسودة · موقوف · مرفوض
    //    وليه واقف. كانت مبنية ومش موصولة بأي تنقّل.
    { href: '/admin/drafts', label: 'الإعلانات الواقفة' },
    { href: '/admin/listing-drafts', label: 'المسودّات' },
    { href: '/admin/reattribute', label: 'نقل ملكية الإعلانات' },
    { href: '/admin/categories', label: 'الفئات' },
    { href: '/admin/marketplace-bookings', label: 'الحجوزات' },
    { href: '/admin/marketplace-orders', label: 'الطلبات' },
    { href: '/admin/payments', label: '💳 تأكيد التحويلات' },
    { href: '/admin/payouts', label: 'المدفوعات' },
    { href: '/admin/projects', label: 'المشاريع' },
    { href: '/admin/projects-media', label: 'ميديا المشاريع' },
  ] },
  { title: 'الموردين', icon: Users, items: [
    { href: '/admin/sup', label: 'الموردين' },
    { href: '/admin/supplier-posts', label: 'منشورات الموردين' },
  ] },
  { title: 'AI / المارد', icon: Bot, items: [
    { href: '/admin/orchestrator', label: 'تحكم الكرونات 🧞' },
    { href: '/admin/ai-assistant', label: 'المساعد الذكي' },
    { href: '/admin/ai-os', label: 'AI OS' },
    { href: '/admin/agent-health', label: 'صحة الوكلاء' },
    { href: '/admin/pipelines', label: 'Pipelines' },
    { href: '/admin/prompt-versions', label: 'Prompts' },
    { href: '/admin/marid', label: 'المارد' },
    { href: '/admin/marid-monitor', label: 'مراقبة المارد' },
  ] },
  { title: 'واتساب والرسائل', icon: MessageSquare, items: [
    // 🔗 (١٥ أغسطس ٢٠٢٦) الشاشتين دول كانوا مبنيين وشغّالين ومش موصولين
    //    بأي تنقّل — الطريقة الوحيدة توصلهم كانت إنك تكتب اللينك بإيدك.
    { href: '/admin/send', label: 'ابعت واتساب' },
    { href: '/admin/sending', label: 'مين بيبعت إيه' },
    { href: '/admin/wa-numbers', label: 'أرقام واتساب' },
    { href: '/admin/wa-review', label: 'مراجعة واتساب' },
    { href: '/admin/daily-messages', label: 'الرسائل اليومية' },
    { href: '/admin/welcome-messages', label: 'رسائل الترحيب' },
    { href: '/admin/notifications', label: 'الإشعارات' },
  ] },
  { title: 'ماركتنج', icon: Megaphone, items: [
    { href: '/admin/news', label: 'الأخبار' },
    { href: '/admin/social-groups', label: 'الجروبات' },
    { href: '/admin/social-packs', label: 'الباقات' },
    { href: '/admin/reels', label: 'الريلز' },
    { href: '/admin/collaborations', label: 'التعاونات' },
    { href: '/admin/ad-review', label: 'مراجعة الإعلانات' },
    { href: '/admin/ad-builder', label: 'منشئ الإعلانات' },
  ] },
  { title: 'النظام', icon: Settings, items: [
    { href: '/admin/site-settings', label: 'إعدادات الموقع' },
    { href: '/admin/email-queue', label: 'طابور الإيميل' },
    { href: '/admin/email-templates', label: 'قوالب الإيميل' },
    { href: '/admin/subscriptions', label: 'الاشتراكات' },
    { href: '/admin/wallets', label: 'المحافظ' },
    { href: '/admin/careers', label: 'الوظائف' },
  ] },
]

export default function AdminNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="قائمة الأدمن"
        className="fixed bottom-5 left-5 z-[90] w-12 h-12 rounded-full bg-[#34D399] text-[#04352A] shadow-lg flex items-center justify-center hover:bg-[#175c4f] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[95]" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[280px] max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-[#34D399] text-[#04352A] px-4 py-3 flex items-center justify-between z-10">
              <span className="font-black text-sm">مضمونة · الأدمن</span>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-2 pb-8">
              {NAV.map((group) => {
                const GIcon = group.icon
                return (
                  <div key={group.title} className="mb-1">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                      <GIcon className="w-3.5 h-3.5 text-[#059669]" />
                      <span className="text-[11px] font-black text-gray-400 tracking-wide">{group.title}</span>
                    </div>
                    {group.items.map((it) => {
                      const active = pathname === it.href
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm no-underline transition-colors ${active ? 'bg-[#34D399] text-[#04352A] font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <span>{it.label}</span>
                          <ChevronLeft className="w-4 h-4 opacity-40" />
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
