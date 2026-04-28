import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'مضمونة - Your Space, Guaranteed',
  description: 'Coworking space in Cairo offering indoor, outdoor, private office and meeting room solutions',
  themeColor: '#1F5F3F',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans bg-[#FAFAF7] text-gray-900">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
