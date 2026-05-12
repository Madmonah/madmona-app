// app/api/admin/listing-drafts/nudge/route.ts
// Send a friendly WhatsApp nudge to a draft owner

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { data: draft, error } = await supabase
      .from('listing_drafts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: 'draft not found' }, { status: 404 });
    }

    const msg =
      `أهلاً ${draft.contact_name || ''} 👋\n\n` +
      `وصلنا إعلانك "${draft.title}" — كل حاجة تمام.\n\n` +
      `باقي خطوة واحدة بس: اعمل حسابك على مضمونة عشان تقدر تتحكم في إعلانك وتستقبل طلبات الإيجار.\n\n` +
      `🔗 https://madmonacairo.com/signup?token=${draft.claim_token}\n\n` +
      `بياخد دقيقة واحدة. ولو محتاج مساعدة، رد على الرسالة دي.\n\n` +
      `— مضمونة 🟢`;

    const { error: qErr } = await supabase
      .from('whatsapp_outbound_queue')
      .insert({
        recipient_phone: draft.contact_phone,
        recipient_name: draft.contact_name || 'صديقنا',
        message: msg,
        agent_name: 'admin_nudge',
        campaign: 'draft_nudge_manual',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        metadata: { draft_id: draft.id, token: draft.claim_token },
      });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
