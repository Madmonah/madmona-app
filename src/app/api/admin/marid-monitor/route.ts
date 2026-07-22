// app/api/admin/marid-monitor/route.ts
// مراقبة حية: آخر المحادثات اللي المارد بيرد فيها (ويب + واتساب) — أدمن فقط.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // 🔒 أدمن بس — نفس كوكي حارس /admin
  if (req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_SESSION_VALUE) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const { data: convs, error } = await supabase
      .from('whatsapp_conversations')
      .select('id, contact_name, contact_phone, session_id, status, last_message_at, last_message_direction, message_count')
      .order('last_message_at', { ascending: false })
      .limit(40)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const rows = await Promise.all(
      (convs || []).map(async (c: { id: string; contact_name: string | null; contact_phone: string; session_id: string | null; status: string | null; last_message_at: string | null; last_message_direction: string | null; message_count: number | null }) => {
        const { data: msgs } = await supabase
          .from('whatsapp_messages')
          .select('direction, body, ai_generated, created_at, message_type')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(30)
        return {
          id: c.id,
          name: c.contact_name,
          phone: c.contact_phone,
          channel: c.session_id === 'web' ? 'ويب' : (c.session_id || '—'),
          status: c.status,
          last_at: c.last_message_at,
          waiting: c.last_message_direction === 'inbound',
          messages: (msgs || []).reverse(),
        }
      }),
    )

    return NextResponse.json({ ok: true, conversations: rows })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}
