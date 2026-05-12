// app/api/admin/listing-drafts/route.ts
// Admin API for the drafts dashboard. Add proper auth in production.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  // TODO: enforce admin auth — check session cookie or a header
  // For now: this route is intended for an admin-only path. Lock it behind your
  // existing middleware or add an env-based check before going to production.

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

    let query = supabase
      .from('listing_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: drafts, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Funnel summary (last 7 days)
    const { data: funnel } = await supabase
      .from('v_listing_drafts_funnel')
      .select('*')
      .order('day', { ascending: false })
      .limit(7);

    return NextResponse.json({ drafts: drafts || [], funnel: funnel || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
