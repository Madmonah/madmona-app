// src/app/api/agents/scheduler/route.ts
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد طلب نشيل نظام الاجينتس الوهمي بالكامل. الراوت ده
// كان بيعتمد على pick_due_agents() اللي بتقرا من agent_registry (اتمسح)،
// وكان بيوجّه لـ booking-manager/daily-report/quality-control — آخر تشغيل
// حقيقي ليهم كان قبل ١٢-١٧ يوم من التنضيف أصلا (مفيش حد مستني عليه).
// اتشال cron من vercel.json. الراوت بقى stub بيرجع 410 بدل ما يرمي خطأ
// حقيقي كل يوم (كان بيقرا من جدول ممسوح).
// ============================================================================

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ removed: true, note: 'نظام scheduler الاجينتس اتشال ١٩ أغسطس ٢٠٢٦' })
}

export async function POST() {
  return NextResponse.json({ error: 'نظام scheduler الاجينتس اتشال ١٩ أغسطس ٢٠٢٦' }, { status: 410 })
}
