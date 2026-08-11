// app/pulse/page.tsx
// =====================================================================
// MADMONA PULSE — the daily engagement page (May 16 2026)
// Mohamed: "اعمل افضل حاجة... تشد المستخدم بحيث تخليه يفضل يتابعنا يوميا"
//
// Four psychological mechanics on one screen:
//   1. FOMO         → Daily Drop card with live countdown to midnight
//   2. Habit        → Streak badge (Duolingo) + reward modal at milestones
//   3. Social Proof → Live activity ticker (auto-scrolls, last 24h)
//   4. Personal     → "اختيارات النهارده" (3 picks; trending fallback if anon)
//
// One-shot data fetch via get_pulse_feed RPC. Visit is recorded on mount
// (signed-in users only) which increments their streak.
// =====================================================================

import { Suspense } from 'react';
import PulseClient from './PulseClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'نبض مضمونة — صفقة اليوم + شوف اللي بيحصل في السوق',
  description:
    'صفقة اليوم اللي بتخلص في ٢٤ ساعة، نشاط السوق لحظة بلحظة، واختيارات مخصوصة ليك يومياً. ادخل كل يوم تحافظ على streak مكافآتك.',
};

export default function PulsePage() {
  return (
    <Suspense fallback={<PulseFallback />}>
      <PulseClient />
    </Suspense>
  );
}

function PulseFallback() {
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      <header className="px-5 pt-6 pb-4 border-b border-[#E5E5E0]">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold tracking-tight">مضمونة</div>
            <span className="text-xs text-[#FA8125] uppercase tracking-widest">PULSE</span>
          </div>
          <a href="/" className="text-xs text-[#6B7280] hover:text-[#1A2E26]">← الرئيسية</a>
        </div>
      </header>
      <main className="px-5 py-12 max-w-3xl mx-auto text-center">
        <div className="text-4xl mb-4 animate-pulse">⚡</div>
        <p className="text-[#6B7280]">جاري تحضير نبض اليوم...</p>
      </main>
    </div>
  );
}
