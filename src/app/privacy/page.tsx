import { Metadata } from 'next'
import PrivacyContent from '@/components/PrivacyContent'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | مضمونة',
  description: 'سياسة الخصوصية لمنصة Madmona Marketplace — كيف نتعامل مع بياناتك الشخصية.',
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
