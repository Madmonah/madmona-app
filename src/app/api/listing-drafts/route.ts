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
  let p = String(raw).replace(/[^\d+]/g, '');
  if (p.startsWith('+20')) return p;
  if (p.startsWith('20') && p.length === 12) return '+' + p;
  if (p.startsWith('0') && p.length === 11) return '+2' + p;
  if (p.startsWith('1') && p.length === 10) return '+20' + p;
  return null;
}

// =====================================================
// POST: create a new draft  (with phone-based dedup)
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normEgPhone(body.contact_phone) || body.contact_phone || null;

    // -----------------------------------------------------------------
    // DEDUP: if the same phone already has an open draft created in the
    // last 7 days, return THAT token instead of creating a new row.
    // This stops the duplicate-draft explosion we saw when users tap
    // the WhatsApp link multiple times (e.g. 6 drafts for one car).
    // -----------------------------------------------------------------
    if (phone) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('listing_drafts')
        .select('id, claim_token, status, created_at')
        .eq('contact_phone', phone)
        .in('status', ['draft', 'submitted'])
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Touch updated_at so admin sees they came back
        await supabase
          .from('listing_drafts')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        return NextResponse.json({
          success: true,
          token: existing.claim_token,
          id: existing.id,
          reused: true,
        });
      }
    }

    // Resolve category_id from category_slug if provided
    let category_id: string | null = null;
    if (body.category_slug) {
      const { data } = await supabase
        .from('categories')
        .select('id')
        .or(`slug.eq.${body.category_slug},name_ar.eq.${body.category_slug}`)
        .limit(1)
        .single();
      if (data) category_id = data.id;
    }

    const insertPayload = {
      category_id,
      category_slug: body.category_slug || null,
      title: body.title || null,
      description: body.description || null,
      city: body.city || null,
      district: body.district || null,
      address: body.address || null,
      price: body.price || null,
      price_period: body.price_period || 'daily',
      photos: body.photos || [],
      contact_name: body.contact_name || null,
      contact_phone: phone,
      account_type: body.account_type || 'individual',
      business_name: body.business_name || null,
      source: body.source || 'whatsapp_link',
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      current_step: body.current_step || 1,
      status: body.status || 'draft',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    };

    // Title is required at DB level — fall back to a placeholder for in-progress drafts
    if (!insertPayload.title) insertPayload.title = '(جاري التحرير)';

    const { data, error } = await supabase
      .from('listing_drafts')
      .insert(insertPayload)
      .select('claim_token, id')
      .single();

    if (error) {
      console.error('listing_drafts POST error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      token: data.claim_token,
      id: data.id,
    });
  } catch (e: any) {
    console.error('listing_drafts POST exception:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// =====================================================
// PATCH: update an existing draft by token
// =====================================================
export async function PATCH(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 });
    }

    const body = await req.json();
    const phone = normEgPhone(body.contact_phone) || body.contact_phone || null;

    let category_id: string | null = null;
    if (body.category_slug) {
      const { data } = await supabase
        .from('categories')
        .select('id')
        .or(`slug.eq.${body.category_slug},name_ar.eq.${body.category_slug}`)
        .limit(1)
        .single();
      if (data) category_id = data.id;
    }

    const updatePayload: any = {
      ...(body.category_slug !== undefined && { category_slug: body.category_slug, category_id }),
      ...(body.title !== undefined && { title: body.title || '(جاري التحرير)' }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.city !== undefined && { city: body.city }),
      ...(body.district !== undefined && { district: body.district }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.price_period !== undefined && { price_period: body.price_period }),
      ...(body.photos !== undefined && { photos: body.photos }),
      ...(body.contact_name !== undefined && { contact_name: body.contact_name }),
      ...(body.contact_phone !== undefined && { contact_phone: phone }),
      ...(body.account_type !== undefined && { account_type: body.account_type }),
      ...(body.business_name !== undefined && { business_name: body.business_name }),
      ...(body.current_step !== undefined && { current_step: body.current_step }),
      ...(body.status !== undefined && { status: body.status }),
    };

    const { data, error } = await supabase
      .from('listing_drafts')
      .update(updatePayload)
      .eq('claim_token', token)
      .select('claim_token, id, status')
      .single();

    if (error) {
      console.error('listing_drafts PATCH error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    // If submitted, also fire a WhatsApp confirmation to the user
    if (body.status === 'submitted' && phone) {
      await supabase.from('whatsapp_outbound_queue').insert({
        recipient_phone: phone,
        recipient_name: body.contact_name || 'صديقنا',
        message:
          'استلمنا ليستنجك في *مضمونة* 🎉\n\n' +
          'فريقنا هيراجعه ويتواصل معاك خلال ساعات قليلة.\n\n' +
          'الخطوة التالية: أنشئ حسابك في دقيقة عشان تتحكم في إعلانك:\n' +
          `🔗 https://madmonacairo.com/signup?token=${token}\n\n` +
          'محتاج مساعدة؟ رد على الرسالة دي.\n\n' +
          '— مضمونة 🟢',
        agent_name: 'listing_draft_submitted',
        campaign: 'draft_confirmation',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        metadata: { token, source: 'add_listing_form' },
      });
    }

    return NextResponse.json({
      success: true,
      token: data.claim_token,
      id: data.id,
      status: data.status,
    });
  } catch (e: any) {
    console.error('listing_drafts PATCH exception:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// =====================================================
// GET: fetch a draft by token (for resume / success page)
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('listing_drafts')
      .select('id, claim_token, category_slug, title, description, city, district, price, price_period, photos, contact_name, contact_phone, account_type, business_name, current_step, status, created_at')
      .eq('claim_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, draft: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
