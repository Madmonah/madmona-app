import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'مضمونة | معاملاتك مضمونة',
  description: 'سوق مصر المضمون — أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين. حماية كاملة ودفع سريع.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdLandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
