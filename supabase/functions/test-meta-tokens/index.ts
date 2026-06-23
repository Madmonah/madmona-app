import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
Deno.serve(async () => {
  const admin = createClient(SUPABASE_URL, SR);
  const tokens: Record<string,string> = {};
  const { data: cfg } = await admin.from("whatsapp_config").select("key,value").in("key", ["access_token","waba_id","app_id"]);
  const c = Object.fromEntries((cfg||[]).map((x:any)=>[x.key,x.value]));
  tokens["config.access_token"] = c.access_token;
  for (const name of ["meta_whatsapp_token_v2","meta_user_access_token","meta_page_access_token"]) {
    const { data } = await admin.schema("vault" as any).from("decrypted_secrets").select("decrypted_secret").eq("name", name).single();
    if (data) tokens[`vault.${name}`] = (data as any).decrypted_secret;
  }
  const results: any[] = [];
  for (const [label, token] of Object.entries(tokens)) {
    if (!token) { results.push({ label, status: "no_token" }); continue; }
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`);
      const d = await r.json();
      results.push({ label, ok: !d.error, status: r.status, response: d.error ? d.error.message : { id: d.id, name: d.name } });
    } catch (e) { results.push({ label, error: String(e) }); }
  }
  // Also test WABA-specific access (for template management)
  for (const [label, token] of Object.entries(tokens)) {
    if (!token) continue;
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${c.waba_id}/message_templates?limit=1&access_token=${token}`);
      const d = await r.json();
      results.push({ label: `${label} -> WABA`, ok: !d.error, status: r.status, sample: d.error ? d.error.message : (d.data?.[0]?.name || "empty") });
    } catch (e) { results.push({ label: `${label} -> WABA`, error: String(e) }); }
  }
  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
});
