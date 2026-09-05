'use client'
// src/components/LanguageToggle.tsx
// Compact language switcher. Drop it into any nav/header.
// Uses the locked brand palette only.
//
// 🌍 (٢٧ أغسطس ٢٠٢٦) كان AR/EN بس — بقى قايمة بـ٦ لغات:
//    مصري · خليجي · English · Українська · Русский · 日本語.
//    نفس الـprops القديمة (className / activeClass / inactiveClass) عشان
//    TopNav و /v/[branchCode] ما يتكسروش.

import { useT, LOCALES, LOCALE_META } from '@/lib/i18n/LanguageProvider'
import type { Locale } from '@/lib/i18n/dictionary'

export default function LanguageToggle({
  className = '',
  activeClass = 'bg-[#34D399] text-[#04352A]',
  inactiveClass = 'bg-transparent text-[#059669]',
}: {
  className?: string
  activeClass?: string
  inactiveClass?: string
}) {
  const { locale, setLocale } = useT()

  return (
    <label
      className={`relative inline-flex items-center rounded-full overflow-hidden text-[15px] font-bold select-none cursor-pointer ${className}`}
      aria-label="Language"
      title={LOCALE_META[locale].native}
    >
      {/* (٥/٩) محمد: «صغّر التاب وحط علامة اللغات بس» — الاسم المختصر
          اتشال والكرة الأرضية بقت لوحدها. الاسم الكامل في title + الليستة. */}
      <span className={`px-2 py-1 transition-colors ${activeClass}`} aria-hidden="true">
        🌐
      </span>
      <span className={`pe-1.5 py-1 text-[11px] ${inactiveClass}`} aria-hidden="true">▾</span>
      {/* select شفاف فوق الزرار — يشتغل نيتيف على iOS/أندرويد من غير أي مكتبة */}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[16px]"
        aria-label="Language"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_META[l].native}
          </option>
        ))}
      </select>
    </label>
  )
}
