// src/app/api/admin/pipelines/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل "الورك-فلو اللي بين الاجينتس".
// agent_pipelines/pipeline_runs/pipeline_step_runs اتمسحوا من الداتابيز
// (كانوا سيناريوهات JSON بتربط أجينتس وهمية من agent_registry اللي اتمسح
// الصبح، وصفر تشغيل حقيقي من ١١ يونيو ٢٠٢٦). الراوت ده بقى stub بيرجّع
// قايمة فاضية بدل ما يرمي 500.
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    pipelines: [],
    recent_runs: [],
    removed: true,
    note: 'نظام الـ pipelines اتشال ١٩ أغسطس ٢٠٢٦ — كان مربوط بأجينتس وهمية ومفيش تشغيل حقيقي من شهرين.',
  })
}
