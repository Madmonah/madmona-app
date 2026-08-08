import type { ReactNode } from 'react'
import AdminShell from '@/components/AdminShell'

// Layout موحّد لكل صفحات الأدمن — تصميم «Madmona Admin v2» (أغسطس 2026):
// توب بار + سايدبار ثابت + سيرش شامل (AdminShell)، بيتطبق على كل الراوتس تحت /admin
// (الأوفرفيو، الورك فلو، وكل صفحات الأدمن) من غير ما يلمس محتوى أي صفحة.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
