import type { ReactNode } from 'react'
import AdminShell from '@/components/AdminShell'
import AdminGuard from '@/components/AdminGuard'

// Layout موحّد لكل صفحات الأدمن — تصميم «Madmona Admin v2» (أغسطس 2026):
// توب بار + سايدبار ثابت + سيرش شامل (AdminShell)، بيتطبق على كل الراوتس تحت /admin
//
// 🔐 (٢٨ أغسطس ٢٠٢٦) محمد: «الموردين اللي مش في مضمونة لما بيفتح لوحة
//    الإدارة بتجيله أدوات الأدمن بانيل بتاعة مضمونة… فيه أدوات بتفتح معاه».
//    AdminGuard بيتحقق إنه موظف مضمونة قبل أي شاشة — واللي مش موظف
//    بيتوجّه لنظام إدارة بيزنسه هو (/supplier/erp) مش رسالة رفض.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  )
}
