import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// =====================================================================
// /api/daily-messages
//
// GET  → returns today's message for the current user
//        (logged-in: uses get_daily_message_for_user RPC for rotation)
//        (anonymous: picks a random active message — no view tracking)
//
// POST → records an interaction:
//        body: { message_id, action: 'view' | 'dismiss' | 'cta_click' }
//        (only for logged-in users; anonymous interactions ignored)
// =====================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function getUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    if (!accessToken) {
      // Try alternate cookie name (Supabase versions vary)
      const allCookies = cookieStore.getAll();
      const sbCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
      if (!sbCookie) return null;
    }
    // Use the anon client to read user from JWT (Supabase handles cookies automatically when given browser-like headers)
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    if (accessToken) {
      const { data } = await supabaseAnon.auth.getUser(accessToken);
      return data?.user?.id ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  try {
    const userId = await getUserId();

    if (userId) {
      // Logged-in: use the rotation RPC
      const { data, error } = await supabaseAdmin.rpc('get_daily_message_for_user', {
        p_user_id: userId,
      });
      if (error) {
        console.error('daily-messages RPC error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      const message = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return NextResponse.json({ success: true, message, authenticated: true });
    }

    // Anonymous: random active message, no view tracking
    const { data: messages, error } = await supabaseAdmin
      .from('daily_messages')
      .select('id, title, body, category, image_url, cta_label, cta_url, deal_code, priority')
      .eq('is_active', true)
      .or('start_date.is.null,start_date.lte.' + new Date().toISOString().slice(0, 10))
      .or('end_date.is.null,end_date.gte.' + new Date().toISOString().slice(0, 10))
      .order('priority', { ascending: false })
      .limit(20);

    if (error) {
      console.error('daily-messages anonymous error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, message: null, authenticated: false });
    }

    // Weighted random by priority (higher priority = more likely)
    const totalWeight = messages.reduce((sum, m) => sum + Math.max(1, m.priority + 1), 0);
    let r = Math.random() * totalWeight;
    let chosen = messages[0];
    for (const m of messages) {
      r -= Math.max(1, m.priority + 1);
      if (r <= 0) {
        chosen = m;
        break;
      }
    }

    // Strip priority before returning (internal only)
    const { priority: _p, ...message } = chosen as typeof chosen & { priority: number };
    return NextResponse.json({
      success: true,
      message: { ...message, already_viewed: false },
      authenticated: false,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('daily-messages GET exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      // Anonymous interaction tracking is silently dropped — not an error
      return NextResponse.json({ success: true, tracked: false });
    }

    const body = await req.json();
    const messageId = body.message_id as string | undefined;
    const action = body.action as 'view' | 'dismiss' | 'cta_click' | undefined;

    if (!messageId || !action) {
      return NextResponse.json(
        { success: false, error: 'message_id and action required' },
        { status: 400 }
      );
    }

    // Upsert the view record + update timestamps based on action
    const now = new Date().toISOString();
    const patch: Record<string, string | null> = { viewed_at: now };
    if (action === 'dismiss') patch.dismissed_at = now;
    if (action === 'cta_click') patch.cta_clicked_at = now;

    const { error } = await supabaseAdmin
      .from('user_message_views')
      .upsert(
        {
          user_id: userId,
          message_id: messageId,
          ...patch,
        },
        { onConflict: 'user_id,message_id', ignoreDuplicates: false }
      );

    if (error) {
      console.error('daily-messages POST error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tracked: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('daily-messages POST exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
