// src/app/api/admin/flow/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل نظام الاجينتس والورك-فلو الوهمي بالكامل.
// كان ده محرك تشغيل flows مبنية فوق agent_pipelines (اتمسح) — المستدعي
// الوحيد ليه كان قسم "🔗 الـ Flows" في صفحة فريق مضمونة، واللي اتشال.
// بقى stub.
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'محرك الـ Flows اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: 'محرك الـ Flows اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}
