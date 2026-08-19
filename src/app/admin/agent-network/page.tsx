// src/app/admin/agent-network/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد: "نوحد الموديل ونشيل الورك-فلو اللي بين الاجينتس"
// الصفحة دي كانت خريطة اتصالات بين agent_registry + agent_pipelines +
// agent_messages + agent_capabilities — كل الجداول دي إما اتمسحت (registry,
// pipelines) أو فاضية أصلا (messages, capabilities). الصفحة بقت مؤكد إنها
// فاضية ١٠٠٪ دايمًا، فبدل ما تفضل خريطة فاضية، بقت redirect لمركز القيادة.
// ============================================================================

import { redirect } from 'next/navigation'

export default function AgentNetworkRemoved() {
  redirect('/admin/hq')
}
