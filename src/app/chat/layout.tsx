import type { Metadata, Viewport } from 'next'
import ChatNotificationGate from '@/components/ChatNotificationGate'
import InstallChatPWA from '@/components/InstallChatPWA'
import AttendancePulse from '@/components/AttendancePulse'

// أيقونة الشات لوحدها على التليفون: مانيفست خاص بالشات (id مستقل، بيفتح على /chat)
// بيتحمّل كتطبيق منفصل اسمه "شات مضمونة" غير تطبيق المنصة الرئيسي.
export const metadata: Metadata = {
  title: 'شات مضمونة',
  manifest: '/chat-manifest.webmanifest',
  appleWebApp: { capable: true, title: 'شات مضمونة', statusBarStyle: 'default' },
  icons: { apple: '/marid-apple-180.png' },
}

export const viewport: Viewport = {
  // 🎨 (29 Jul 2026) إعادة تصميم 4b — لون شريط الحالة = هيدر الشات الغامق الجديد
  themeColor: '#14231E',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatNotificationGate />
      <InstallChatPWA />
      {/* ⏱️ (٢٣ أغسطس ٢٠٢٦ — محمد: «بيسجل انصراف والابليكيشن مفتوح»)
          النبضة كانت في /account/work بس، فأول ما الموظف يفتح الشات أو
          التاسكات كانت بتقف والنظام يحسبه خرج بعد ١٠ دقايق. الشات هو
          المكان اللي الفريق قاعد فيه طول اليوم، فالنبضة لازم تعيش هنا. */}
      <AttendancePulse />
    </>
  )
}
