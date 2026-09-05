'use client'

// ============================================================================
// 🌍 CountryToggle — زرار اختيار الدولة (جنب زرار اللغة)
//
// (٦ سبتمبر ٢٠٢٦) نفس شكل LanguageToggle بالظبط: علم بس، وselect شفاف فوقه
// بيشتغل نيتيف على iOS/أندرويد من غير أي مكتبة.
//
// 🔑 الاختيار بيتكتب كوكي `madmona_country` وبعدها **ريلود** — لأن الفلترة
//    بتحصل في Server Component (`getVisitorCountry`) وبتقرا الكوكي، فمن
//    غير ريلود الصفحة تفضل على الدولة القديمة.
//
// الافتراضي وقت الرندر: الكوكي لو موجود، وإلا `EG`. مانقدرش نقرا هيدر
// الـIP من المتصفح — بس ده مش مشكلة: السيرفر هو اللي بيفلتر، والزرار
// بيعرض اللي السيرفر اختاره لما يوصله كـprop.
// ============================================================================
import { useEffect, useState } from 'react'
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/countries'

const COOKIE = 'madmona_country'

function readCookie(): CountryCode | null {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([A-Za-z]{2})'))
    const v = m?.[1]?.toUpperCase()
    return COUNTRIES.some((c) => c.code === v) ? (v as CountryCode) : null
  } catch { return null }
}

export default function CountryToggle({
  initial,
  className = '',
  activeClass = '',
}: {
  /** الدولة اللي السيرفر قرر يعرضها — من getVisitorCountry */
  initial?: CountryCode
  className?: string
  activeClass?: string
}) {
  const [code, setCode] = useState<CountryCode>(initial ?? DEFAULT_COUNTRY)

  useEffect(() => {
    const c = readCookie()
    if (c) setCode(c)
  }, [])

  const current = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]

  function choose(next: string) {
    const v = next.toUpperCase() as CountryCode
    if (!COUNTRIES.some((c) => c.code === v) || v === code) return
    setCode(v)
    try {
      document.cookie = `${COOKIE}=${v};path=/;max-age=31536000;samesite=lax`
    } catch { /* ignore */ }
    // السيرفر هو اللي بيفلتر — لازم يشوف الكوكي الجديد
    window.location.reload()
  }

  return (
    <label
      className={`relative inline-flex items-center rounded-full overflow-hidden text-[15px] font-bold select-none cursor-pointer ${className}`}
      aria-label="Country"
      title={`${current.nameAr} — ${current.currency}`}
    >
      <span className={`px-2 py-1 transition-colors ${activeClass}`} aria-hidden="true">
        {current.flag}
      </span>
      <select
        value={code}
        onChange={(e) => choose(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[16px]"
        aria-label="Country"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.nameAr} — {c.currency}
          </option>
        ))}
      </select>
    </label>
  )
}
