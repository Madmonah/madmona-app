import { redirect } from 'next/navigation'

/* ============================================================
   /admin/custody — DEPRECATED (28 May 2026)
   نُقلت العهدة لتبقى tab داخل الـ company hub.
   نخلي المسار القديم redirect للجديد عشان أي لينك قديم ما يكسرش.
   ============================================================ */

export default function CustodyRedirect() {
  redirect('/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d/custody')
}
