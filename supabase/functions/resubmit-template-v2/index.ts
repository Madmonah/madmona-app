// Delete a template from Meta + submit corrected v2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: cfg } = await admin
      .from("whatsapp_config")
      .select("key, value")
      .in("key", ["access_token", "waba_id"]);
    const config = Object.fromEntries((cfg || []).map((c) => [c.key, c.value]));

    const accessToken = config.access_token;
    const wabaId = config.waba_id;

    // Step 1: Delete the v1 template
    const deleteUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?name=madmona_study_sprint_v1`;
    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const deleteData = await deleteRes.json();

    // Step 2: Submit v2 with the correct مضمونة branding
    const newTemplate = {
      name: "madmona_study_sprint_v2",
      language: "ar",
      category: "MARKETING",
      components: [
        {
          type: "BODY",
          text: "أهلاً {{1}}! 👋\n\nعرض حصري للطلاب من مضمونة خلال فترة الامتحانات:\n\nخصم 50% على ساعات المذاكرة في الـCoworking Space:\n- Indoor: 60 جنيه (بدل 120)\n- Outdoor: 32.5 جنيه (بدل 65)\n\nشرط الخصم: Story على Instagram تـtag @madmona.cairo قبل دخولك.\n\nالمكان: 7 سليمان عزمي، النزهة، هليوبوليس\nالعرض ساري حتى 30 يونيو 2026.",
          example: { body_text: [["محمد"]] },
        },
        {
          type: "FOOTER",
          text: "مضمونة · مساحات بمضمون",
        },
      ],
    };

    const submitUrl = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
    const submitRes = await fetch(submitUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTemplate),
    });
    const submitData = await submitRes.json();

    // Save to config
    if (submitRes.ok) {
      await admin.from("whatsapp_config").upsert([
        { key: "template_madmona_study_sprint_v2", value: "madmona_study_sprint_v2" },
        { key: "template_madmona_study_sprint_v2_id", value: submitData.id || "unknown" },
        { key: "template_madmona_study_sprint_v2_status", value: submitData.status || "PENDING" },
        { key: "template_madmona_study_sprint_v2_submitted_at", value: new Date().toISOString() },
      ]);
      
      // Mark v1 as deleted in config
      await admin.from("whatsapp_config").upsert([
        { key: "template_madmona_study_sprint_v1_status", value: "DELETED" },
      ]);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        v1_deleted: deleteData,
        v2_submitted: submitData,
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
