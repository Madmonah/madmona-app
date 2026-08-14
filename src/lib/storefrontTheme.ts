/* ============================================================
 * PER-MERCHANT STOREFRONT THEME  (shared — added 20 Jun 2026)
 * مصدر واحد لهوية كل تاجر عبر كل صفحاته (الستورفرنت + الحجز).
 * الافتراضي = هوية مضمونة (كريمي/أخضر). 'dark' = أسود/أحمر أوتوموتيف.
 * ربط التاجر بالثيم: عن طريق supplier_id (يشتغل على كل الصفحات) أو slug.
 * إضافة تاجر لثيم = سطر واحد في THEME_BY_SUPPLIER_ID/THEME_BY_SLUG.
 * (TODO مستقبلي: نخلّي المفتاح ييجي من عمود في suppliers = dynamic بالكامل)
 * ============================================================ */

export type ThemeKey = 'default' | 'dark'

export interface Theme {
  pageBg: string
  // top co-brand bar (storefront)
  barBg: string; barBorder: string; barText: string; barTag: string
  // accent family
  accent: string; accentSoft: string; accentLine: string
  // gradients
  gCta: string; gCover: string; gSoft: string; gHero: string; heroOverlay: string
  // trust strip
  trustBg: string; trustBorder: string; trustText: string; trustStrong: string; trustIcoBg: string; trustIco: string
  // booking step bar active color
  stepActive: string
}

export const THEMES: Record<ThemeKey, Theme> = {
  // هوية مضمونة الافتراضية — مطابقة للقديم بالظبط (مايتغيّرش حاجة لباقي العملاء)
  default: {
    pageBg: '#FAFAF7',
    barBg: '#FFFFFF', barBorder: 'rgba(250, 129, 37,.10)', barText: '#059669', barTag: '#059669',
    accent: '#059669', accentSoft: 'rgba(250, 129, 37,.10)', accentLine: 'rgba(250, 129, 37,.20)',
    gCta: 'linear-gradient(100deg,#d4a017 0%,#2FA084 55%,#059669 100%)',
    gCover: 'linear-gradient(135deg,#1d6253 0%,#2FA084 70%,#6FCF97 100%)',
    gSoft: 'linear-gradient(135deg,rgba(250, 129, 37,.10),rgba(212,160,23,.13))',
    gHero: 'linear-gradient(120deg,#1d6253 0%,#2FA084 100%)',
    heroOverlay: 'linear-gradient(180deg,rgba(8,26,21,.18) 0%,rgba(8,26,21,.10) 35%,rgba(8,26,21,.80) 100%)',
    trustBg: '#FFFFFF', trustBorder: 'rgba(250, 129, 37,.15)', trustText: '#6B7280', trustStrong: '#1A2E26',
    trustIcoBg: 'rgba(250, 129, 37,.10)', trustIco: '#059669',
    stepActive: '#d4a017',
  },
  // هوية سعداوي — أسود/أحمر أوتوموتيف
  dark: {
    pageBg: '#FFFFFF',
    barBg: '#0A0A0A', barBorder: '#1f1f22', barText: '#FFFFFF', barTag: '#9a9a9e',
    accent: '#E4002B', accentSoft: 'rgba(228,0,43,.12)', accentLine: 'rgba(228,0,43,.22)',
    gCta: 'linear-gradient(90deg,#E4002B 0%,#b00020 100%)',
    gCover: 'radial-gradient(120% 90% at 80% 0%, rgba(228,0,43,.22), transparent 55%), linear-gradient(180deg,#121214 0%,#0A0A0A 60%,#0A0A0A 100%)',
    gSoft: 'linear-gradient(135deg,rgba(228,0,43,.12),rgba(228,0,43,.05))',
    gHero: 'linear-gradient(120deg,#0A0A0A 0%,#161618 55%,#3a0a12 100%)',
    heroOverlay: 'linear-gradient(180deg,rgba(0,0,0,.20) 0%,rgba(0,0,0,.10) 35%,rgba(0,0,0,.82) 100%)',
    trustBg: '#101012', trustBorder: '#1f1f22', trustText: '#cfcfd4', trustStrong: '#FFFFFF',
    trustIcoBg: 'rgba(228,0,43,.16)', trustIco: '#E4002B',
    stepActive: '#E4002B',
  },
}

// ربط التجار بالثيمات
export const THEME_BY_SUPPLIER_ID: Record<string, ThemeKey> = {
  'e17e94cb-2b28-443a-bfdd-f5df37ea2935': 'dark', // سعداوي جراج
}
export const THEME_BY_SLUG: Record<string, ThemeKey> = {
  sa3dawy: 'dark',
}

export function getThemeKey(opts: { supplierId?: string | null; slug?: string | null; industry?: string | null }): ThemeKey {
  const { supplierId, slug } = opts
  if (slug && THEME_BY_SLUG[slug]) return THEME_BY_SLUG[slug]
  if (supplierId && THEME_BY_SUPPLIER_ID[supplierId]) return THEME_BY_SUPPLIER_ID[supplierId]
  return 'default'
}

export function getTheme(opts: { supplierId?: string | null; slug?: string | null; industry?: string | null }): Theme {
  return THEMES[getThemeKey(opts)]
}

/* ============================================================
 * resolveTheme — الأفضل: يقرا الثيم من عمود suppliers.theme (dynamic بالكامل).
 * لو فيه ثيم في الـDB بندمجه فوق الافتراضي (أي مفتاح ناقص = فولباك).
 * لو مفيش، بنرجع للـmap القديم (THEME_BY_SUPPLIER_ID/SLUG).
 * ============================================================ */
export function resolveTheme(
  dbTheme: Partial<Theme> | null | undefined,
  fallback: { supplierId?: string | null; slug?: string | null; industry?: string | null },
): Theme {
  if (dbTheme && typeof dbTheme === 'object' && (dbTheme as Partial<Theme>).accent) {
    return { ...THEMES.default, ...dbTheme } as Theme
  }
  return getTheme(fallback)
}
