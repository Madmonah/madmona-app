'use client'
// 🧭 (٩/٩/٢٠٢٦) محمد: «خلي كل حاجة تودّي على اللوحة الكاملة».
//    الشاشة دي كانت عايشة بره اللوحة (/supplier/erp/products) — نفس الكومبوننت
//    بيتركّب هنا بمعرّف البيزنس من المسار. مفيش نسختين.
import ProductsPage from '@/app/supplier/erp/products/page'

export default function Page({ params }: { params: { supplierId: string } }) {
  return <ProductsPage supplierId={params.supplierId} />
}
