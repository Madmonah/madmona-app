import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side admin client (uses service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Normalize Egyptian phone to +20XXXXXXXXXX
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
// POST /api/otp/send
// Body: { phone: string, listing_id?: string }
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normEgPhone(body.phone);
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: 'invalid_phone', message: 'رقم تليفون مش صحيح' },
        { status: 400 }
      );
    }

    // Rate limiting: max 3 OTP sends per phone per 15 minutes
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('phone_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', fifteenMinAgo);

    if ((recentCount || 0) >= 3) {
      return NextResponse.json(
        {
          ok: false,
          error: 'rate_limited',
          message: 'استنى شوية، بعتلك كود تاني خلال 15 دقيقة',
        },
        { status: 429 }
      );
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Insert phone_verifications row
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      null;

    const { error: insErr } = await supabase
      .from('phone_verifications')
      .insert({
        phone,
        code,
        expires_at: expiresAt,
        listing_id: body.listing_id || null,
        created_ip: ip,
      });

    if (insErr) {
      console.error('[otp/send] insert error:', insErr);
      return NextResponse.json(
        { ok: false, error: 'db_error', message: 'مشكلة فنية، حاول كمان شوية' },
        { status: 500 }
      );
    }

    // Queue WA message with the code
    const message =
      `كود التأكيد الخاص بـ *مضمونة* هو:\n\n` +
      `*${code}*\n\n` +
      `الكود صالح لمدة 10 دقايق.\n` +
      `لو مش انت اللي طلبته، تجاهل الرسالة دي.\n\n` +
      `— مضمونة 🟢`;

    const { error: queueErr } = await supabase
      .from('whatsapp_outbound_queue')
      .insert({
        recipient_phone: phone,
        message,
        agent_name: 'otp_verification',
        campaign: 'phone_verification',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        metadata: { listing_id: body.listing_id || null, kind: 'otp' },
      });

    if (queueErr) {
      console.error('[otp/send] queue error:', queueErr);
      // Don't fail — the code is in DB. Admin can manually deliver if needed.
    }

    return NextResponse.json({
      ok: true,
      message: 'بعتنالك كود على الواتس اب',
      expires_in_seconds: 600,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('[otp/send] exception:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error', message: msg },
      { status: 500 }
    );
  }
}
