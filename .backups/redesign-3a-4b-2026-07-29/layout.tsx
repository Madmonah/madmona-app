import type { Metadata, Viewport } from 'next'
import ChatNotificationGate from '@/components/ChatNotificationGate'
import InstallChatPWA from '@/components/InstallChatPWA'

// أيقونة الشات لوحدها على التليفون: مانيفست خاص بالشات (id مستقل، بيفتح على /chat)
// بيتحمّل كتطبيق منفصل اسمه "شات مضمونة" غير تطبيق المنصة الرئيسي.
export const metadata: Metadata = {
  title: 'شات مضمونة',
  manifest: '/chat-manifest.webmanifest',
  appleWebApp: { capable: true, title: 'شات مضمونة', statusBarStyle: 'default' },
  icons: { apple: '/marid-apple-180.png' },
}

export const viewport: Viewport = {
  themeColor: '#075E54',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatNotificationGate />
      <InstallChatPWA />
    </>
  )
}
