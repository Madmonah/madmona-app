'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Plus, User } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageProvider'
import type { MouseEvent } from 'react'

// ============================================================
// BottomNav — mobile-only bottom navigation (design 2a)
// 5 columns + raised center "ضيف" FAB:
//   الرئيسية · السوق · [ضيف FAB] · الشات · حسابي
// FAB → /add-listing (passes ?track= if the user is standing on a vertical).
// ============================================================

export default function BottomNav() {
  const { t, lang, dir } = useT()
  const pathname = usePathname() || '/'
  const en = lang === 'en'

  const addListing = (e: MouseEvent) => {
    try {
      const tr = new URLSearchParams(window.location.search).get('track')
      if (tr) {
        e.preventDefault()
        window.location.assign(`/add-listing?track=${encodeURIComponent(tr)}`)
      }
    } catch { /* fall through to plain link */ }
  }

  const homeActive = pathname === '/'
  // 🏗️ (29 Jul 2026) بورصة مشاريع المطوّرين جزء من عالم «السوق» — التبويب بينوّر عليها
  const marketActive = pathname.startsWith('/marketplace') || pathname.startsWith('/real-estate')
  const chatActive = pathname.startsWith('/chat')
  const accountActive = pathname === '/account' || (pathname.startsWith('/account') && !pathname.startsWith('/account/favorites'))

  return (
    // 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «زرار ضيف مرحّل شوية، لازم تضغط تحت منه»)
    //
    // كان الشريط نفسه هو اللي فيه الخلفية والحدود، والدايرة الخضرا كانت
    // بتطلع **١٥ بكسل بره صندوق الشريط** (اتقاسوا فعلًا: الشريط بيبدأ من
    // 776 والدايرة من 761). الجزء الطالع ده بيتـرسم عادي، بس هو تقنيًا
    // برّه العنصر اللي المتصفح بيعتبره الشريط — وعلى أجهزة حقيقية الجزء
    // ده بيبوظ في اللمس، فتحس إن الزرار «مرحّل» ولازم تدوس تحته.
    //
    // الحل: الشريط بقى **حاوية شفافة أطول بـ٢٦ بكسل من فوق** (`pt-[26px]`)،
    // والخلفية اتنقلت لطبقة جوّاه بتبدأ من `top-[26px]`. يعني الجريد جوّه
    // مالوش أي تعديل وبيترسم في نفس مكانه بالظبط — بس بقى جوّه الصندوق.
    //
    // ⚠️ ٢٦ للحشوة و٢٤ للطبقة — الفرق ٢ مقصود. الشريط القديم كان لابس
    //    `.glass` اللي بيحط `border: 1px` على الأربع جهات، فكان بياخد
    //    بكسل فوق وبكسل تحت. الحدود دي انتقلت للطبقة الجوّانية، فلو
    //    خلّينا الرقمين متساويين الشريط بيبان أنزل ٢ بكسل عن مكانه.
    //
    // ⚠️ `pointer-events-none` على الشريط ضرورية: من غيرها الشريحة
    //    الشفافة اللي فوق كانت هتاكل الدوسات على محتوى الصفحة ورا الشريط
    //    على عرض الشاشة كله. الأبناء بس هم اللي بيستقبلوا اللمس.
    <nav
      dir={dir}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none pt-[26px]"
    >
      {/* الخلفية المرسومة — بتبدأ تحت الشريحة الشفافة، في مكان الشريط القديم بالظبط */}
      <div className="absolute inset-x-0 bottom-0 top-[24px] glass border-t border-black/[0.06] shadow-luxe pointer-events-auto" />

      <div className="relative grid grid-cols-5 max-w-md mx-auto items-end px-1 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* الرئيسية */}
        <Link href="/" className={`pointer-events-auto flex flex-col items-center gap-1 no-underline ${homeActive ? 'text-[#059669]' : 'text-[#6B7280]'}`}>
          <Home className="w-5 h-5" strokeWidth={homeActive ? 2.5 : 2} fill={homeActive ? 'rgba(250, 129, 37,.1)' : 'none'} />
          <span className={`text-[10px] ${homeActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.home')}</span>
        </Link>

        {/* السوق */}
        <Link href="/marketplace" className={`pointer-events-auto flex flex-col items-center gap-1 no-underline ${marketActive ? 'text-[#059669]' : 'text-[#6B7280]'}`}>
          <Compass className="w-5 h-5" strokeWidth={marketActive ? 2.5 : 2} fill={marketActive ? 'rgba(250, 129, 37,.1)' : 'none'} />
          <span className={`text-[10px] ${marketActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.marketplace')}</span>
        </Link>

        {/* ضيف — FAB */}
        <Link href="/add-listing" onClick={addListing} className="pointer-events-auto flex flex-col items-center -mt-[26px] no-underline">
          <span className="w-[52px] h-[52px] rounded-[18px] bg-gradient-to-br from-[#34D399] to-[#2FA084] border-[3px] border-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(250, 129, 37,.5)]">
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </span>
          <span className="text-[10px] font-extrabold text-[#059669] mt-[3px]">{en ? 'List' : 'ضيف'}</span>
        </Link>

        {/* الشات */}
        <Link href="/chat" className={`pointer-events-auto flex flex-col items-center gap-1 no-underline ${chatActive ? 'text-[#059669]' : 'text-[#6B7280]'}`}>
          <span className={`text-[20px] leading-none ${chatActive ? '' : 'grayscale opacity-75'}`}>🧞</span>
          <span className={`text-[10px] ${chatActive ? 'font-extrabold' : 'font-medium'}`}>{en ? 'Chat' : 'الشات'}</span>
        </Link>

        {/* حسابي */}
        <Link href="/account" className={`pointer-events-auto flex flex-col items-center gap-1 no-underline ${accountActive ? 'text-[#059669]' : 'text-[#6B7280]'}`}>
          <User className="w-5 h-5" strokeWidth={accountActive ? 2.5 : 2} />
          <span className={`text-[10px] ${accountActive ? 'font-extrabold' : 'font-medium'}`}>{t('nav.account')}</span>
        </Link>
      </div>
    </nav>
  )
}
