// Submit a new WhatsApp marketing template to Meta
// One-shot endpoint: POST to submit, then check status via whatsapp_config table

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get Meta credentials from whatsapp_config
    const { data: cfg } = await admin
      .from("whatsapp_config")
      .select("key, value")
      .in("key", ["access_token", "waba_id"]);

    const config = Object.fromEntries((cfg || []).map((c) => [c.key, c.value]));
    const accessToken = config.access_token;
    const wabaId = config.waba_id;

    if (!accessToken || !wabaId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Define the Study Sprint marketing template
    const templateName = "madmona_study_sprint_v1";
    
    const templatePayload = {
      name: templateName,
      language: "ar",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "أهلاً {{1}}! 👋\n\nعرض حصري للطلاب من Madmona خلال فترة الامتحانات:\n\nخصم 50% على ساعات المذاكرة في الـCoworking Space:\n- Indoor: 60 جنيه (بدل 120)\n- Outdoor: 32.5 جنيه (بدل 65)\n\nشرط الخصم: Story على Instagram تـtag @madmona.cairo قبل دخولك.\n\nالمكان: 7 سليمان عزمي، النزهة، هليوبوليس\nالعرض ساري حتى 30 يونيو 2026.",
          example: {
            body_text: [["محمد"]],
          },
        },
        {
          type: "FOOTER",
          text: "Madmona · مساحات بمضمون",
        },
      ],
    };

    // Submit to Meta
    const metaUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "meta_submission_failed",
          status: metaRes.status,
          meta_response: metaData,
          payload_sent: templatePayload,
        }),
        { status: metaRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save template info to config for tracking
    await admin.from("whatsapp_config").upsert([
      { key: `template_${templateName}`, value: templateName },
      { key: `template_${templateName}_id`, value: metaData.id || "unknown" },
      { key: `template_${templateName}_status`, value: metaData.status || "PENDING" },
      { key: `template_${templateName}_submitted_at`, value: new Date().toISOString() },
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        template_name: templateName,
        template_id: metaData.id,
        status: metaData.status,
        category: metaData.category,
        meta_response: metaData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "exception", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
