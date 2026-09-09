'use client'
// 🧭 (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة».
//    الشاشة دي كانت عايشة بره اللوحة (/supplier/erp/materials) — نفس الكومبوننت
//    بيتركّب هنا بمعرّف البيزنس من المسار. مفيش نسختين.
import MaterialsPage from '@/app/supplier/erp/materials/page'

export default function Page({ params }: { params: { supplierId: string } }) {
  return <MaterialsPage supplierId={params.supplierId} />
}
