'use client'
// src/components/LanguageToggle.tsx
// Compact AR/EN switch. Drop it into any nav/header.
// Uses the locked brand palette only.

import { useT } from '@/lib/i18n/LanguageProvider'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useT()

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[#1F6F5F] overflow-hidden text-[13px] font-bold select-none ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'ar' ? 'bg-[#1F6F5F] text-white' : 'bg-transparent text-[#1F6F5F]'
        }`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-3 py-1.5 transition-colors ${
          lang === 'en' ? 'bg-[#1F6F5F] text-white' : 'bg-transparent text-[#1F6F5F]'
        }`}
      >
        EN
      </button>
    </div>
  )
}
