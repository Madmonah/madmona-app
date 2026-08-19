// src/app/admin/performance/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — agent_performance_metrics اتمسح (١٨٣ صف، نفس أسماء
// الأجينتس الوهمية، آخر حساب يوليو ٢٠٢٦). جزء من تنضيف نظام الاجينتس بالكامل.
// ============================================================================

import { redirect } from 'next/navigation'

export default function PerformanceRemoved() {
  redirect('/admin/hq')
}
