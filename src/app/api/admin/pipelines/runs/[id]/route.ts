// src/app/api/admin/pipelines/runs/[id]/route.ts
// ١٩ أغسطس ٢٠٢٦ — pipeline_runs/pipeline_step_runs اتمسحوا (نظام ميت، شوف
// /api/admin/pipelines/route.ts للتفاصيل). الراوت ده بقى stub.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ error: 'نظام الـ pipelines اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}
