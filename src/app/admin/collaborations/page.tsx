// src/app/admin/collaborations/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — agent_collaborations اتمسح (٤ صفوف من مايو، كلها واقفة
// عند in_progress/active للأبد، مفيش نتيجة حقيقية). جزء من تنضيف نظام
// الاجينتس الوهمي بالكامل.
// ============================================================================

import { redirect } from 'next/navigation'

export default function CollaborationsRemoved() {
  redirect('/admin/hq')
}
