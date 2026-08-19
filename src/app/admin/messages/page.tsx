// src/app/admin/messages/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل نظام "الاجينتس" الوهمي بالكامل. الصفحة دي
// كانت log لرسائل بين أجينتس وهمية (agent_messages — كان فاضي أصلا، صفر
// صف) — مش شات واتساب حقيقي رغم اسمها "المحادثات". الشات الحقيقي بواتساب
// موجود في /admin/wa-review و/admin/send و/admin/sending.
// ============================================================================

import { redirect } from 'next/navigation'

export default function AgentMessagesRemoved() {
  redirect('/admin/wa-review')
}
