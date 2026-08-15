// src/app/api/admin/wa-safety/route.ts
// ============================================================================
// 🛡️ حدود أمان الإرسال — قراءة وتعديل من الشاشة.
//
// (١٥ أغسطس ٢٠٢٦ — محمد: «حد اليوم / الفاصل / ساعات الإرسال يبقوا ديناميك»)
// الحدود دي كانت متغيرات بيئة على Vercel + أرقام مكتوبة في الكود، فتغييرها
// كان محتاج نشر كامل. دلوقتي في `whatsapp_config` وبتتعدّل من هنا.
//
// 🔒 نفس بوابة باقي راوتات الأدمن (`isAdminRequest`) — كوكي الجلسة أو
//    هيدر الباسورد.
// ============================================================================

import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/adminGate'
import { getSafety, saveSafety, SAFETY_DEFAULTS, type WaSafety } from '@/lib/wa-safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ safety: await getSafety(), defaults: SAFETY_DEFAULTS })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<Record<keyof WaSafety, unknown>>
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 })
  }

  // بناخد الأرقام بس — أي قيمة مش رقم بتتجاهل والقيمة القديمة بتفضل.
  const patch: Partial<WaSafety> = {}
  for (const k of ['maxPerDay', 'minGapSec', 'maxGapSec', 'startHour', 'endHour'] as const) {
    const v = body[k]
    if (v === undefined || v === null || v === '') continue
    const n = Number(v)
    if (Number.isFinite(n)) patch[k] = n
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'مفيش أي قيمة صالحة تتحفظ' }, { status: 400 })
  }

  try {
    // `saveSafety` بيعدّل القيم للحدود المعقولة قبل ما يحفظ، وبيرجّع
    // اللي اتحفظ فعلًا — فالشاشة بتعرض النتيجة الحقيقية مش اللي اتكتب.
    const saved = await saveSafety(patch)
    return NextResponse.json({ ok: true, safety: saved })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}
