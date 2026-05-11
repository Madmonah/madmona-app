// app/api/admin/wa-review/send/route.ts
// Approve and send a pending_review draft. Optionally with an edited body.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Mirror of the webhook's brand-name protection
function enforceBrandName(text: string): string {
  if (!text) return text;
  return text
    .replace(/مدمونة/g, 'مضمونة')
    .replace(/مدمونه/g, 'مضمونة')
    .replace(/مظمونة/g, 'مضمونة')
    .replace(/مظمونه/g, 'مضمونة')
    .replace(/مذمونة/g, 'مضمونة')
    .replace(/متمونة/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
    .replace(/\/categories\//g, '/marketplace/')
    .replace(/\/list-your-asset/g, '/add-listing')
    .replace(/\/supplier\/register/g, '/add-listing');
}

async function getMetaCreds() {
  const { data } = await supabase
    .from('whatsapp_config')
    .select('key, value')
    .in('key', ['phone_number_id', 'access_token']);
  const m = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
  return { phone_id: m.phone_number_id, token: m.access_token };
}

async function sendWhatsAppText(toPhone: string, body: string) {
  const { phone_id, token } = await getMetaCreds();
  const cleanedBody = enforceBrandName(body);
  // Meta expects to-phone without the leading +
  const to = toPhone.startsWith('+') ? toPhone.slice(1) : toPhone;
  const r = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: cleanedBody, preview_url: true },
    }),
  });
  const data = await r.json();
  if (!r.ok) return { error: data?.error?.message || `HTTP ${r.status}`, wa_id: null as string | null };
  return { error: null as string | null, wa_id: data?.messages?.[0]?.id || null };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draft_id, edited_body } = body as { draft_id: string; edited_body?: string };

    if (!draft_id) {
      return NextResponse.json({ error: 'draft_id required' }, { status: 400 });
    }

    // Load the draft + its conversation phone
    const { data: draft, error: dErr } = await supabase
      .from('whatsapp_messages')
      .select(`id, body, status, conversation_id,
        conversation:whatsapp_conversations!inner(contact_phone)`)
      .eq('id', draft_id)
      .single();

    if (dErr || !draft) {
      return NextResponse.json({ error: 'draft not found' }, { status: 404 });
    }
    if ((draft as any).status !== 'pending_review') {
      return NextResponse.json({ error: 'draft is not pending_review' }, { status: 400 });
    }

    const finalBody = enforceBrandName(edited_body || (draft as any).body);
    const phone = (draft as any).conversation.contact_phone as string;

    // Send via Meta
    const result = await sendWhatsAppText(phone, finalBody);

    // Update the draft message: status = sent (or failed), set wa_message_id, set final body
    const newStatus = result.error ? 'failed' : 'sent';
    await supabase
      .from('whatsapp_messages')
      .update({
        body: finalBody,
        status: newStatus,
        wa_message_id: result.wa_id,
        status_updated_at: new Date().toISOString(),
        error_message: result.error,
        metadata: {
          ...(((draft as any).metadata as object) || {}),
          approved_at: new Date().toISOString(),
          was_edited: !!edited_body && edited_body !== (draft as any).body,
        },
      })
      .eq('id', draft_id);

    // Update conversation
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_direction: 'outbound',
        last_outbound_at: new Date().toISOString(),
      })
      .eq('id', (draft as any).conversation_id);

    return NextResponse.json({
      ok: !result.error,
      wa_id: result.wa_id,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown' }, { status: 500 });
  }
}
