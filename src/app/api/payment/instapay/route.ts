import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================================
// /api/payment/instapay
//
// GET → returns saved bank-transfer payment config from site_settings.
//
// HISTORY:
//   May 18 2026 v1: built around InstaPay Collect Money links.
//   May 18 2026 v2 (this file): pivoted to bank transfer mode because
//     Mohamed's corporate account can't generate InstaPay app links.
//     Now exposes bank_name + account + holder + optional IPA/IBAN.
//     Customer transfers via their own banking app (InstaPay-compatible).
//
// Endpoint name kept as /api/payment/instapay for backward compatibility
// with existing booking page integration. Returned shape extended, not
// broken — old callers keep working.
// =====================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'instapay_enabled',
        'instapay_account_number',
        'instapay_holder_name',
        'instapay_ipa',
        'instapay_payment_link',
        'instapay_qr_image_url',
        'payment_bank_name',
        'payment_iban',
        'payment_swift',
        'payment_wallets',
      ]);

    if (error) {
      console.error('payment/instapay error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value || '';
    });

    // Parse mobile-wallet list (Vodafone Cash, Orange Cash, e& Cash, WE Pay...)
    // Only expose wallets that are enabled AND have a number filled in.
    type Wallet = { key: string; label: string; number: string; enabled?: boolean };
    let wallets: { key: string; label: string; number: string }[] = [];
    try {
      const raw = settings['payment_wallets'];
      if (raw) {
        const parsed = JSON.parse(raw) as Wallet[];
        wallets = (parsed || [])
          .filter((w) => w && w.enabled && w.number && String(w.number).trim())
          .map((w) => ({ key: w.key, label: w.label, number: String(w.number).trim() }));
      }
    } catch (e) {
      console.error('payment/instapay: bad payment_wallets JSON:', e);
    }

    return NextResponse.json({
      success: true,
      enabled: settings['instapay_enabled'] === 'true',
      account_number: settings['instapay_account_number'] || '',
      holder_name: settings['instapay_holder_name'] || '',
      bank_name: settings['payment_bank_name'] || '',
      ipa: settings['instapay_ipa'] || '',
      payment_link: settings['instapay_payment_link'] || '',
      qr_image_url: settings['instapay_qr_image_url'] || '',
      iban: settings['payment_iban'] || '',
      swift: settings['payment_swift'] || '',
      wallets,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    console.error('payment/instapay exception:', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
