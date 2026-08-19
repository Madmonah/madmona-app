// src/app/admin/agents/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — agent_registry اتمسح نهائي (٥١ صف وهمي، صفر تشغيل حقيقي
// حديث). جزء من تنضيف نظام الاجينتس بالكامل بأمر محمد.
// ============================================================================

import { redirect } from 'next/navigation'

export default function AgentsRemoved() {
  redirect('/admin/hq')
}
