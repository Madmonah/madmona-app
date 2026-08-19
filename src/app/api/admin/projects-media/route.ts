// =====================================================================
// 🗂️ /api/admin/projects-media — جرد الميديا لكل مشروع
// بيجمع: المشروع + كل صوره وملفاته اللي وصلت المارد على واتساب
// عشان الأدمن يشوف إيه اللي عندنا وإيه اللي مربوط وإيه الناقص.
// (13 Jul 2026)
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

const tail10 = (p: string) => (p || '').replace(/\D/g, '').slice(-10)

// نفس بوابة الأدمن المستخدمة في /api/projects
async function isAdmin(req: NextRequest): Promise<boolean> {
  if (await isAdminRequest(req)) return true
  const s = req.headers.get('x-projects-secret') || ''
  const expected = process.env.PROJECTS_API_SECRET || ''
  return !!expected && s === expected
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = sb()

  const { data: projects } = await db
    .from('property_market_items')
    .select(
      'id, slug, title, developer, area_label, price_from, price_to, cover_url, ' +
      'brochure_url, video_url, note, unit_label, payment_plan, is_active, status, ' +
      'embargoed, source_lead_phone, updated_at',
    )
    .order('updated_at', { ascending: false })

  // كل الميديا الواردة من الواتساب
  const { data: msgs } = await db
    .from('whatsapp_messages')
    .select('id, created_at, message_type, body, metadata, conversation_id')
    .eq('direction', 'inbound')
    .in('message_type', ['image', 'document', 'video'])
    .order('created_at', { ascending: false })
    .limit(600)

  const { data: convos } = await db
    .from('whatsapp_conversations')
    .select('id, contact_phone, contact_name')

  const convById = new Map((convos || []).map((c) => [(c as { id: string }).id, c]))

  type Media = { url: string; kind: string; name: string; at: string; phone: string; from: string }
  const byPhone = new Map<string, Media[]>()

  for (const m of msgs || []) {
    const meta = (m as { metadata?: Record<string, string> }).metadata || {}
    const url = meta.image_url || meta.document_url || meta.video_url
    if (!url) continue
    const conv = convById.get((m as { conversation_id: string }).conversation_id) as
      | { contact_phone?: string; contact_name?: string }
      | undefined
    if (!conv?.contact_phone) continue
    const t = tail10(conv.contact_phone)
    if (!byPhone.has(t)) byPhone.set(t, [])
    byPhone.get(t)!.push({
      url,
      kind: (m as { message_type: string }).message_type,
      name: meta.document_name || (m as { body?: string }).body?.slice(0, 60) || '',
      at: (m as { created_at: string }).created_at,
      phone: conv.contact_phone,
      from: conv.contact_name || '',
    })
  }

  const rows = (projects || []).map((p) => {
    const t = tail10((p as { source_lead_phone?: string }).source_lead_phone || '')
    const media = byPhone.get(t) || []
    const usedUrls = new Set(
      [
        (p as { cover_url?: string }).cover_url,
        (p as { brochure_url?: string }).brochure_url,
        (p as { video_url?: string }).video_url,
      ].filter(Boolean) as string[],
    )
    return {
      ...(p as object),
      owner: media[0]?.from || '',
      media_available: media.length,
      media_unlinked: media.filter((m) => !usedUrls.has(m.url)).length,
      media: media.slice(0, 40),
      gaps: [
        !(p as { cover_url?: string }).cover_url ? 'صورة' : null,
        (p as { price_from?: number }).price_from == null ? 'سعر' : null,
        !(p as { brochure_url?: string }).brochure_url ? 'بروشور' : null,
      ].filter(Boolean),
    }
  })

  return NextResponse.json({ count: rows.length, projects: rows })
}
