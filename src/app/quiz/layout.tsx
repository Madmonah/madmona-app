// 🧩 (١٥/٩/٢٠٢٦) محمد: «الأرقام وحشة جدًا — حاجة تفيرال أو أسئلة أو حاجة تلم كومنتس».
// اختبار «إنت صاحب بيزنس نوعه إيه؟» — ٦ أسئلة، نتيجة بتتشارك، وCTA لـ/start. صفحة ثابتة، صفر API.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'اختبار دقيقة: إنت صاحب بيزنس نوعه إيه؟',
  description: '٦ أسئلة عن طريقة إدارتك لشغلك — واعرف إنت «الشايل كل حاجة في دماغه» ولا «المطافي» ولا «المنظّم». شارك نتيجتك واعرف صحابك نوعهم إيه.',
  alternates: { canonical: 'https://www.madmonacairo.com/quiz' },
  openGraph: {
    title: 'إنت صاحب بيزنس نوعه إيه؟ اختبار دقيقة واحدة',
    description: '٦ أسئلة وتعرف نوعك — وشارك النتيجة.',
    url: 'https://www.madmonacairo.com/quiz', siteName: 'مضمونة', locale: 'ar_EG', type: 'website',
  },
}

export default function QuizLayout({ children }: { children: React.ReactNode }) { return children }
