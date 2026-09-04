// src/lib/currency.ts
// 💱 (٤ سبتمبر ٢٠٢٦) عملة الإعلان/الصنف — لمونة (دبي) أسعارها بالدرهم، وكل
//    الشاشات كانت بتطبع «ج» ثابتة جنب أي رقم. سعر بعملة غلط = سعر مخترع.
//    المصدر: `listings.currency` · `restaurant_menu_items.currency` ·
//    `mart_products.currency` (الافتراضي EGP فكل الموجود زي ما هو).

export type CurrencyCode = 'EGP' | 'AED' | 'SAR' | 'USD' | 'EUR' | 'KWD' | 'QAR' | 'BHD' | 'OMR' | 'GBP'

const AR: Record<string, string> = {
  EGP: 'ج', AED: 'د.إ', SAR: 'ر.س', USD: '$', EUR: '€', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', GBP: '£',
}
const EN: Record<string, string> = {
  EGP: 'EGP', AED: 'AED', SAR: 'SAR', USD: '$', EUR: '€', KWD: 'KWD', QAR: 'QAR', BHD: 'BHD', OMR: 'OMR', GBP: '£',
}

/** رمز/اسم العملة القصير حسب اللغة. مجهولة → الكود نفسه. */
export function currencyLabel(code?: string | null, lang: string = 'ar'): string {
  const c = (code || 'EGP').toUpperCase()
  return (lang.startsWith('ar') ? AR : EN)[c] ?? c
}

/** «٢١ د.إ» / «21 AED» — الرقم بفواصل الآلاف حسب اللغة. */
export function priceLabel(amount: number | string | null | undefined, code?: string | null, lang: string = 'ar'): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  const num = n.toLocaleString(lang.startsWith('ar') ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 })
  return `${num} ${currencyLabel(code, lang)}`
}
