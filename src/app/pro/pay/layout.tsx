import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// 💳 /pro/pay — الدفع بتحويل يدوي (إنستاباي · فودافون كاش · بنكي) لبرنامج الإدارة (١١/٩/٢٠٢٦)
// العنوان من غير «| مضمونة» — القالب في الجذر بيضيفها.
export const metadata: Metadata = {
  title: 'فعّل برنامج الإدارة — ادفع بإنستاباي أو فودافون كاش',
  description: 'حوّل قيمة برنامج إدارة مضمونة بإنستاباي أو فودافون كاش أو تحويل بنكي، ارفع إثبات الدفع، وبيتفعّل بعد المراجعة.',
  alternates: { canonical: '/pro/pay' },
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: ReactNode }) { return children }
