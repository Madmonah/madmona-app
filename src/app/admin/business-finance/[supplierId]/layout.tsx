// 🏷️ (٤ سبتمبر ٢٠٢٦) عنوان تاب حقيقي للوحة الإدارة — شوف التعليق في
//    src/app/supplier/erp/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'لوحة الإدارة — مضمونة',
  robots: { index: false, follow: false },
}

export default function BusinessFinanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
