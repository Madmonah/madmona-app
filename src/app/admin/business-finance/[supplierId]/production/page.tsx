'use client'
// 🧭 (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة».
//    الشاشة دي كانت عايشة بره اللوحة (/supplier/erp/production) — نفس الكومبوننت
//    بيتركّب هنا بمعرّف البيزنس من المسار. مفيش نسختين.
import ProductionPage from '@/app/supplier/erp/production/page'

export default function Page({ params }: { params: { supplierId: string } }) {
  return <ProductionPage supplierId={params.supplierId} />
}
