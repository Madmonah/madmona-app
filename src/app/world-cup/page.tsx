import { Suspense } from 'react'
import WorldCupClient from './WorldCupClient'

// ============================================================
// /world-cup — نتايج كأس العالم 2026 لايف
// Public engagement page (like /pulse) + food cross-sell.
// ============================================================

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'نتايج كأس العالم 2026 لايف — مضمونة',
  description:
    'تابع نتايج مباريات كأس العالم 2026 لحظة بلحظة: ماتشات النهارده، النتايج لايف، وجدول الأيام الجاية. واطلب أكل الماتش من مطاعم مضمونة.',
}

export default function WorldCupPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WorldCupClient />
    </Suspense>
  )
}

function Fallback() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-sm font-bold text-[#2B4521]">⚽ بنجيب النتايج...</p>
    </div>
  )
}
