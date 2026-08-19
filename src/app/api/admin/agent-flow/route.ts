// src/app/api/admin/agent-flow/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل "الورك-فلو اللي بين الاجينتس". الراوت ده كان
// بيتحكم في "موظفين AI" وهميين تحت مضمونة (agent_registry + business_employees
// employee_type='ai_agent') — الجدولين اتمسحوا والصفوف اتمسحت. مفيش أي كود
// بينادي على الراوت ده دلوقتي (كان بس من AgentModal في صفحة فريق مضمونة
// اللي اتشالت). بقى stub.
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json({ error: 'نظام موظفين الـ AI اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}
