// 🏷️ (٤ سبتمبر ٢٠٢٦) محمد بعد التيست: «عنوان التاب لسه العام».
//    صفحات الـERP كلها 'use client' فمالهاش metadata — التاب كان بيقول
//    «مضمونة | معاملاتك مضمونة…» زي أي صفحة، فلو فاتح كذا تاب
//    مش بتفرّق بينهم. الـlayout ده سيرفر فبيقدر يحط عنوان حقيقي.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'نظام الإدارة — مضمونة',
  robots: { index: false, follow: false },
}

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
