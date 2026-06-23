// Refresh a single template's status from Meta API
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
    const body = await req.json().catch(() => ({}));
    const templateName = body.template_name || "madmona_study_sprint_v1";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: cfg } = await admin
      .from("whatsapp_config")
      .select("key, value")
      .in("key", ["access_token", "waba_id"]);
    const config = Object.fromEntries((cfg || []).map((c) => [c.key, c.value]));

    const url = `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?name=${templateName}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.access_token}` },
    });
    const data = await res.json();

    const tmpl = data.data?.[0];
    if (!tmpl) {
      return new Response(
        JSON.stringify({ ok: false, error: "template not found", meta_response: data }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update local status
    await admin.from("whatsapp_config").upsert({
      key: `template_${templateName}_status`,
      value: tmpl.status,
    });

    if (tmpl.status === "REJECTED" && tmpl.rejected_reason) {
      await admin.from("whatsapp_config").upsert({
        key: `template_${templateName}_rejected_reason`,
        value: tmpl.rejected_reason,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        template_name: templateName,
        status: tmpl.status,
        category: tmpl.category,
        rejected_reason: tmpl.rejected_reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
