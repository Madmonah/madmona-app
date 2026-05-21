'use client'
// src/lib/i18n/LanguageProvider.tsx
// ============================================================
// Client-side language context for Madmona.
// - Holds current language (ar | en)
// - Persists choice to localStorage + cookie (so SSR can read it later)
// - Switches <html lang> and <html dir> live (RTL <-> LTR)
// - Exposes t(key, vars?) translation helper
//
// Mounted once in the root layout, wrapping the whole app.
// ============================================================

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react'
import {
  translations, DEFAULT_LANG, LANG_STORAGE_KEY, dirFor, type Lang,
} from './dictionary'

interface LanguageContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  isRTL: boolean
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function applyToDocument(l: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir = dirFor(l)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  // On mount, hydrate from stored preference (set pre-paint by the inline
  // script in <head>, so this just syncs React state — no flash).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null
      if (saved === 'ar' || saved === 'en') {
        setLangState(saved)
        applyToDocument(saved)
      }
    } catch {
      /* localStorage blocked — stay on default */
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    applyToDocument(l)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l)
      // 1-year cookie so the server layout can pick the right dir on next load
      document.cookie = `${LANG_STORAGE_KEY}=${l};path=/;max-age=31536000;samesite=lax`
    } catch {
      /* ignore persistence failure */
    }
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'ar' ? 'en' : 'ar')
  }, [lang, setLang])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[lang] || translations[DEFAULT_LANG]
      let str = dict[key] ?? translations[DEFAULT_LANG][key] ?? key
      if (vars) {
        for (const k of Object.keys(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
        }
      }
      return str
    },
    [lang]
  )

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, dir: dirFor(lang), isRTL: lang === 'ar', setLang, toggle, t }),
    [lang, setLang, toggle, t]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Safe fallback if a component is rendered outside the provider:
    // return Arabic with a no-op setter so the UI never crashes.
    return {
      lang: DEFAULT_LANG,
      dir: dirFor(DEFAULT_LANG),
      isRTL: DEFAULT_LANG === 'ar',
      setLang: () => {},
      toggle: () => {},
      t: (key: string) => translations[DEFAULT_LANG][key] ?? key,
    }
  }
  return ctx
}
