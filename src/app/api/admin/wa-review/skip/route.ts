// app/api/admin/wa-review/skip/route.ts
// Mark a pending_review draft as skipped (won't be sent).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draft_id, reason } = body as { draft_id: string; reason?: string };
    if (!draft_id) {
      return NextResponse.json({ error: 'draft_id required' }, { status: 400 });
    }

    const { data: draft, error: dErr } = await supabase
      .from('whatsapp_messages')
      .select('id, status, metadata')
      .eq('id', draft_id)
      .single();

    if (dErr || !draft) {
      return NextResponse.json({ error: 'draft not found' }, { status: 404 });
    }
    if ((draft as any).status !== 'pending_review') {
      return NextResponse.json({ error: 'draft is not pending_review' }, { status: 400 });
    }

    await supabase
      .from('whatsapp_messages')
      .update({
        status: 'skipped',
        status_updated_at: new Date().toISOString(),
        metadata: {
          ...(((draft as any).metadata as object) || {}),
          skipped_at: new Date().toISOString(),
          skip_reason: reason || 'no reason given',
        },
      })
      .eq('id', draft_id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
