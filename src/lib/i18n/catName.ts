// src/lib/i18n/catName.ts
// ============================================================
// 🌍 (٢٧ أغسطس ٢٠٢٦) اسم التصنيف/المجموعة باللغة الحالية.
// المصدر في الداتابيز: categories.name_ar (المصري) + name_en +
// name_i18n {en,uk,ru,ja} (وللمجموعات group_name_ar + group_name_i18n).
// سلسلة الرجوع: i18n[locale] → i18n.en → name_en → name_ar.
// العربي بنوعيه (مصري/خليجي) بياخد name_ar دايمًا.
// أي مكان بيعرض اسم تصنيف للمستخدم يستخدم الدالتين دول — ممنوع
// `lang === 'en' ? name_en : name_ar` تاني.
// ============================================================
import type { Locale } from './dictionary'

export type I18nNames = Record<string, string | null | undefined> | null | undefined

export type NamedCategory = {
  name_ar?: string | null
  name_en?: string | null
  name_i18n?: I18nNames
}

export type NamedGroup = {
  group_name_ar?: string | null
  group_name_i18n?: I18nNames
}

function pick(locale: Locale, ar: string | null | undefined, en: string | null | undefined, i18n: I18nNames): string {
  if (locale === 'ar' || locale === 'ar-gulf') return ar || en || ''
  return i18n?.[locale] || i18n?.en || en || ar || ''
}

export function catNameFor(c: NamedCategory | null | undefined, locale: Locale): string {
  if (!c) return ''
  return pick(locale, c.name_ar, c.name_en, c.name_i18n)
}

export function groupNameFor(g: NamedGroup | null | undefined, locale: Locale): string {
  if (!g) return ''
  return pick(locale, g.group_name_ar, g.group_name_i18n?.en, g.group_name_i18n)
}

/** أعمدة التصنيف اللي لازم تتجاب في أي select عشان catNameFor تشتغل */
export const CAT_NAME_COLS = 'name_ar, name_en, name_i18n'

// ---- إعلانات: عنوان ووصف بلغة المستخدم ----
// المصدر listings.title/description (لغة صاحب الإعلان) + listings.i18n
// {en,uk,ru,ja}{title,description} (بتتولد بـ scripts/translate-listings.mjs
// وبتتمسح تلقائي لو الأصل اتغيّر). العربي بنوعيه = الأصل.
export type I18nListing = {
  title?: string | null
  description?: string | null
  i18n?: Record<string, { title?: string | null; description?: string | null } | null> | null
}

export function listingTitleFor(l: I18nListing | null | undefined, locale: Locale): string {
  if (!l) return ''
  if (locale === 'ar' || locale === 'ar-gulf') return l.title || ''
  return l.i18n?.[locale]?.title || l.i18n?.en?.title || l.title || ''
}

export function listingDescriptionFor(l: I18nListing | null | undefined, locale: Locale): string {
  if (!l) return ''
  if (locale === 'ar' || locale === 'ar-gulf') return l.description || ''
  return l.i18n?.[locale]?.description || l.i18n?.en?.description || l.description || ''
}
