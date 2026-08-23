// src/app/real-estate/page.tsx
// =====================================================================
// صفحة هبوط قطاع العقارات — الريسيل (ملاك + سماسرة + مكاتب)
// الفانل: هنا → /add-listing (المصدر الموحّد) أو واتساب
// السياسة (31 يوليو 2026):
//   • إيجار قصير (< سنة)  = 10% على قيمة العقد
//   • إيجار طويل (سنة+)    = شهر عمولة (مش نسبة)
//   • بيع (Resale)         = 5% من سعر البيع المعروض
//   • الليستنج ببلاش · CRM+ERP باشتراك بالاتفاق للمكاتب
//   • CTA = «ضيف الليستنج»
// =====================================================================
import { Metadata } from 'next'
import Link from 'next/link'
import {
  ShieldCheck, Banknote, Headphones, Building2, KeyRound,
  Sparkles, MessageCircle, CheckCircle2, Users, LayoutDashboard, TrendingUp,
} from 'lucide-react'
import TopNav from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'أجّر أو بيع عقارك وانت مضمون — شقق وفيلات وشاليهات ومكاتب | مضمونة',
  description:
    'ضيف عقارك على مضمونة ببلاش: حماية كاملة، دفع مستحقات سريع، ودعم مستمر 24/7. السعر اللي بتحدده هو اللي بيوصلك.',
  keywords: [
    'تأجير شقق', 'بيع شقق', 'ريسيل عقاري', 'تأجير عقارات في مصر', 'أجر شقتك',
    'شقق للإيجار القاهرة', 'منصة تأجير مضمونة', 'تأجير آمن بدون نصب', 'سماسرة عقارات',
  ],
  openGraph: {
    title: 'أجّر أو بيع عقارك وانت مضمون | مضمونة',
    description: 'ليستنج ببلاش · حماية كاملة · دفع سريع · السعر اللي بتحدده هو اللي بيوصلك.',
    url: 'https://madmonacairo.com/real-estate',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
  alternates: { canonical: 'https://madmonacairo.com/real-estate' },
}

const WA_LINK = `https://wa.me/201002229982?text=${encodeURIComponent('أهلاً، عندي عقار وعايز أضيفه على مضمونة')}`
const ADD_LISTING = '/add-listing?src=re-landing'

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'حماية كاملة',
    desc: 'كل معاملة موثقة ومحمية — انت والطرف التاني. وداعاً لقلق النصب والعربون الضايع.',
  },
  {
    icon: Banknote,
    title: 'دفع مستحقات سريع',
    desc: 'فلوسك بتوصلك بسرعة بعد كل حجز أو بيعة ناجحة، من غير مطاردة ولا تأخير.',
  },
  {
    icon: Headphones,
    title: 'دعم مستمر',
    desc: 'فريق حقيقي معاك 24/7 — قبل التعاقد وبعده، لأي سؤال أو مشكلة.',
  },
] as const

/* (24 اغسطس 26) جدول نسب العمولة اتشال بقرار محمد: العمولة في الباكاند فقط - السعر اللي بتقول عليه هو اللي بتاخده. */
const NET_PRICE_POINTS = [
  { label: 'السعر اللي بتحدده', detail: 'هو اللي بيوصلك - من غير خصومات' },
  { label: 'الليستنج والنشر', detail: 'ببلاش تماما - مفيش تعاقد = مفيش أي تكلفة' },
  { label: 'التفاصيل التجارية', detail: 'بتتقفل مع فريقنا وقت التعاقد - بشفافية كاملة' },
] as const

const STEPS = [
  { n: '١', title: 'ضيف الليستنج في ٥ دقايق', desc: 'صور + تفاصيل العقار — النشر من غير أي مصاريف.' },
  { n: '٢', title: 'بنوصّله للطرف المناسب', desc: 'الذكاء الاصطناعي بتاعنا بيفلتر وبيرشح عقارك للجادين بس.' },
  { n: '٣', title: 'أجّر أو بيع واستلم فلوسك', desc: 'المعاملة مضمونة — السعر اللي حددته بيوصلك، ومفيش تعاقد = مفيش أي تكلفة.' },
] as const

export default function RealEstateLanding() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <TopNav />

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#34D399]/10 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-[#059669]" />
            <span className="text-xs font-medium text-[#059669]">شقق · فيلات · شاليهات · مكاتب</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            عقارك يشتغللك —
            <br />
            <span className="text-[#059669]">من غير قلق النصب</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
            ضيف عقارك على مضمونة ببلاش — إيجار أو بيع — واحنا نجيبلك الطرف الجاد بمعاملة محمية بالكامل.
            فلوسك بتوصلك بسرعة، ودعمنا معاك على طول.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={ADD_LISTING}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-lg shadow-lg hover:opacity-95 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #d4a017 0%, #2FA084 55%, #059669 100%)' }}
            >
              <KeyRound className="w-5 h-5" />
              ضيف الليستنج
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#059669]/30 text-[#059669] font-semibold hover:bg-[#34D399]/5 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              كلمنا واتساب
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            الليستنج ببلاش · السعر اللي بتحدده هو اللي بيوصلك
          </p>
        </section>

        {/* الركائز الثلاثة */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
              <div className="w-11 h-11 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center mx-auto mb-3">
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </section>

        {/* جدول العمولات الشفاف */}
        <section className="mb-10">
          <div className="bg-white rounded-2xl border-2 border-[#059669]/20 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-5 h-5 text-[#059669]" />
              <h2 className="text-xl font-bold text-gray-900">فلوسك — بشفافية كاملة</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              مبدأ واحد بس: اللي بتحدده هو اللي بتاخده — ومفيش تكلفة إلا لما المعاملة تتم:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NET_PRICE_POINTS.map((t) => (
                <div key={t.label} className="border border-gray-100 rounded-xl p-4 bg-[#FAFAF7]">
                  <p className="font-bold text-gray-900 mb-2">{t.label}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              مشاريع المطورين ليها ترتيبات خاصة بتتحدد لكل مشروع من عقد المطور (بورصة المطورين).
            </p>
          </div>
        </section>

        {/* بورصة العقارات */}
        <section className="mb-10">
          <Link
            href="/real-estate/market"
            className="flex items-center justify-between gap-3 bg-[#34D399] rounded-2xl p-5 md:p-6 hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white">📊 بورصة عقارات مضمونة — جديد</h3>
                <p className="text-sm text-white/80">
                  أسعار مشروعات المطورين والريسيل والإيجارات في العاصمة الإدارية والتجمع — بتتحدث باستمرار
                </p>
              </div>
            </div>
            <span className="text-white font-bold text-xl shrink-0">←</span>
          </Link>
        </section>

        {/* إزاي بتشتغل */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">بتشتغل إزاي؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center md:text-right">
                <div className="w-9 h-9 rounded-full bg-[#34D399] text-[#04352A] font-bold flex items-center justify-center mx-auto md:mx-0 md:mr-0 mb-3">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* مالك vs سمسار/مكتب */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="w-11 h-11 rounded-full bg-[#2FA084]/10 text-[#2FA084] flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">لو انت مالك</h3>
            <ul className="space-y-2.5">
              {[
                'شقتك أو شاليهك قدام آلاف المستأجرين والمشترين الجادين',
                'مفيش مكالمات عشوائية — بنفلترلك الجادين بس',
                'العربون والدفعات محميين لحد ما تسلّم وتستلم',
                'مستحقاتك بتوصلك بسرعة بعد كل معاملة',
              ].map((li) => (
                <li key={li} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                  {li}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
            <div className="w-11 h-11 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">لو انت سمسار أو مكتب عقاري</h3>
            <ul className="space-y-2.5">
              {[
                'كل ليستنجاتك في مكان واحد بصفحات احترافية',
                'عمولتك محفوظة وموثقة في كل معاملة',
                'نظام إدارة كامل (CRM+ERP): عملاء، معاينات، فريق، فروع، تقارير — متاح باشتراك شهري بالاتفاق',
                'دعم أولوية لشركائنا من المكاتب',
              ].map((li) => (
                <li key={li} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                  {li}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <LayoutDashboard className="w-4 h-4" />
              اسأل عن نظام الإدارة على الواتساب — بنظبطه على حجم شغلك
            </div>
          </div>
        </section>

        {/* أسئلة سريعة */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">أسئلة بتوصلنا كتير</h2>
          <div className="space-y-4">
            {[
              {
                q: 'بدفع حاجة عشان أضيف عقاري؟',
                a: 'لأ — الليستنج والنشر ببلاش تماماً. والسعر اللي بتحدده هو اللي بيوصلك بالكامل — التفاصيل التجارية بتتقفل مع فريقنا وقت التعاقد، بشفافية كاملة ومن غير رسوم مخفية.',
              },
              {
                q: 'إيه اللي يضمنلي فلوسي؟',
                a: 'المعاملة كلها بتتم داخل المنصة وموثقة — الحماية الكاملة هي أساس شغلنا، ومستحقاتك بتوصلك بسرعة بعد المعاملة.',
              },
              {
                q: 'بأجّر شاليه موسمي بس — ينفع؟',
                a: 'ينفع طبعاً — شاليهات الساحل والعين السخنة والجونة من أنشط الفئات عندنا، خصوصاً في الصيف.',
              },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA نهائي */}
        <section className="text-center bg-[#34D399] rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">جاهز تأجّر أو تبيع وانت مضمون؟</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            ضيف عقارك دلوقتي في ٥ دقايق — واحنا نتصرف في الباقي.
          </p>
          <Link
            href={ADD_LISTING}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#059669] font-bold text-lg shadow-lg hover:bg-gray-50 transition-colors"
          >
            <KeyRound className="w-5 h-5" />
            ضيف الليستنج
          </Link>
        </section>
      </main>
    </div>
  )
}
