// src/app/admin/workflows/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — agent_workflows اتمسح (٦ صفوف من مايو، كلها in_progress
// للأبد، مفيش تشغيل حقيقي). جزء من تنضيف نظام الاجينتس بالكامل بأمر محمد.
// ============================================================================

import { redirect } from 'next/navigation'

export default function WorkflowsRemoved() {
  redirect('/admin/hq')
}
