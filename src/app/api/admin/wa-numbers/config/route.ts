// src/app/api/admin/wa-numbers/config/route.ts
// إعداد المارد لكل رقم واتساب — قراءة/حفظ سياق (persona) وتشغيل (enabled) لكل رقم.
// محمي بكوكي الأدمن (نفس /admin). الجدول: public.wa_number_configs.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export const dynamic = 'force-dynamic'

function authed(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_VALUE
}

// قايمة كل إعدادات الأرقام
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wa_number_configs')
    .select('session_id, label, persona, enabled, updated_at')
    .order('session_id', { ascending: true })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, configs: data ?? [] })
}

// حفظ إعداد رقم (upsert) — { session_id, label?, persona?, enabled? }
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: { session_id?: string; label?: string; persona?: string; enabled?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const session_id = (body.session_id || '').trim().slice(0, 40)
  if (!session_id) {
    return NextResponse.json({ ok: false, error: 'session_id مطلوب' }, { status: 400 })
  }

  // بنضم بس الحقول اللي اتبعتت — الباقي يفضل زي ما هو (على التحديث) أو الافتراضي (على الإدخال)
  const row: Record<string, unknown> = { session_id, updated_at: new Date().toISOString() }
  if (typeof body.label === 'string') row.label = body.label.slice(0, 80)
  if (typeof body.persona === 'string') row.persona = body.persona.slice(0, 6000)
  if (typeof body.enabled === 'boolean') row.enabled = body.enabled

  const { data, error } = await supabase
    .from('wa_number_configs')
    .upsert(row as never, { onConflict: 'session_id' })
    .select('session_id, label, persona, enabled, updated_at')
    .maybeSingle()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, config: data })
}
