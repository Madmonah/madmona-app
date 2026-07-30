import type { Metadata, Viewport } from 'next'
import ChatNotificationGate from '@/components/ChatNotificationGate'
import InstallChatPWA from '@/components/InstallChatPWA'

// /team جزء من «شات مضمونة» بس ساكن بره مسار /chat — فلولا الـlayout ده
// كان المتصفح بياخد manifest الرئيسي والتثبيت بيطلع باسم «مضمونة» (30 يوليو 2026).
// نطاق chat-manifest اتوسّع لـ"/" مع start_url=/chat عشان يشمل /team كمان.
export const metadata: Metadata = {
  title: 'شات مضمونة — جروبات',
  manifest: '/chat-manifest.webmanifest',
  appleWebApp: { capable: true, title: 'شات مضمونة', statusBarStyle: 'default' },
  icons: { apple: '/marid-apple-180.png' },
}

export const viewport: Viewport = {
  themeColor: '#14231E',
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ChatNotificationGate />
      <InstallChatPWA />
      {children}
    </>
  )
}
