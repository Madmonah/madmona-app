'use client'
// ============================================================================
// 🌍 (٢٧ أغسطس ٢٠٢٦) جسم صفحة العقارات اتنقل هنا كـclient component عشان
//    يقدر يستخدم useT() للترجمة بالسبع لغات. page.tsx فضل سيرفر عشان
//    يحتفظ بالـmetadata (SEO) — الاتنين مايتجمعوش في ملف واحد.
// ============================================================================
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
import Link from 'next/link'
import {
  ShieldCheck, Banknote, Headphones, Building2, KeyRound,
  Sparkles, MessageCircle, CheckCircle2, Users, LayoutDashboard, TrendingUp,
} from 'lucide-react'
import TopNav from '@/components/TopNav'

import { useT } from '@/lib/i18n/LanguageProvider'

const ADD_LISTING = '/add-listing?src=re-landing'

const PILLARS = [
  {
    icon: ShieldCheck,
    titleKey: 're.p1_t',
    descKey: 're.p1_d',
  },
  {
    icon: Banknote,
    titleKey: 're.p2_t',
    descKey: 're.p2_d',
  },
  {
    icon: Headphones,
    titleKey: 're.p3_t',
    descKey: 're.p3_d',
  },
] as const

/* (24 اغسطس 26) جدول نسب العمولة اتشال بقرار محمد: العمولة في الباكاند فقط - السعر اللي بتقول عليه هو اللي بتاخده. */
const NET_PRICE_POINTS = [
  { labelKey: 're.f1_l', detailKey: 're.f1_d' },
  { labelKey: 're.f2_l', detailKey: 're.f2_d' },
  { labelKey: 're.f3_l', detailKey: 're.f3_d' },
] as const

const STEPS = [
  { n: '١', titleKey: 're.s1_t', descKey: 're.s1_d' },
  { n: '٢', titleKey: 're.s2_t', descKey: 're.s2_d' },
  { n: '٣', titleKey: 're.s3_t', descKey: 're.s3_d' },
] as const

export default function RealEstateClient() {
  const { t } = useT()
  // 🌍 لينك الواتساب بيتبني جوّه الكومبوننت — نصه مترجم فمينفعش يبقى ثابت بره
  const WA_LINK = `https://wa.me/201002229982?text=${encodeURIComponent(t('re.wa'))}`
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <TopNav />

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#34D399]/10 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-[#059669]" />
            <span className="text-xs font-medium text-[#059669]">{t('re.hero_tag')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {t('re.hero_1')}
            <br />
            <span className="text-[#059669]">{t('re.hero_2')}</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
            {t('re.hero_d1')}
            {t('re.hero_d2')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={ADD_LISTING}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-bold text-lg shadow-lg hover:opacity-95 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #d4a017 0%, #2FA084 55%, #059669 100%)' }}
            >
              <KeyRound className="w-5 h-5" />
              {t('re.cta_list')}
            </Link>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#059669]/30 text-[#059669] font-semibold hover:bg-[#34D399]/5 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {t('re.cta_wa')}
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {t('re.hero_note')}
          </p>
        </section>

        {/* الركائز الثلاثة */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {PILLARS.map((p) => (
            <div key={t(p.titleKey)} className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
              <div className="w-11 h-11 rounded-full bg-[#34D399]/10 text-[#059669] flex items-center justify-center mx-auto mb-3">
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{t(p.titleKey)}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{t(p.descKey)}</p>
            </div>
          ))}
        </section>

        {/* جدول العمولات الشفاف */}
        <section className="mb-10">
          <div className="bg-white rounded-2xl border-2 border-[#059669]/20 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Banknote className="w-5 h-5 text-[#059669]" />
              <h2 className="text-xl font-bold text-gray-900">{t('re.money_t')}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {t('re.money_d')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {NET_PRICE_POINTS.map((row) => (
                <div key={t(row.labelKey)} className="border border-gray-100 rounded-xl p-4 bg-[#FAFAF7]">
                  <p className="font-bold text-gray-900 mb-2">{t(row.labelKey)}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{t(row.detailKey)}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {t('re.dev_note')}
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
                <h3 className="font-bold text-white">{t('re.bourse_t')}</h3>
                <p className="text-sm text-white/80">
                  {t('re.bourse_d')}
                </p>
              </div>
            </div>
            <span className="text-white font-bold text-xl shrink-0">←</span>
          </Link>
        </section>

        {/* إزاي بتشتغل */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">{t('re.how_t')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center md:text-right">
                <div className="w-9 h-9 rounded-full bg-[#34D399] text-[#04352A] font-bold flex items-center justify-center mx-auto md:mx-0 md:mr-0 mb-3">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{t(s.titleKey)}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t(s.descKey)}</p>
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
            <h3 className="text-lg font-bold text-gray-900 mb-3">{t('re.owner_t')}</h3>
            <ul className="space-y-2.5">
              {[
                t('re.owner_1'),
                t('re.owner_2'),
                t('re.owner_3'),
                t('re.owner_4'),
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
            <h3 className="text-lg font-bold text-gray-900 mb-3">{t('re.broker_t')}</h3>
            <ul className="space-y-2.5">
              {[
                t('re.broker_1'),
                t('re.broker_2'),
                t('re.broker_3'),
                t('re.broker_4'),
              ].map((li) => (
                <li key={li} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] mt-0.5 shrink-0" />
                  {li}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <LayoutDashboard className="w-4 h-4" />
              {t('re.broker_cta')}
            </div>
          </div>
        </section>

        {/* أسئلة سريعة */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('re.faq_t')}</h2>
          <div className="space-y-4">
            {[
              {
                q: t('re.faq1_q'),
                a: t('re.faq1_a'),
              },
              {
                q: t('re.faq2_q'),
                a: t('re.faq2_a'),
              },
              {
                q: t('re.faq3_q'),
                a: t('re.faq3_a'),
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
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t('re.final_t')}</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            {t('re.final_d')}
          </p>
          <Link
            href={ADD_LISTING}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#059669] font-bold text-lg shadow-lg hover:bg-gray-50 transition-colors"
          >
            <KeyRound className="w-5 h-5" />
            {t('re.cta_list')}
          </Link>
        </section>
      </main>
    </div>
  )
}

