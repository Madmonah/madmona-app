// الحسابات والقيود — redirect لموديول المحاسبة الكامل (قيود مزدوجة · قوائم مالية · استيراد Excel)
// الموديول نفسه في /supplier/erp/accounting — الصفحة دي مجرد كارت وصول من الـ back-office.
import { redirect } from 'next/navigation'

export default function AccountingRedirect({ params }: { params: { supplierId: string } }) {
  redirect(`/supplier/erp/accounting?supplier=${params.supplierId}`)
}
