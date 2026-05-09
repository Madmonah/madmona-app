import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مضمونة | احنا بتوع الإيجار',
  description: 'منصة الإيجار الأكبر في مصر — شقق، سيارات، كاميرات، معدات. مع حماية كاملة ودفع سريع.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdLandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
