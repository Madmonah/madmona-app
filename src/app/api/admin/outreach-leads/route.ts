// app/api/admin/outreach-leads/route.ts
// =====================================================================
// Madmona Admin — Outreach Leads Funnel API
// Queries v_outreach_leads_funnel + v_outreach_funnel_summary views.
// Supports filtering by stage, type, source.
// =====================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const stage = url.searchParams.get('stage'); // funnel stage filter
    const type = url.searchParams.get('type'); // 'business' | 'individual'
    const source = url.searchParams.get('source'); // 'cold_leads' | 'restaurant_leads' | 'claim_outreach_log'
    const search = url.searchParams.get('q'); // name/phone search
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 1000);

    // ١) Get summary
    const { data: summary, error: sErr } = await supabase
      .from('v_outreach_funnel_summary')
      .select('*');

    if (sErr) {
      console.error('[outreach-leads] summary error:', sErr);
    }

    // ٢) Get leads (filtered)
    let query = supabase
      .from('v_outreach_leads_funnel')
      .select('*')
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (stage) query = query.eq('funnel_stage', stage);
    if (type) query = query.eq('expected_type', type);
    if (source) query = query.like('sources', `%${source}%`);
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: leads, error: lErr } = await query;

    if (lErr) {
      console.error('[outreach-leads] leads error:', lErr);
      return NextResponse.json({ error: lErr.message }, { status: 500 });
    }

    return NextResponse.json({
      summary: summary || [],
      leads: leads || [],
      total: leads?.length || 0,
    });
  } catch (e: any) {
    console.error('[outreach-leads] exception:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH: update lead status / mark as spam / not interested
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { phone, action } = body as { phone?: string; action?: string };

    if (!phone || !action) {
      return NextResponse.json({ error: 'phone + action required' }, { status: 400 });
    }

    const validActions = ['mark_spam', 'mark_not_interested', 'mark_interested', 'reset'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    const intentMap: Record<string, string | null> = {
      mark_spam: 'spam',
      mark_not_interested: 'not_interested',
      mark_interested: 'interested',
      reset: null,
    };

    const newIntent = intentMap[action];

    // Update the WhatsApp conversation for this phone
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ first_intent: newIntent, updated_at: new Date().toISOString() })
      .eq('contact_phone', phone);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
