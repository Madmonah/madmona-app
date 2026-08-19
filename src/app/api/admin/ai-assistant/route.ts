// src/app/api/admin/ai-assistant/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل نظام "الاجينتس" الوهمي بالكامل. الراوت ده
// كان بيترجم أوامر بالعامية لخطط تشغيل ضد كتالوج ٤٦ أجينت وهمي (نفس أسماء
// agent_registry اللي اتمسح)، وكان بيكتب في agent_workflows (اتمسح) و
// agent_runs. بقى stub — مفيش أجينتس حقيقية يتوجهلها الأمر.
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json({ error: 'المساعد الذكي (نظام الأجينتس الوهمي) اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}

export async function GET() {
  return NextResponse.json({ rows: [], removed: true })
}
