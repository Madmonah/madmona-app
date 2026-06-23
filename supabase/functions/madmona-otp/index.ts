// Unified Madmona Account — WhatsApp OTP sender (OPEN SIGNUP for any phone)
// v4 (2026-06-04): verify_jwt=false to unblock anonymous signups.
// Rate limit (3 codes / 10 min per phone) enforced inside madmona_request_otp RPC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { phone, full_name } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: 'رقم مطلوب' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Generate code (open signup — works for any phone, greets by known name).
    // Per-phone rate limit (3 / 10 min) lives inside madmona_request_otp RPC.
    const { data: otp, error: rpcErr } = await supabase.rpc('madmona_request_otp', {
      p_phone: phone, p_full_name: full_name ?? null,
    })
    if (rpcErr) {
      return new Response(JSON.stringify({ success: false, error: rpcErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!otp?.success) {
      return new Response(JSON.stringify(otp), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) Read WhatsApp credentials from whatsapp_config
    const { data: cfgRows, error: cfgErr } = await supabase
      .from('whatsapp_config').select('key, value')
      .in('key', ['access_token', 'phone_number_id'])
    if (cfgErr || !cfgRows) {
      return new Response(JSON.stringify({ success: false, error: 'تعذّر قراءة إعدادات واتساب' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const cfg: Record<string, string> = {}
    for (const r of cfgRows) cfg[r.key] = r.value
    const WA_TOKEN = cfg['access_token']
    const WA_PHONE_ID = cfg['phone_number_id'] || '1084433138092430'

    const code: string = otp.code
    const to: string = otp.wa_to // normalized e.g. 201050130149

    // 3) Send code via approved UTILITY template (madmona_admin_alert_v1, 2 body vars)
    const waBody = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'madmona_admin_alert_v1',
        language: { code: 'ar' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'كود الدخول لحسابك في مضمونة' },
              { type: 'text', text: 'الكود هو ' + code + ' وصالح خمس دقائق' },
            ],
          },
        ],
      },
    }

    const waRes = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(waBody),
    })
    const waJson = await waRes.json()

    if (!waRes.ok) {
      console.error('WhatsApp send failed:', JSON.stringify(waJson))
      return new Response(JSON.stringify({
        success: false,
        error: 'فشل إرسال الكود على واتساب. حاول تاني بعد شوية.',
        wa_error: waJson?.error?.message || null,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      success: true, phone: otp.phone, known_name: otp.known_name ?? null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
