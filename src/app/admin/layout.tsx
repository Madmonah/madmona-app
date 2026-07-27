import type { ReactNode } from 'react'
import AdminNav from '@/components/AdminNav'

// Layout موحّد لكل صفحات الأدمن — بيضيف درج التنقّل المجمّع (AdminNav) فوق أي صفحة
// من غير ما يلمس تخطيطها. غير مدمّر: كل الراوتس تفضل زي ما هي.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AdminNav />
    </>
  )
}
