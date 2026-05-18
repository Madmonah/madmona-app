import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// /api/listing-drafts/attributes
//
// Phase F (May 18 2026): returns the list of attributes (specs/fields)
// that apply to a given category slug. Used by the wizard's StepBasics
// to render a dynamic form section for category-specific data (rooms,
// year, transmission, accepted insurance, etc).
//
// Uses the service role key to bypass RLS — attributes are public
// metadata but the table may have RLS that blocks anon queries.
// =====================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ success: false, error: 'slug required' }, { status: 400 });
    }

    // Resolve category_id from slug
    const { data: category, error: catErr } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('slug', slug)
      .limit(1)
      .single();

    if (catErr || !category) {
      // Not finding the category isn't an error — just return empty
      return NextResponse.json({ success: true, attributes: [] });
    }

    // Fetch attributes for THIS category (typically subs have them).
    // We don't fetch parent main attributes here — if the wizard wants
    // to combine, that's a future enhancement. For now, attributes
    // are expected to live on the leaf category.
    const { data: attrs, error: attrsErr } = await supabase
      .from('attributes')
      .select('id, name_ar, field_key, field_type, options, unit, placeholder, help_text, is_required, is_filterable, display_order')
      .eq('category_id', (category as { id: string }).id)
      .order('is_required', { ascending: false }) // required first
      .order('display_order', { ascending: true });

    if (attrsErr) {
      console.error('attributes GET error:', attrsErr);
      return NextResponse.json({ success: false, error: attrsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      category_id: (category as { id: string }).id,
      attributes: attrs || [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('attributes GET exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
