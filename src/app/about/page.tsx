import { Metadata } from 'next'
import AboutContent from '@/components/AboutContent'

export const metadata: Metadata = {
  title: 'عن مضمونة | Madmona',
  description: 'مضمونة — سوق مصر المضمون. أجّر، اشتري، واحجز خدمات ومطاعم وبيوتي من موردين موثوقين، بحماية كاملة. معاملاتك مضمونة.',
  openGraph: {
    title: 'عن مضمونة | Madmona',
    description: 'مضمونة — سوق مصر المضمون. أجّر، اشتري، واحجز بحماية كاملة. معاملاتك مضمونة.',
    url: 'https://madmonacairo.com/about',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
}

export default function AboutPage() {
  return <AboutContent />
}
