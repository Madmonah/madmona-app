// src/app/api/admin/commissions/route.ts
// ============================================================================
// 💰 عمولة كل قسم — قراءة وتعديل من الشاشة.
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «كل قسم ليه العمولة بتاعته»)
//
// GET  → القواعد + كام قسم وكام إعلان منشور واقع تحت كل قاعدة، عشان
//        محمد يشوف الرقم اللي هيتأثر قبل ما يغيّر.
// POST → تعديل قيمة/نوع/شرح أي قاعدة.
//
// ⚠️ الشاشة بتعدّل **القاعدة** مش القسم. ٤٠٥ قسم بيقعوا تحت ٥ قواعد،
//    فتعديل واحد بيمشي على القسم وكل اللي تحته من غير ما حد يفتكر يظبط
//    الأبناء — وده اللي كان بيوقّعنا في الأقسام قبل كده.
// ============================================================================

import { NextResponse } from 'next/server'
import { supabaseUntyped as supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/adminGate'
import {
  getCommissionRules,
  clearCommissionCache,
  commissionPromptBlock,
  type CommissionKind,
} from '@/lib/commission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS: CommissionKind[] = ['percent', 'flat', 'months', 'manual']

/** كام قسم وكام إعلان منشور تحت كل قاعدة — الأثر الحقيقي للتغيير. */
async function impact(): Promise<Record<string, { categories: number; listings: number }>> {
  const out: Record<string, { categories: number; listings: number }> = {}
  try {
    const { data } = await supabaseAdmin.rpc('commission_rule_impact')
    for (const r of (data ?? []) as Array<{ key: string; categories: number; listings: number }>) {
      out[r.key] = { categories: Number(r.categories) || 0, listings: Number(r.listings) || 0 }
    }
  } catch {
    // الأرقام دي للعرض بس — لو الدالة مش موجودة الشاشة تشتغل من غيرها.
  }
  return out
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [rules, counts, preview] = await Promise.all([
      getCommissionRules(true),
      impact(),
      commissionPromptBlock(),
    ])
    return NextResponse.json({ rules, impact: counts, prompt_preview: preview })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { key?: string; kind?: string; value?: number | string; label_ar?: string; note_ar?: string | null }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'JSON غير صالح' }, { status: 400 })
  }

  const key = (body.key ?? '').trim()
  if (!key) return NextResponse.json({ error: 'مفتاح القاعدة مطلوب' }, { status: 400 })

  const kind = (body.kind ?? '') as CommissionKind
  if (!KINDS.includes(kind)) return NextResponse.json({ error: 'نوع العمولة غير معروف' }, { status: 400 })

  const value = Number(body.value)
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: 'القيمة لازم تكون رقم موجب' }, { status: 400 })
  }
  // ⛔ نسبة فوق ١٠٠٪ معناها إن المورد بيدفع أكتر من اللي أخده. المبلغ
  //    الثابت مالوش سقف طبيعي، فبنسيبه — بس بنمنع الرقم المستحيل.
  if (kind === 'percent' && value > 100) {
    return NextResponse.json({ error: 'النسبة مايصحّش تعدّي ١٠٠٪' }, { status: 400 })
  }
  if (kind === 'months' && value > 12) {
    return NextResponse.json({ error: 'عدد الشهور مايعدّيش ١٢' }, { status: 400 })
  }

  const label = (body.label_ar ?? '').trim()
  if (!label || label.length > 200) {
    return NextResponse.json({ error: 'الشرح اللي المارد هيقوله مطلوب' }, { status: 400 })
  }
  const note = typeof body.note_ar === 'string' ? body.note_ar.trim().slice(0, 1000) || null : null

  try {
    const { error } = await supabaseAdmin
      .from('commission_rules')
      .update({ kind, value, label_ar: label, note_ar: note, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (error) throw new Error(error.message)

    // الكاش بتاع البرومبت لازم يتفضّى، وإلا المارد هيفضل يقول الرقم
    // القديم لحد دقيقة — وده بالظبط النوع اللي بيوصل للعميل.
    clearCommissionCache()

    const [rules, counts, preview] = await Promise.all([
      getCommissionRules(true),
      impact(),
      commissionPromptBlock(),
    ])
    return NextResponse.json({ ok: true, rules, impact: counts, prompt_preview: preview })
  } catch (e) {
    const err = e as Error
    return NextResponse.json({ error: 'Failed', detail: err?.message || String(e) }, { status: 500 })
  }
}
