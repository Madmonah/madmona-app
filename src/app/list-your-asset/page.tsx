import type { Metadata } from 'next'
import ListYourAssetForm from './ListYourAssetForm'

// /list-your-asset — public guest flow for prospective suppliers
//   Goal: zero friction. Capture the asset first, ask for signup second.
//   Flow: pick category → asset details → contact info → save draft +
//         redirect to /auth/signup?from=listing with pre-filled phone/email.
//
//   The draft is stored in cold_leads (table already exists) with rich
//   metadata so the team can follow up even if signup is abandoned.

const SITE_URL = 'https://madmonacairo.com'

export const metadata: Metadata = {
  title: 'أجر معانا على مضمونة — 10% عمولة بس',
  description:
    'سجل أصلك في 60 ثانية وابدأ تكسب فوراً. شقق، فيلات، عربيات، معدات، مساحات شغل — احنا بتوع التشغيل مش الإعلانات. تيمنا يقفل الصفقة. الفلوس مضمونة.',
  alternates: { canonical: `${SITE_URL}/list-your-asset` },
  openGraph: {
    title: 'أجر معانا على مضمونة — 10% عمولة بس',
    description:
      'سجل أصلك في 60 ثانية. تيمنا يقفل الصفقة بنفسه، الفلوس مضمونة، AI يجيبلك العميل المظبوط. تأسسنا 2019.',
    url: `${SITE_URL}/list-your-asset`,
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
    images: [{ url: `${SITE_URL}/madmona-logo.png`, width: 800, height: 800, alt: 'مضمونة - منصة الإيجار' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'أجر معانا على مضمونة — 10% عمولة بس',
    description: 'سجل أصلك في 60 ثانية. تيمنا يقفل الصفقة بنفسه. الفلوس مضمونة.',
    images: [`${SITE_URL}/madmona-logo.png`],
  },
}

export default function ListYourAssetPage() {
  return <ListYourAssetForm />
}
