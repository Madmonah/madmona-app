// 🔎 (١٠/٩/٢٠٢٦) /title كانت client component من غير metadata — بتطلع لجوجل بعنوان الهوم العام.
// نفس نمط /pro و/start: عنوان بحث + وصف + canonical خاص (القالب في الجذر بيضيف «| مضمونة» لوحده).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'إيه تايتلك على مضمونة؟ ارفع صورة من شغلك ونقولك',
  description: 'ارفع صورة من شغلك أو مكانك والموديل يقولك تايتلك إيه: صاحب ورشة، صاحب عيادة، صاحب مطعم… أي شغل مش عيب — العيب إن مالكش شغل. الصورة مابتتخزنش.',
  alternates: { canonical: 'https://www.madmonacairo.com/title' },
  openGraph: { title: 'إيه تايتلك على مضمونة؟', description: 'ارفع صورة من شغلك ونقولك تايتلك — أي شغل مش عيب.', url: 'https://www.madmonacairo.com/title', siteName: 'مضمونة', locale: 'ar_EG', type: 'website' },
}

export default function TitleLayout({ children }: { children: React.ReactNode }) { return children }
