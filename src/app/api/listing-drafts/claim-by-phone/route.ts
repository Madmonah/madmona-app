import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// =====================================================
// POST /api/listing-drafts/claim-by-phone
// Headers: Authorization: Bearer <supabase access token>   ← 🔒 مطلوب
// Claims ALL submitted/draft listings matching the CALLER'S OWN verified
// phone number (from their profile) under their own profile.
//
// 🔒 (١٢ أغسطس ٢٠٢٦ — مراجعة الأمان) المسار كان بياخد {phone, profile_id}
// من البودي من غير أي auth — يعني مهاجم يبعت رقم تليفون ضحية + الـprofile
// بتاعه هو، وياخد ملكية كل درافتات الضحية. دلوقتي: لازم Bearer token،
// والرقم بيتقري من بروفايل صاحب التوكن نفسه — مفيش أي مدخلات من البودي.
// (النداء الداخلي من complete-phone بقى بينده الـRPC مباشرة مش الـHTTP.)
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
    const userId = userData.user.id;

    // الرقم من بروفايل المستخدم نفسه — مش من البودي
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .maybeSingle();
    const phone = (profile as { phone?: string } | null)?.phone;
    if (!phone) {
      return NextResponse.json({ success: false, error: 'no phone on profile' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('claim_all_drafts_for_phone', {
      p_phone: phone,
      p_profile_id: userId,
    });

    if (error) {
      console.error('claim_all_drafts_for_phone error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
