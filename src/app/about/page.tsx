import { Metadata } from 'next'
import AboutContent from '@/components/AboutContent'

export const metadata: Metadata = {
  title: 'عن مضمونة | Madmona',
  description: 'مضمونة منصة مصرية لحجز المساحات والخدمات بضمان كامل. مساحات عمل، عقارات، مركبات، معدات — كلها في مكان واحد.',
  openGraph: {
    title: 'عن مضمونة | Madmona',
    description: 'مضمونة منصة مصرية لحجز المساحات والخدمات بضمان كامل.',
    url: 'https://madmonacairo.com/about',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
}

export default function AboutPage() {
  return <AboutContent />
}
