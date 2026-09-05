// ============================================================================
// 🌍 lib/countries.ts — مصدر واحد للدول والعملات في الواجهة
//
// (٦ سبتمبر ٢٠٢٦) محمد: «لمونة ده بيزنس في الإمارات — عايزين نضيف تاب
//    للعملة والدولة عند التسجيل ونعمّم، ونفتح دول مجلس التعاون الخليجي».
//
// 🔑 العملة **مش اختيار منفصل** — بتتشتق من الدولة. ودي مفروضة في
//    الداتابيز كمان بتريجر `set_currency_from_country` على listings ·
//    listing_drafts · suppliers · marketplace_suppliers، فحتى لو حد بعت
//    عملة غلط من أي مسار، الدولة هي اللي بتكسب. اتجرّب بمحاولة حقيقية:
//    country='EG' + currency='AED' رجعت EG/EGP.
//
// المصدر الحقيقي جدول `public.countries` — الملف ده نسخة ثابتة للواجهة
// عشان مانعملش نداء شبكة لحاجة بتتغير مرة في السنة. لو ضفت دولة في
// الجدول، ضيفها هنا كمان.
// ============================================================================

export type CountryCode = 'EG' | 'AE' | 'SA' | 'KW' | 'QA' | 'BH' | 'OM'

export type Country = {
  code: CountryCode
  nameAr: string
  nameEn: string
  currency: string
  dial: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'EG', nameAr: 'مصر',       nameEn: 'Egypt',                currency: 'EGP', dial: '20',  flag: '🇪🇬' },
  { code: 'AE', nameAr: 'الإمارات',  nameEn: 'United Arab Emirates', currency: 'AED', dial: '971', flag: '🇦🇪' },
  { code: 'SA', nameAr: 'السعودية',  nameEn: 'Saudi Arabia',         currency: 'SAR', dial: '966', flag: '🇸🇦' },
  { code: 'KW', nameAr: 'الكويت',    nameEn: 'Kuwait',               currency: 'KWD', dial: '965', flag: '🇰🇼' },
  { code: 'QA', nameAr: 'قطر',       nameEn: 'Qatar',                currency: 'QAR', dial: '974', flag: '🇶🇦' },
  { code: 'BH', nameAr: 'البحرين',   nameEn: 'Bahrain',              currency: 'BHD', dial: '973', flag: '🇧🇭' },
  { code: 'OM', nameAr: 'عُمان',     nameEn: 'Oman',                 currency: 'OMR', dial: '968', flag: '🇴🇲' },
]

export const DEFAULT_COUNTRY: CountryCode = 'EG'

export function countryOf(code?: string | null): Country {
  const c = (code || DEFAULT_COUNTRY).toUpperCase()
  return COUNTRIES.find((x) => x.code === c) || COUNTRIES[0]
}

/** عملة الدولة — نقطة الاشتقاق الوحيدة في الواجهة. */
export function currencyOfCountry(code?: string | null): string {
  return countryOf(code).currency
}

/**
 * 📞 الدولة من رقم التليفون — بيساعد في اختيار افتراضي وقت التسجيل.
 * بيمشي على قاعدة ٤/٩: مصر = 01… أو 1… أو 20…، وغير كده رقم دولي بكود دولة.
 * مابيخمّنش من الرقم المحلي الأجنبي (0585…) — مش قابل للتمييز.
 */
export function countryFromPhone(phone?: string | null): CountryCode | null {
  const d = (phone || '').replace(/[^\d]/g, '')
  if (!d) return null
  if (/^(01\d{9}|1\d{9}|20\d{10})$/.test(d)) return 'EG'
  // الأطول الأول عشان 971 ماتتلغبطش مع 97
  const byDial = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of byDial) {
    if (d.startsWith(c.dial)) return c.code
  }
  return null
}
