// Get full details of an approved template
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { template_name } = await req.json().catch(() => ({}));
    if (!template_name) {
      return new Response(JSON.stringify({ error: "missing template_name" }), { status: 400 });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: cfg } = await admin
      .from("whatsapp_config")
      .select("key, value")
      .in("key", ["access_token", "waba_id"]);
    const config = Object.fromEntries((cfg || []).map((c) => [c.key, c.value]));

    const url = `https://graph.facebook.com/v18.0/${config.waba_id}/message_templates?name=${template_name}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${config.access_token}` } });
    const data = await res.json();

    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
