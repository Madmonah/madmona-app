'use client'
// src/components/LanguageToggle.tsx
// Compact AR/EN switch. Drop it into any nav/header.
// Uses the locked brand palette only.

import { useT } from '@/lib/i18n/LanguageProvider'

export default function LanguageToggle({
  className = '',
  activeClass = 'bg-[#34D399] text-[#04352A]',
  inactiveClass = 'bg-transparent text-[#059669]',
}: {
  className?: string
  activeClass?: string
  inactiveClass?: string
}) {
  const { lang, setLang } = useT()

  return (
    <div
      className={`inline-flex items-center rounded-full overflow-hidden text-[13px] font-bold select-none ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang('ar')}
        aria-pressed={lang === 'ar'}
        className={`px-3 py-1.5 transition-colors ${lang === 'ar' ? activeClass : inactiveClass}`}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-3 py-1.5 transition-colors ${lang === 'en' ? activeClass : inactiveClass}`}
      >
        EN
      </button>
    </div>
  )
}
