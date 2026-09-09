'use client'
// 🧭 (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة».
//    الشاشة دي كانت عايشة بره اللوحة (/supplier/erp/catalog) — نفس الكومبوننت
//    بيتركّب هنا بمعرّف البيزنس من المسار. مفيش نسختين.
import CatalogPage from '@/app/supplier/erp/catalog/page'

export default function Page({ params }: { params: { supplierId: string } }) {
  return <CatalogPage supplierId={params.supplierId} />
}
