'use client'

import Link from 'next/link'
import {
  ArrowLeft, MessageCircle, MapPin, Clock, ShieldCheck,
  Users, Building2, Compass, Sparkles, ExternalLink,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import SiteFooter from '@/components/SiteFooter'
import { useT } from '@/lib/i18n/LanguageProvider'

const MADMONA_MAPS_URL = 'https://share.google/QbWskGlQ49AUTJrTc'
const MADMONA_PLUS_CODE = '4974+XX'

export default function AboutContent() {
  const { t, dir } = useT()

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir={dir}>
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-12">
        {/* Hero */}
        <section className="py-10 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FA8125]/10 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-[#FA8125]" />
            <span className="text-xs font-medium text-[#FA8125]">{t('about.eyebrow')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            {t('about.hero_line1')}
            <br />
            <span className="text-[#FA8125]">{t('about.hero_emph')}</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {t('about.hero_sub')}
          </p>
        </section>

        {/* Story */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('about.story_title')}</h2>
          <div className="space-y-3 text-gray-700 leading-relaxed text-sm md:text-base">
            <p>{t('about.story_p1')}</p>
            <p>{t('about.story_p2')}</p>
            <p>
              <strong>Madmona Marketplace</strong> {t('about.story_p3')}
            </p>
          </div>
        </section>

        {/* What we offer */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">{t('about.offer_title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              icon={<Building2 className="w-5 h-5" />}
              title={t('about.offer_spaces_title')}
              description={t('about.offer_spaces_desc')}
              accent="bg-[#FA8125]/10 text-[#FA8125]"
              href="/browse"
              cta={t('about.offer_spaces_cta')}
            />
            <FeatureCard
              icon={<Compass className="w-5 h-5" />}
              title="Madmona Marketplace"
              description={t('about.offer_market_desc')}
              accent="bg-[#2FA084]/10 text-[#2FA084]"
              href="/marketplace"
              cta={t('about.offer_market_cta')}
            />
          </div>
        </section>

        {/* Why us */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('about.why_title')}</h2>
          <div className="space-y-4">
            <ValueRow
              icon={<ShieldCheck className="w-5 h-5" />}
              title={t('about.why1_title')}
              description={t('about.why1_desc')}
            />
            <ValueRow
              icon={<Users className="w-5 h-5" />}
              title={t('about.why2_title')}
              description={t('about.why2_desc')}
            />
            <ValueRow
              icon={<Clock className="w-5 h-5" />}
              title={t('about.why3_title')}
              description={t('about.why3_desc')}
            />
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('about.contact_title')}</h2>
          <div className="space-y-3">
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-[#25D366]/5 rounded-xl hover:bg-[#25D366]/10 no-underline"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{t('about.whatsapp')}</p>
                <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982</p>
              </div>
            </a>
            <a
              href={MADMONA_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 no-underline transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-900 text-sm">{t('about.address_label')}</p>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
                <p className="text-xs text-gray-700 mt-1">{t('about.address_value')}</p>
                <p className="text-[10px] text-gray-500 mt-0.5" dir="ltr">Plus Code: {MADMONA_PLUS_CODE} El Nozha</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('about.hours')}</p>
              </div>
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#FA8125] text-white rounded-2xl p-6 md:p-8 text-center mb-8">
          <h3 className="text-xl md:text-2xl font-bold mb-2">{t('about.cta_title')}</h3>
          <p className="text-sm md:text-base text-white/85 mb-5">{t('about.cta_sub')}</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 bg-white text-[#FA8125] px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 no-underline"
          >
            {t('about.offer_spaces_cta')}
            <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
          </Link>
        </section>

      </main>

      {/* فوتر موحّد (١١ أغسطس ٢٠٢٦) — بدل الفوتر النصي القديم، اتساقًا مع باقي صفحات العميل */}
      <SiteFooter />
    </div>
  )
}

function FeatureCard({
  icon, title, description, accent, href, cta,
}: {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#FA8125]/30 hover:shadow-sm no-underline transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{description}</p>
      <p className="text-xs text-[#FA8125] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
        {cta}
        <ArrowLeft className="w-3 h-3 ltr:rotate-180" />
      </p>
    </Link>
  )
}

function ValueRow({
  icon, title, description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#FA8125]/10 text-[#FA8125] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-sm mb-0.5">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
