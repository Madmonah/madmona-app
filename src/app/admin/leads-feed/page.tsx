// src/app/admin/leads-feed/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد: "عندي 3 صفحات ليدز، إيه الفرق بينهم؟"
// leads-feed كانت نسخة قديمة وأضيق (sales_leads بس، مش الـ 5 مصادر) من
// /admin/leads، وفيها لينك بايظ لـ /admin/agents (اتمسحت). بدل ما نمسح كل
// اللينكات اللي بتشاور عليها من صفحات تانية (overview/command-center/
// funnel/ai-os/ad-builder/marketing-hq/hq/insights)، بنحوّلها لصفحة الليدز
// الموحّدة اللي فيها كل المصادر + عمود "سجّل؟" الحقيقي.
// ============================================================================

import { redirect } from 'next/navigation'

export default function LeadsFeedRedirect() {
  redirect('/admin/leads')
}
