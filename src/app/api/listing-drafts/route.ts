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

// ─────────────────────────────────────────────────────────────────────
// Shared helper: build the listing_drafts UPDATE payload from request body
// Only includes keys explicitly present in body (avoids accidentally
// nulling fields the wizard didn't intend to change).
// ─────────────────────────────────────────────────────────────────────
async function buildUpdatePayload(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const phone = normEgPhone(body.contact_phone as string | undefined) || (body.contact_phone as string | undefined) || null;

  // Resolve category_id from category_slug if provided
  let category_id: string | null = null;
  if (body.category_slug) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .or(`slug.eq.${body.category_slug},name_ar.eq.${body.category_slug}`)
      .limit(1)
      .single();
    if (data) category_id = (data as { id: string }).id;
  }

  const payload: Record<string, unknown> = {};
  if (body.category_slug !== undefined) {
    payload.category_slug = body.category_slug;
    payload.category_id = category_id;
  }
  // NOTE: title falls back to placeholder ONLY when explicitly sent empty.
  // If the body doesn't include title at all, we don't touch the DB column.
  if (body.title !== undefined)        payload.title         = body.title || '(جاري التحرير)';
  if (body.description !== undefined)  payload.description   = body.description;
  if (body.city !== undefined)         payload.city          = body.city;
  if (body.district !== undefined)     payload.district      = body.district;
  // 🐞 (١٥ أغسطس ٢٠٢٦) `address` كان ناقص من الـPATCH ده — الـPOST بيمرّره
  //    و`claim_listing_draft` بينقله للإعلان، بس الحفظ خطوة-بخطوة كان
  //    بيرميه. يعني حتى لو الفورم سأل عن العنوان، مايوصلش. (تبويب «الموقع»
  //    في صفحة الإعلان بيعتمد عليه — ٣٥٠ من ٣٧٨ إعلان منشور من غير موقع.)
  if (body.address !== undefined)      payload.address       = body.address;
  // 🗺️ (١٥ أغسطس ٢٠٢٦) الإحداثيات — العمودين موجودين في `listing_drafts`
  //    و`claim_listing_draft` بينقلهم للإعلان، بس **مفيش راوت ولا فورم كان
  //    بيلمسهم**. عشان كده ٣٧٤ من ٣٧٨ إعلان منشور من غير خريطة.
  if (body.latitude !== undefined)     payload.latitude      = body.latitude;
  if (body.longitude !== undefined)    payload.longitude     = body.longitude;
  if (body.price !== undefined)        payload.price         = body.price;
  if (body.price_period !== undefined) payload.price_period  = body.price_period;
  if (body.photos !== undefined)       payload.photos        = body.photos;
  if (body.contact_name !== undefined) payload.contact_name  = body.contact_name;
  if (body.contact_phone !== undefined) payload.contact_phone = phone;
  if (body.account_type !== undefined) payload.account_type  = body.account_type;
  if (body.business_name !== undefined) payload.business_name = body.business_name;
  if (body.current_step !== undefined) payload.current_step  = body.current_step;
  if (body.status !== undefined)       payload.status        = body.status;
  if (body.utm_source !== undefined)   payload.utm_source    = body.utm_source;
  if (body.utm_medium !== undefined)   payload.utm_medium    = body.utm_medium;
  if (body.utm_campaign !== undefined) payload.utm_campaign  = body.utm_campaign;
  if (body.attributes !== undefined)   payload.attributes    = body.attributes;

  return payload;
}

// =====================================================
// POST: create a new draft  (with phone-based dedup that MERGES new data)
// =====================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normEgPhone(body.contact_phone) || body.contact_phone || null;

    // -----------------------------------------------------------------
    // DEDUP-AND-MERGE: if the same phone already has an open draft created
    // in the last 7 days, MERGE the new body into that draft (instead of
    // just touching updated_at). This fixes the bug where users restarting
    // from a new device or after localStorage clear were silently losing
    // every field they typed in this new session.
    // -----------------------------------------------------------------
    if (phone) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('listing_drafts')
        .select('id, claim_token, status, created_at, converted_listing_id')
        .eq('contact_phone', phone)
        .in('status', ['draft', 'submitted', 'claimed'])
        .is('converted_listing_id', null)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const mergePayload = await buildUpdatePayload(body);
        // Always bump updated_at so admin sees the activity
        mergePayload.updated_at = new Date().toISOString();

        await supabase
          .from('listing_drafts')
          .update(mergePayload)
          .eq('id', (existing as { id: string }).id);

        return NextResponse.json({
          success: true,
          token: (existing as { claim_token: string }).claim_token,
          id: (existing as { id: string }).id,
          reused: true,
          merged_fields: Object.keys(mergePayload).filter(k => k !== 'updated_at'),
        });
      }
    }

    // -----------------------------------------------------------------
    // No existing match → create a fresh draft
    // -----------------------------------------------------------------
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
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('listing_drafts POST exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// =====================================================
// PATCH: update an existing draft by token
// =====================================================
export async function PATCH(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      console.error('[listing-drafts PATCH] missing token in query');
      return NextResponse.json({ success: false, error: 'token required' }, { status: 400 });
    }

    const body = await req.json();
    
    // Log incoming body (truncated) for debugging silent data loss
    const bodyKeys = Object.keys(body).filter(k => body[k] !== undefined);
    console.log(`[listing-drafts PATCH] token=${token.slice(0,8)}... step=${body.current_step} fields=[${bodyKeys.join(',')}] title="${(body.title || '').slice(0,30)}"`);
    
    const updatePayload = await buildUpdatePayload(body);

    const { data, error } = await supabase
      .from('listing_drafts')
      .update(updatePayload)
      .eq('claim_token', token)
      .select('claim_token, id, status, contact_phone, contact_name')
      .single();

    if (error) {
      console.error(`[listing-drafts PATCH] DB error token=${token.slice(0,8)} step=${body.current_step}:`, error.message, error.code);
      // Also write to a debug table so we can audit failures
      await supabase.from('listing_drafts_failures').insert({
        token,
        step: body.current_step,
        error_code: error.code,
        error_message: error.message,
        body_keys: bodyKeys,
        body_snapshot: body,
      }).then(({ error: insertErr }) => {
        if (insertErr) console.error('[listing-drafts PATCH] failed to log failure:', insertErr.message);
      });
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    console.log(`[listing-drafts PATCH] OK token=${token.slice(0,8)} step=${body.current_step} dur=${Date.now()-startedAt}ms`);

    // If submitted, also fire a WhatsApp confirmation to the user
    if (body.status === 'submitted' && (data as { contact_phone?: string }).contact_phone) {
      const recipPhone = (data as { contact_phone: string }).contact_phone;
      const recipName = (data as { contact_name?: string }).contact_name || body.contact_name || 'صديقنا';
      await supabase.from('whatsapp_outbound_queue').insert({
        recipient_phone: recipPhone,
        recipient_name: recipName,
        message:
          'استلمنا منتجك في *مضمونة* 🎉\n\n' +
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('listing_drafts PATCH exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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

    // Phase F (May 18 2026): also return attributes + pricing_tiers for full
    // wizard hydration on resume. Without these the user loses their
    // category-specific specs when returning to a draft.
    const { data, error } = await supabase
      .from('listing_drafts')
      .select('id, claim_token, category_slug, title, description, city, district, price, price_period, pricing_tiers, photos, contact_name, contact_phone, account_type, business_name, current_step, status, created_at, attributes')
      .eq('claim_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, draft: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
