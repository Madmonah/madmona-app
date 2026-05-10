import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// =====================================================
// POST /api/listing-drafts/claim
// Body: { token, profile_id }
// Called after user completes signup. Converts the draft into:
//   - marketplace_supplier (if not exists)
//   - listing (status='pending_review')
//   - pricing_rule
//   - listing_photos
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const { token, profile_id } = await req.json();
    if (!token || !profile_id) {
      return NextResponse.json(
        { success: false, error: 'token and profile_id required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('claim_listing_draft', {
      p_claim_token: token,
      p_profile_id: profile_id,
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
