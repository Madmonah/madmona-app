import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import BusinessLoungeClient from './BusinessLoungeClient'

export const metadata = {
  title: 'بورصة رجال الأعمال | مضمونة',
  description: 'أخبار مضمونة + أسعار العملات والذهب لحظيًا — في مكان واحد',
}

export default function BusinessLoungePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <div className="hidden md:block">
        <TopNav />
      </div>
      <BusinessLoungeClient />
      <BottomNav />
    </div>
  )
}
