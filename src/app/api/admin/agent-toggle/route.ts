// src/app/api/admin/agent-toggle/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — نفس تنضيف "الاجينتس": agent_registry اتمسح، والراوت ده
// كان بيشغّل/يوقف صفوفه أو يحط agent_runs في الطابور لأجينتس وهمية مفيهاش
// تشغيل حقيقي. مفيش استدعاء حقيقي ليه بعد ما اتشال AIOSControls من صفحة
// /admin/ai-os. بقى stub.
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json({ error: 'نظام الاجينتس اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}

export async function PUT() {
  return NextResponse.json({ error: 'نظام الاجينتس اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}
