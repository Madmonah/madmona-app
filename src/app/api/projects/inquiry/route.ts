// src/app/api/projects/inquiry/route.ts
// =====================================================================
// 📩 تسجيل استفسار عن مشروع — بينده لحظة ما الزائر يدوس «اسأل عن المشروع ده».
// الرسالة اللي بيروح بيها على الواتساب فيها كود المشروع (MDM-xxxxxxxx)،
// وتريجر match_project_inquiry في الداتابيز بيربط المحادثة بالصف ده
// أول ما الرسالة توصل — فبنعرف كل استفسار عن أنهي مشروع بالظبط.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { sbProjects as supabase } from '@/lib/supabaseProjects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let b: { project_id?: string; source?: string }
  try {
    b = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const projectId = String(b.project_id || '')
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    return NextResponse.json({ error: 'project_id غلط' }, { status: 400 })
  }

  const { data: proj } = await supabase
    .from('property_market_items')
    .select('id, slug, title, developer')
    .eq('id', projectId)
    .maybeSingle()

  if (!proj) return NextResponse.json({ error: 'المشروع مش موجود' }, { status: 404 })

  const { error } = await supabase.from('project_inquiries').insert({
    project_id: proj.id,
    project_slug: proj.slug,
    project_title: proj.title,
    developer: proj.developer,
    source: String(b.source || 'bourse_card').slice(0, 40),
    channel: 'whatsapp',
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
    referrer: (req.headers.get('referer') || '').slice(0, 300),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
