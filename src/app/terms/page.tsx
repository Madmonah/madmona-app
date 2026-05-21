import { Metadata } from 'next'
import TermsContent from '@/components/TermsContent'

export const metadata: Metadata = {
  title: 'الشروط والأحكام | مضمونة',
  description: 'الشروط والأحكام لاستخدام منصة Madmona Marketplace.',
}

export default function TermsPage() {
  return <TermsContent />
}
