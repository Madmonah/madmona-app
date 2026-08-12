import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// =====================================================
// POST /api/listing-drafts/claim
// Headers: Authorization: Bearer <supabase access token>   ← 🔒 مطلوب
// Body: { token }
// Called after user completes signup. Converts the draft into:
//   - marketplace_supplier (if not exists)
//   - listing (status='pending_review')
//   - pricing_rule
//   - listing_photos
//
// 🔒 (١٢ أغسطس ٢٠٢٦ — مراجعة الأمان) المسار كان بياخد profile_id من
// البودي من غير أي auth — يعني أي حد شاف لينك ?token=… (بيتبعت في
// الواتساب) كان يقدر يستولي على درافت غيره ويربطه بحسابه هو.
// دلوقتي: لازم Bearer token صالح، والدرافت بيتربط بصاحب التوكن نفسه —
// مفيش profile_id من البودي خالص.
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!bearer) {
      return NextResponse.json({ success: false, error: 'auth required' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    if (userErr || !userData?.user) {
      return NextResponse.json({ success: false, error: 'invalid token' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'token required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('claim_listing_draft', {
      p_claim_token: token,
      p_profile_id: userData.user.id,
    });

    if (error) {
      console.error('claim_listing_draft error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
