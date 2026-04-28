import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'مضمونة - Your Space, Guaranteed',
  description: 'مساحة عمل مشتركة في مصر الجديدة، القاهرة - داخلي وخارجي، مكاتب خاصة وقاعات اجتماعات',
  metadataBase: new URL('https://madmonacairo.com'),
  openGraph: {
    title: 'مضمونة - مساحة عمل مشتركة',
    description: 'مساحتك اللي بتخصك في مصر الجديدة',
    url: 'https://madmonacairo.com',
    siteName: 'مضمونة',
    locale: 'ar_EG',
    type: 'website',
  },
}

// Next.js 14 wants themeColor and viewport in a separate export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1F5F3F',
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
        <SpeedInsights />
      </body>
    </html>
  )
}
