// ============================================================================
// 🌍 lib/visitor-country.ts — الزائر ده من أنهي دولة؟ (سيرفر)
//
// (٦ سبتمبر ٢٠٢٦) محمد: «هيعرف منين الدولة والزائر هيتعرض ليه إيه».
//
// الترتيب — الأكيد قبل التخمين:
//   ١. كوكي `madmona_country` — اختيار الزائر بنفسه من زرار الدولة. الأقوى:
//      واحد في دبي بيدوّر على شقة في القاهرة لازم يقدر يقول كده.
//   ٢. هيدر `x-vercel-ip-country` — Vercel بيحطه على كل طلب من موقع الـIP.
//      مجاني، من غير أي نداء خارجي، وبيرجّع ISO-2 زي جدول `countries`.
//   ٣. `EG` — الافتراضي.
//
// أي كود ISO مش في قايمتنا (زائر من ألمانيا مثلًا) بيقع على مصر —
// عشان مانعرضش ماركت فاضي لحد من دولة لسه مافتحناهاش.
//
// ⚠️ ده مفيش فيه أي نداء شبكة — `headers()`/`cookies()` بس. بيتنادى من
//    Server Components فقط؛ الكلاينت بيقرا الكوكي مباشرة (CountryToggle).
// ============================================================================
import { cookies, headers } from 'next/headers'
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/countries'

export const COUNTRY_COOKIE = 'madmona_country'

function isOpenCountry(code: string | null | undefined): code is CountryCode {
  if (!code) return false
  const c = code.toUpperCase()
  return COUNTRIES.some((x) => x.code === c)
}

/** الدولة اللي الزائر ده المفروض يشوف سوقها. */
export async function getVisitorCountry(): Promise<CountryCode> {
  try {
    const chosen = (await cookies()).get(COUNTRY_COOKIE)?.value
    if (isOpenCountry(chosen)) return chosen.toUpperCase() as CountryCode
  } catch { /* خارج سياق طلب */ }

  try {
    const geo = (await headers()).get('x-vercel-ip-country')
    if (isOpenCountry(geo)) return geo.toUpperCase() as CountryCode
  } catch { /* خارج سياق طلب */ }

  return DEFAULT_COUNTRY
}
