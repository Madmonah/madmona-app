import type { MetadataRoute } from 'next'

// PWA manifest — lets users "Add to Home Screen" on mobile and have the
// site behave like a native app (its own icon, splash screen, no browser
// chrome). Scoped to the root domain.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'مضمونة - Your Space, Guaranteed',
    short_name: 'مضمونة',
    description: 'مساحة عمل بوتيك في مصر الجديدة. مساحتك اللي بتخصك.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF7',
    theme_color: '#1F6F5F',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    categories: ['business', 'productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
