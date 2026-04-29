import SinglePlanReserve from '@/components/SinglePlanReserve'

export const metadata = {
  title: 'احجز المكتب الخاص',
  description: 'اشتراك شهري للمكتب الخاص — حتى ٨ أشخاص بـ ١٢٠٠٠ جنيه/شهر',
}

export default function ReservePrivateOfficePage() {
  return (
    <SinglePlanReserve
      spaceSlug="private-office"
      spaceName="المكتب الخاص"
      pricingPlan="monthly"
      price={12000}
      unitLabel="اشتراك شهر كامل"
      description="مكتب مغلق · حتى ٨ أشخاص · تكييف منفصل · خزانة"
      dateLabel="تاريخ بداية الاشتراك"
    />
  )
}
