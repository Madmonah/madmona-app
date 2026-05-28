import { redirect } from 'next/navigation'

/* ============================================================
   /admin/flow-tasks — DEPRECATED (28 May 2026)
   نُقلت المهام لتبقى tab داخل الـ company hub.
   نخلي المسار القديم redirect للجديد عشان أي لينك قديم ما يكسرش.
   ============================================================ */

export default function FlowTasksRedirect() {
  redirect('/admin/business-finance/c8b7b9d7-6178-4d0c-abdf-66f34b628e9d/flow-tasks')
}
