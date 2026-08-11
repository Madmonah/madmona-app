'use client'

import {
  ArrowLeft, Wifi, Coffee, Users, Volume2, Calendar, MapPin,
  Sparkles, Clock, MessageCircle, Star, Building2, GraduationCap, Briefcase,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import { useT } from '@/lib/i18n/LanguageProvider'

const STUDENT_OFFERS = [
  { type: 'Indoor', icon: Building2, price: '60', original: '120', descKey: 'cowork.indoor_desc' },
  { type: 'Outdoor', icon: Sparkles, price: '32.5', original: '65', descKey: 'cowork.outdoor_desc' },
]

const PRO_FEATURES = [
  { icon: Wifi, labelKey: 'cowork.feat_wifi', descKey: 'cowork.feat_wifi_desc' },
  { icon: Coffee, labelKey: 'cowork.feat_coffee', descKey: 'cowork.feat_coffee_desc' },
  { icon: Volume2, labelKey: 'cowork.feat_quiet', descKey: 'cowork.feat_quiet_desc' },
  { icon: Users, labelKey: 'cowork.feat_rooms', descKey: 'cowork.feat_rooms_desc' },
]

export default function CoworkingContent() {
  const { t, dir } = useT()

  return (
    <div className="min-h-screen bg-[#FAFAF7] overflow-x-hidden pb-20 md:pb-0" dir={dir}>
      <TopNav />
      <main className="relative">
        <section className="relative pt-8 pb-12 md:pt-16 md:pb-20 bg-gradient-to-br from-[#2B4521]/8 via-[#FAFAF7] to-[#2FA084]/8 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#2FA084]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-20 w-72 h-72 bg-[#2B4521]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-soft border border-gray-100 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#2FA084]" />
                <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#2B4521]">{t('cowork.exclusive')}</span>
              </div>
              <h1 className="text-4xl md:text-7xl font-black text-gray-900 leading-[0.95] tracking-tight mb-5">
                <span className="block mb-2">{t('cowork.h1_line1')}</span>
                <span className="block italic font-light gradient-text-green">{t('cowork.h1_line2')}</span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {t('cowork.hero_sub')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                <MapPin className="w-3 h-3 text-[#2B4521]" />
                {t('cowork.addr_short')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                <Clock className="w-3 h-3 text-[#2B4521]" />
                {t('cowork.hours')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-100">
                <Star className="w-3 h-3 text-[#FBBC04] fill-[#FBBC04]" />
                {t('cowork.rating')}
              </span>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2B4521]/10 mb-4">
                <GraduationCap className="w-4 h-4 text-[#2B4521]" />
                <span className="text-xs font-black tracking-widest uppercase text-[#2B4521]">{t('cowork.students_badge')}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">{t('cowork.discount_pre')} <span className="gradient-text-green italic font-light">50%</span></h2>
              <p className="text-sm md:text-base text-gray-600 mt-3 max-w-xl mx-auto">{t('cowork.story_pre')} <strong>@madmona.cairo</strong> {t('cowork.story_post')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
              {STUDENT_OFFERS.map((offer, i) => {
                const Icon = offer.icon
                return (
                  <div key={i} className="relative bg-gradient-to-br from-[#2B4521]/5 to-[#FAFAF7] border border-[#2B4521]/15 rounded-3xl p-7 md:p-8 hover:shadow-card transition-all">
                    <div className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1 bg-[#2FA084] text-white rounded-full text-[10px] font-black tracking-widest uppercase">-50%</div>
                    <div className="w-14 h-14 rounded-2xl bg-[#2B4521]/10 flex items-center justify-center mb-5"><Icon className="w-7 h-7 text-[#2B4521]" /></div>
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">{offer.type}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-5">{t(offer.descKey)}</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl md:text-5xl font-black text-[#2B4521]">{offer.price}</span>
                      <span className="text-sm text-gray-500 line-through">{offer.original} {t('common.egp')}</span>
                      <span className="text-sm text-gray-600">{t('cowork.per_day')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-center mt-10">
              <a href="https://wa.me/201002229982?text=أهلاً!%20عاوز%20أحجز%20كوورك%20بخصم%20الطلاب" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] text-white text-base font-black rounded-2xl shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline">
                <MessageCircle className="w-5 h-5" />
                <span>{t('cowork.book_student')}</span>
                <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-[#FAFAF7]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2FA084]/10 mb-4">
                <Briefcase className="w-4 h-4 text-[#2FA084]" />
                <span className="text-xs font-black tracking-widest uppercase text-[#2FA084]">{t('cowork.pros_badge')}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight"><span className="gradient-text-green italic font-light">{t('cowork.pro_price_emph')}</span> {t('cowork.pro_price_post')}</h2>
              <p className="text-sm md:text-base text-gray-600 mt-3 max-w-xl mx-auto">{t('cowork.pros_sub')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto mb-8">
              {PRO_FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <div key={i} className="bg-white rounded-2xl p-5 text-center border border-gray-100 hover:shadow-card transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-[#2B4521]/10 flex items-center justify-center mx-auto mb-3"><Icon className="w-6 h-6 text-[#2B4521]" /></div>
                    <p className="font-bold text-gray-900 text-sm md:text-base mb-1">{t(f.labelKey)}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{t(f.descKey)}</p>
                  </div>
                )
              })}
            </div>
            <div className="text-center">
              <a href="https://wa.me/201002229982?text=أهلاً!%20عاوز%20أحجز%20كوورك%20بـ120%20جنيه" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-[#2B4521] text-white text-base font-black rounded-2xl shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline">
                <Calendar className="w-5 h-5" />
                <span>{t('cowork.book_day')}</span>
                <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-gradient-to-br from-[#2B4521] to-[#0f3a26] text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              <span className="block">{t('cowork.cta_line1')}</span>
              <span className="block italic font-light text-white/80">{t('cowork.cta_line2')}</span>
            </h2>
            <p className="text-base md:text-lg text-white/85 mb-8 max-w-2xl mx-auto">{t('cowork.cta_sub')}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-[#25D366] text-white text-base font-black rounded-2xl shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline">
                <MessageCircle className="w-5 h-5" />
                <span>{t('cowork.wa_instant')}</span>
              </a>
              <a href="https://share.google/QbWskGlQ49AUTJrTc" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#2B4521] text-base font-black rounded-2xl shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline">
                <MapPin className="w-5 h-5" />
                <span>{t('cowork.map')}</span>
              </a>
            </div>
            <p className="text-xs text-white/60 mt-8">{t('about.address_value')}</p>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  )
}
