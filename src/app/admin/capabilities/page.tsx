// src/app/admin/capabilities/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — agent_capabilities اتمسح (٥٠ صف بنفس أسماء الأجينتس
// الوهمية من agent_registry اللي اتمسح). جزء من تنضيف نظام الاجينتس الوهمي.
// ============================================================================

import { redirect } from 'next/navigation'

export default function CapabilitiesRemoved() {
  redirect('/admin/hq')
}
