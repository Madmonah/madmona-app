import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// ── بيانات معاينة لينك الدعوة (٣١ يوليو ٢٠٢٦) ──────────────────
// صفحة الدعوة 'use client' فمكانش ينفع تصدّر metadata، ونتيجة كده كانت
// بترث بيانات اللايوت الرئيسي بالكامل: og:url = madmonacairo.com،
// وصورة ومعاينة الموقع العام. فالمدعو كان بيشوف كارت الموقع العام في
// واتساب بدل دعوة صداقة — حتى واللينك نفسه سليم.
// اللايوت ده بيحقن المعاينة الصح من غير ما نلمس الصفحة.

const GENIE = 'https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png'
const SITE = 'https://www.madmonacairo.com'

export async function generateMetadata(
  { params }: { params: { token: string } },
): Promise<Metadata> {
  const url = `${SITE}/chat/i/${params.token}`
  const title = 'صاحبك بيدعيك على شات مضمونة 🧞'
  const description = 'افتح اللينك وهتبقوا أصحاب على طول — من غير طلبات ولا موافقات.'

  return {
    metadataBase: new URL(SITE),
    title,
    description,
    // الدعوات شخصية ومؤقتة — مش المفروض تتفهرس في محركات البحث
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      url,
      siteName: 'شات مضمونة',
      title,
      description,
      images: [{ url: GENIE, width: 512, height: 512, alt: 'المارد — مضمونة' }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [GENIE],
    },
  }
}

export default function InviteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
