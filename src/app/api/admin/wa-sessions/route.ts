// src/app/api/admin/wa-sessions/route.ts
// ============================================================================
// 📱 قايمة أرقام واتساب وحالتها — من **OpenWA** مباشرة.
//
// 🚨 (١٥ أغسطس ٢٠٢٦) الملف ده كان بيقرا من `WA_SERVICE_URL` — جسر Baileys
//    **اللي اتشال من رايلواي**. يعني `/admin/wa-numbers` كانت بتوريك أرقام
//    من نظام مش موجود، أو تفشل بـ«فشل الاتصال بخدمة المارد».
//
//    نفس نوع العطل بتاع `/admin/leads` (جدول مش موجود) و`transport: 'baileys'`
//    الافتراضي — صفحة شغالة على مصدر ميت. التلاتة اتكشفوا في نفس اليوم.
//
//    دلوقتي بيقرا من OpenWA، اللي هو **فعلًا** اللي بيبعت.
//
// ⚠️ إضافة/حذف رقم وتغيير البروكسي كانوا بيعدّوا على الجسر المشال — بقوا
//    بيرجّعوا خطأ واضح بدل ما يفشلوا في صمت. الربط بيتعمل من لوحة OpenWA.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENWA_URL = (process.env.OPENWA_URL || '').replace(/\/$/, '')
const OPENWA_KEY = process.env.OPENWA_API_KEY || ''

interface OpenWaSession {
  id?: string
  name?: string
  phone?: string | number
  status?: string
}

/** قايمة الأرقام وحالتها الحية */
export async function GET() {
  if (!OPENWA_URL || !OPENWA_KEY) {
    return NextResponse.json(
      { ok: false, error: 'OPENWA_URL أو OPENWA_API_KEY ناقص', sessions: [] },
      { status: 500 },
    )
  }

  try {
    const res = await fetch(`${OPENWA_URL}/api/sessions`, {
      headers: { 'x-api-key': OPENWA_KEY },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `OpenWA رد ${res.status}`, sessions: [] },
        { status: 502 },
      )
    }
    const list = (await res.json()) as OpenWaSession[]

    // اللابل من `wa_number_configs` لو موجود — مش بيوقف العرض لو فشل
    const labels: Record<string, string> = {}
    try {
      const { data } = await supabaseUntyped
        .from('wa_number_configs')
        .select('session_id, label')
      for (const r of (data as Array<{ session_id: string; label: string | null }> | null) ?? []) {
        if (r.label) labels[r.session_id] = r.label
      }
    } catch { /* اختياري */ }

    const sessions = (Array.isArray(list) ? list : []).map((s) => {
      const name = String(s.name ?? s.id ?? '—')
      const phone = s.phone != null ? String(s.phone).replace(/\D/g, '') : null
      const status = String(s.status ?? 'unknown')
      return {
        id: name,
        label: labels[name] || (phone ? labels[phone] : '') || name,
        connected: status === 'ready',
        me: phone,
        status,
        // OpenWA بيعرض الـQR في لوحته — مش عندنا
        waiting_for_qr: status === 'qr' || status === 'initializing',
      }
    })

    return NextResponse.json({ ok: true, sessions, source: 'openwa' })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'فشل الاتصال بـOpenWA', sessions: [] },
      { status: 502 },
    )
  }
}

// ── العمليات اللي كانت على الجسر المشال ─────────────────────────────────────
// بترجّع خطأ صريح بدل ما تضرب في خدمة مش موجودة وترجع 404 غامض.
const GONE = {
  ok: false,
  error:
    'إضافة/حذف الأرقام وتغيير البروكسي كانوا على جسر Baileys اللي اتشال. ' +
    'الربط دلوقتي بيتعمل من لوحة OpenWA مباشرة.',
}

export async function POST() {
  return NextResponse.json(GONE, { status: 501 })
}

export async function PUT() {
  return NextResponse.json(GONE, { status: 501 })
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(GONE, { status: 501 })
}
