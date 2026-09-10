// 🔎 (١٠/٩/٢٠٢٦) metadata لصفحة التسجيل الذاتي
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ضيف شركتك على مضمونة — حساب بيزنس في دقيقتين',
  description: 'اكتب بيانات شركتك، وثّق رقمك بالواتساب أو ادخل بجوجل، وحسابك وحساب شركتك يتعملوا مع بعض. من غير باسورد ومن غير دفع دلوقتي.',
  alternates: { canonical: 'https://www.madmonacairo.com/start' },
  robots: { index: true, follow: true },
}

export default function StartLayout({ children }: { children: React.ReactNode }) { return children }
