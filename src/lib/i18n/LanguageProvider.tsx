'use client'

import { safeStorage } from '@/lib/safe-storage'
// src/lib/i18n/LanguageProvider.tsx
// ============================================================
// Client-side language context for Madmona.
// - Holds current locale (ar | ar-gulf | en | uk | ru | ja)
// - `lang` = base family (ar | en) — kept for backward compat, every
//   `lang === 'en'` / `isRTL` check in the project keeps working.
// - Persists choice to localStorage + cookie (so SSR can read it later)
// - Switches <html lang> and <html dir> live (RTL <-> LTR)
// - Exposes t(key, vars?) translation helper with fallback chain:
//   locale → family (ar/en) → Arabic → raw key
//
// 🌍 (٢٧ أغسطس ٢٠٢٦) محمد: «محتاج أكتر من لغة: أوكراني/روسي/ياباني/إنجليزي
//    وعربي (مصري - خليجي)». اتعمل على نفس النظام الموجود — من غير تغيير
//    راوتات ولا middleware ولا PWA — عشان ما يتكسرش أي لينك أو شاشة.
//
// Mounted once in the root layout, wrapping the whole app.
// ============================================================

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react'
import {
  translate, DEFAULT_LANG, DEFAULT_LOCALE, LANG_STORAGE_KEY, LOCALES, LOCALE_META,
  dirFor, baseLangOf, isLocale, type Lang, type Locale,
} from './dictionary'

interface LanguageContextValue {
  lang: Lang
  locale: Locale
  dir: 'rtl' | 'ltr'
  isRTL: boolean
  setLang: (l: Lang) => void
  setLocale: (l: Locale) => void
  toggle: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function applyToDocument(l: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = LOCALE_META[l].htmlLang
  document.documentElement.dir = dirFor(l)
  document.documentElement.dataset.locale = l
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // On mount, hydrate from stored preference (set pre-paint by the inline
  // script in <head>, so this just syncs React state — no flash).
  useEffect(() => {
    try {
      const saved = safeStorage.get(LANG_STORAGE_KEY)
      if (isLocale(saved)) {
        setLocaleState(saved)
        applyToDocument(saved)
      }
    } catch {
      /* localStorage blocked — stay on default */
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    if (!isLocale(l)) return
    setLocaleState(l)
    applyToDocument(l)
    try {
      safeStorage.set(LANG_STORAGE_KEY, l)
      // 1-year cookie so the server layout can pick the right dir on next load
      document.cookie = `${LANG_STORAGE_KEY}=${l};path=/;max-age=31536000;samesite=lax`
    } catch {
      /* ignore persistence failure */
    }
  }, [])

  // Backward compat: setLang('en') → 'en', setLang('ar') → Egyptian Arabic.
  const setLang = useCallback((l: Lang) => {
    setLocale(l === 'en' ? 'en' : DEFAULT_LOCALE)
  }, [setLocale])

  const toggle = useCallback(() => {
    setLocale(baseLangOf(locale) === 'ar' ? 'en' : DEFAULT_LOCALE)
  }, [locale, setLocale])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = translate(locale, key)
      if (vars) {
        for (const k of Object.keys(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
        }
      }
      return str
    },
    [locale]
  )

  const value = useMemo<LanguageContextValue>(() => {
    const lang = baseLangOf(locale)
    return { lang, locale, dir: dirFor(locale), isRTL: lang === 'ar', setLang, setLocale, toggle, t }
  }, [locale, setLang, setLocale, toggle, t])

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export { LOCALES, LOCALE_META }

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Safe fallback if a component is rendered outside the provider:
    // return Arabic with a no-op setter so the UI never crashes.
    return {
      lang: DEFAULT_LANG,
      locale: DEFAULT_LOCALE,
      dir: dirFor(DEFAULT_LOCALE),
      isRTL: DEFAULT_LANG === 'ar',
      setLang: () => {},
      setLocale: () => {},
      toggle: () => {},
      t: (key: string) => translate(DEFAULT_LOCALE, key),
    }
  }
  return ctx
}
