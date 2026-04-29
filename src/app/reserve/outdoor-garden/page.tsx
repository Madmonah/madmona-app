import SinglePlanReserve from '@/components/SinglePlanReserve'

export const metadata = {
  title: 'احجز الجاردن',
  description: 'احجز يوم في الجاردن — مساحة عمل في الهواء الطلق بـ ٦٥ جنيه',
}

export default function ReserveGardenPage() {
  return (
    <SinglePlanReserve
      spaceSlug="outdoor-garden"
      spaceName="الجاردن"
      pricingPlan="daily"
      price={65}
      unitLabel="يوم كامل في الجاردن"
      description="مساحة عمل في الهواء الطلق · واي فاي · مشروبات · يوم كامل"
      dateLabel="تاريخ الحضور"
    />
  )
}
