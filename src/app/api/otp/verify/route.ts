import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normEgPhone(raw?: string): string | null {
  if (!raw) return null;
  const p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('+20')) return p;
  if (p.startsWith('20') && p.length === 12) return '+' + p;
  if (p.startsWith('0') && p.length === 11) return '+2' + p;
  if (p.startsWith('1') && p.length === 10) return '+20' + p;
  return null;
}

// =====================================================
// POST /api/otp/verify
// Body: { phone: string, code: string, listing_id?: string }
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normEgPhone(body.phone);
    const code = String(body.code || '').trim();

    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'invalid_phone', message: 'رقم تليفون مش صحيح' },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_code', message: 'الكود لازم يكون 6 أرقام' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('verify_phone_otp', {
      p_phone: phone,
      p_code: code,
      p_listing_id: body.listing_id || null,
    });

    if (error) {
      console.error('[otp/verify] RPC error:', error);
      return NextResponse.json(
        { ok: false, error: 'rpc_error', message: error.message },
        { status: 500 }
      );
    }

    // data is the jsonb returned by the RPC
    const result = data as {
      ok: boolean;
      error?: string;
      message?: string;
      verified_at?: string;
      attempts_left?: number;
    };

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[otp/verify] exception:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error', message: msg },
      { status: 500 }
    );
  }
}
