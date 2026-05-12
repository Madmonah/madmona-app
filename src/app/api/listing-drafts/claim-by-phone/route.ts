import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// =====================================================
// POST /api/listing-drafts/claim-by-phone
// Body: { phone, profile_id }
// Claims ALL submitted/draft listings matching the phone number under
// the given profile. Use after signup so users with multiple drafts
// (e.g. 3 cars on different days) get all of them linked at once.
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const { phone, profile_id } = await req.json();
    if (!phone || !profile_id) {
      return NextResponse.json(
        { success: false, error: 'phone and profile_id required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('claim_all_drafts_for_phone', {
      p_phone: phone,
      p_profile_id: profile_id,
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
