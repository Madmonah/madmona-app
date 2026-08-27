// src/app/real-estate/page.tsx
// =====================================================================
// صفحة هبوط قطاع العقارات — سيرفر (metadata فقط).
// الجسم كله في RealEstateClient عشان الترجمة (٢٧ أغسطس ٢٠٢٦).
// =====================================================================
import { Metadata } from 'next'
import RealEstateClient from './RealEstateClient'

export const metadata: Metadata = {
  title: 'أجّر أو بيع عقارك وانت مضمون — شقق وفيلات وشاليهات ومكاتب | مضمونة',
  description:
    'ضيف عقارك على مضمونة ببلاش: حماية كاملة، دفع مستحقات سريع، ودعم مستمر 24/7. السعر اللي بتحدده هو اللي بيوصلك.',
  keywords: [
    'تأجير شقق', 'بيع شقق', 'ريسيل عقاري', 'تأجير عقارات في مصر', 'أجر شقتك',
    'شقق للإيجار القاهرة', 'منصة تأجير مضمونة', 'تأجير آمن بدون نصب', 'سماسرة عقارات',
  ],
  openGraph: {
    title: 'أجّر أو بيع عقارك وانت مضمون | مضمونة',
    description: 'ليستنج ببلاش · حماية كاملة · دفع سريع · السعر اللي بتحدده هو اللي بيوصلك.',
    url: 'https://madmonacairo.com/real-estate',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
  alternates: { canonical: 'https://madmonacairo.com/real-estate' },
}

export default function RealEstateLanding() {
  return <RealEstateClient />
}
