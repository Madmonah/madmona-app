// src/lib/pricing-periods.ts
// ============================================================================
// 💰 وحدات التسعير — **مصدر واحد** لكل الشاشات.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «الإضافة لسه الدنيا فيها مش مترتبة، لازم شاشات
//    الإضافة تكون مطابقة لشاشات العرض»)
//
//    إينَم `pricing_period` في الداتابيز فيه **٢٤ قيمة**. الشاشات كانت
//    عارفة **٥ بس** (hourly/daily/weekly/monthly/per_event)، وكل واحدة
//    بقايمة منفصلة عند نفسها:
//      • `marketplace/[slug]/page.tsx`      → مفاتيح `listing.period_*`
//      • `marketplace/[slug]/book/page.tsx` → مفاتيح `common.per_*`
//      • `components/marketplace/ListingForm.tsx` → نص عربي مكتوب في السطر
//
//    النتيجة (اتأكدت من الداتا الحية):
//      ✗ **٧١ قاعدة سعر على ٢٥+ إعلان** بتتعرض للعميل بالمفتاح الإنجليزي
//        الخام: `per_service` (٤٩) · `per_unit` (٢١) · `per_package` (١).
//        يعني العميل بيقرا «per_unit» بدل «للوحدة».
//      ✗ شاشة إضافة المورد مابتديلوش يختار الوحدات دي أصلًا — فالمورد
//        مايقدرش يوصف سعره بنفس اللغة اللي الموقع بيعرض بيها.
//
//    الملف ده بيحط الـ٢٤ في مكان واحد بصيغتين:
//      `periodLabel`  → صيغة الاسم    («الساعة»)  — لقايمة الأسعار في العرض
//      `periodPer`    → صيغة الجار    («بالساعة») — جنب السعر في الحجز
//    القيم الخمسة القديمة اتنقلت **بنصّها بالحرف** من ملف الترجمة عشان
//    مفيش حاجة تتغيّر في الشاشات اللي شغالة.
//
// ⚠️ لو اتضافت قيمة جديدة للإينَم في الداتابيز، ضيفها هنا — ومحدش تاني.
// ============================================================================

/** كل قيم `pricing_period` في الداتابيز (٢٤ قيمة، أغسطس ٢٠٢٦) */
export const PERIOD_VALUES = [
  'hourly', 'half_day', 'daily', 'weekend', 'weekly', 'monthly',
  'monthly_contract', 'yearly_contract',
  'per_event', 'per_service', 'session', 'per_session', 'per_visit',
  'per_job', 'per_trip', 'per_consultation', 'per_procedure', 'per_treatment',
  'package', 'per_package',
  'per_person', 'per_unit', 'per_meter', 'per_pulse',
] as const

export type PricingPeriod = (typeof PERIOD_VALUES)[number]

interface PeriodDef {
  /** صيغة الاسم — «الساعة» */
  ar: string
  /** صيغة الجار — «بالساعة» */
  arPer: string
  en: string
  enPer: string
  /** مجموعة العرض في قايمة الاختيار */
  group: 'time' | 'per_time' | 'package' | 'quantity'
}

const DEFS: Record<PricingPeriod, PeriodDef> = {
  // ── بالوقت ────────────────────────────────────────────────────────────
  // ⬇️ الخمسة دول نصّهم منقول بالحرف من dictionary.ts عشان الشاشات القديمة
  //    ماتتغيّرش شكلها.
  hourly:            { ar: 'الساعة',       arPer: 'بالساعة',       en: 'Hour',            enPer: 'per hour',         group: 'time' },
  daily:             { ar: 'اليوم',        arPer: 'باليوم',        en: 'Day',             enPer: 'per day',          group: 'time' },
  weekly:            { ar: 'الأسبوع',      arPer: 'بالأسبوع',      en: 'Week',            enPer: 'per week',         group: 'time' },
  monthly:           { ar: 'الشهر',        arPer: 'بالشهر',        en: 'Month',           enPer: 'per month',        group: 'time' },
  per_event:         { ar: 'مرة واحدة',    arPer: 'مرة واحدة',     en: 'One-time',        enPer: 'one-time',         group: 'per_time' },
  // ── الجديد ────────────────────────────────────────────────────────────
  half_day:          { ar: 'نص اليوم',     arPer: 'لنص اليوم',     en: 'Half day',        enPer: 'per half day',     group: 'time' },
  weekend:           { ar: 'الويك اند',    arPer: 'للويك اند',     en: 'Weekend',         enPer: 'per weekend',      group: 'time' },
  monthly_contract:  { ar: 'عقد شهري',     arPer: 'بعقد شهري',     en: 'Monthly contract', enPer: 'monthly contract', group: 'time' },
  yearly_contract:   { ar: 'عقد سنوي',     arPer: 'بعقد سنوي',     en: 'Yearly contract',  enPer: 'yearly contract',  group: 'time' },

  per_service:       { ar: 'الخدمة',       arPer: 'للخدمة',        en: 'Service',         enPer: 'per service',      group: 'per_time' },
  session:           { ar: 'الجلسة',       arPer: 'للجلسة',        en: 'Session',         enPer: 'per session',      group: 'per_time' },
  per_session:       { ar: 'الجلسة',       arPer: 'للجلسة',        en: 'Session',         enPer: 'per session',      group: 'per_time' },
  per_visit:         { ar: 'الزيارة',      arPer: 'للزيارة',       en: 'Visit',           enPer: 'per visit',        group: 'per_time' },
  per_job:           { ar: 'الشغلانة',     arPer: 'للشغلانة',      en: 'Job',             enPer: 'per job',          group: 'per_time' },
  per_trip:          { ar: 'الرحلة',       arPer: 'للرحلة',        en: 'Trip',            enPer: 'per trip',         group: 'per_time' },
  per_consultation:  { ar: 'الكشف',        arPer: 'للكشف',         en: 'Consultation',    enPer: 'per consultation', group: 'per_time' },
  per_procedure:     { ar: 'الإجراء',      arPer: 'للإجراء',       en: 'Procedure',       enPer: 'per procedure',    group: 'per_time' },
  per_treatment:     { ar: 'العلاج',       arPer: 'للعلاج',        en: 'Treatment',       enPer: 'per treatment',    group: 'per_time' },

  package:           { ar: 'الباقة',       arPer: 'للباقة',        en: 'Package',         enPer: 'per package',      group: 'package' },
  per_package:       { ar: 'الباقة',       arPer: 'للباقة',        en: 'Package',         enPer: 'per package',      group: 'package' },

  per_person:        { ar: 'الفرد',        arPer: 'للفرد',         en: 'Person',          enPer: 'per person',       group: 'quantity' },
  per_unit:          { ar: 'الوحدة',       arPer: 'للوحدة',        en: 'Unit',            enPer: 'per unit',         group: 'quantity' },
  per_meter:         { ar: 'المتر',        arPer: 'للمتر',         en: 'Meter',           enPer: 'per meter',        group: 'quantity' },
  per_pulse:         { ar: 'النبضة',       arPer: 'للنبضة',        en: 'Pulse',           enPer: 'per pulse',        group: 'quantity' },
}

export const GROUP_LABELS: Record<PeriodDef['group'], { ar: string; en: string }> = {
  time:     { ar: 'بالوقت',        en: 'By time' },
  per_time: { ar: 'لكل مرة/خدمة',  en: 'Per service' },
  package:  { ar: 'باقات',         en: 'Packages' },
  quantity: { ar: 'بالكمية',       en: 'By quantity' },
}

function def(period: string): PeriodDef | null {
  return (DEFS as Record<string, PeriodDef | undefined>)[period] ?? null
}

/**
 * صيغة الاسم — «الساعة». لقايمة الأسعار في صفحة الإعلان.
 * لو القيمة مش معروفة بنرجّعها زي ما هي (أحسن من فراغ) — بس المفروض
 * ماتحصلش، لأن الملف ده فيه كل قيم الإينَم.
 */
export function periodLabel(period: string | null | undefined, lang = 'ar'): string {
  if (!period) return ''
  const d = def(period)
  if (!d) return period
  return lang === 'en' ? d.en : d.ar
}

/** صيغة الجار — «بالساعة». جنب السعر في صفحة الحجز. */
export function periodPer(period: string | null | undefined, lang = 'ar'): string {
  if (!period) return ''
  const d = def(period)
  if (!d) return period
  return lang === 'en' ? d.enPer : d.arPer
}

/** القايمة مرتّبة ومجمّعة — لقوايم الاختيار في شاشات الإضافة */
export function periodOptions(lang = 'ar'): Array<{
  group: string
  options: Array<{ value: PricingPeriod; label: string }>
}> {
  const order: Array<PeriodDef['group']> = ['time', 'per_time', 'package', 'quantity']
  // نشيل المكرر (session/per_session و package/per_package ليهم نفس الاسم)
  const seen = new Set<string>()
  return order.map((g) => ({
    group: lang === 'en' ? GROUP_LABELS[g].en : GROUP_LABELS[g].ar,
    options: PERIOD_VALUES.filter((v) => {
      if (DEFS[v].group !== g) return false
      const key = g + '|' + (lang === 'en' ? DEFS[v].en : DEFS[v].ar)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map((v) => ({ value: v, label: lang === 'en' ? DEFS[v].en : DEFS[v].ar })),
  })).filter((g) => g.options.length > 0)
}
