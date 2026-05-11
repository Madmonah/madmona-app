// app/api/admin/wa-review/route.ts
// List all WhatsApp drafts awaiting human review, joined with their conversation context.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all pending_review messages with their conversation
    const { data: drafts, error: dErr } = await supabase
      .from('whatsapp_messages')
      .select(`
        id, body, created_at, conversation_id, ai_generated, metadata, agent_name,
        conversation:whatsapp_conversations!inner(
          id, contact_phone, contact_name, contact_type,
          first_intent, first_category, ad_headline, last_inbound_at
        )
      `)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(50);

    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }

    // For each draft, also fetch the LAST 5 messages from its conversation as context
    const enriched = await Promise.all(
      (drafts || []).map(async (d: any) => {
        const { data: history } = await supabase
          .from('whatsapp_messages')
          .select('direction, body, ai_generated, created_at')
          .eq('conversation_id', d.conversation_id)
          .neq('status', 'pending_review')
          .order('created_at', { ascending: false })
          .limit(5);

        const lastInbound = (history || []).find((m: any) => m.direction === 'inbound');

        return {
          draft_id: d.id,
          draft_body: d.body,
          drafted_at: d.created_at,
          drafted_by: d.ai_generated ? 'AI' : (d.agent_name === 'claude_human_review' ? 'Claude (chat)' : 'Human'),
          metadata: d.metadata || {},
          conversation: {
            id: d.conversation_id,
            phone: d.conversation.contact_phone,
            name: d.conversation.contact_name,
            type: d.conversation.contact_type,
            intent: d.conversation.first_intent,
            category: d.conversation.first_category,
            ad_headline: d.conversation.ad_headline,
            last_inbound_at: d.conversation.last_inbound_at,
          },
          last_inbound_text: lastInbound?.body || null,
          history: (history || []).reverse(), // chronological
        };
      })
    );

    // Counts for header stats
    const { count: totalPending } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    return NextResponse.json({
      drafts: enriched,
      total_pending: totalPending || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
