import type { Metadata, Viewport } from 'next'

/* Per-route metadata so that "Add to Home Screen" from /elite installs an
   Elite-branded shortcut (logo icon + name) for quick booking. */

export const metadata: Metadata = {
  title: 'Elite Beauty Salon & Spa | مضمونة',
  description: 'احجزي في Elite — حجز فوري، أمان كامل، على منصّة مضمونة',
  manifest: '/elite.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Elite',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/brand/elite-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/elite-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/brand/elite-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#FA8125',
}

export default function EliteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
