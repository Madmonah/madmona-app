// set-fb-token v3 — validates IG+FB scopes, saves to vault + whatsapp_config, discovers IG account
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAGE_ID = "920414804771355";
const GRAPH_VER = "v21.0";

const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "publish_video",
  "instagram_basic",
  "instagram_content_publish",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: CORS });

  try {
    const { user_token } = await req.json();
    if (!user_token || typeof user_token !== "string" || user_token.length < 50) {
      return j({ ok: false, error: "user_token (string) required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) Validate user token
    const meData = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me?access_token=${user_token}`).then(r => r.json());
    if (meData.error) return j({ ok: false, step: "validate_user_token", error: meData.error.message }, 400);

    // 2) Check permissions
    const permsData = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me/permissions?access_token=${user_token}`).then(r => r.json());
    const granted: string[] = (permsData?.data ?? []).filter((p: { status: string; permission: string }) => p.status === "granted").map((p: { permission: string }) => p.permission);
    const missing_scopes = REQUIRED_SCOPES.filter(s => !granted.includes(s));

    // 3) Derive page token
    const pageData = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${PAGE_ID}?fields=access_token,name,instagram_business_account&access_token=${user_token}`).then(r => r.json());
    if (pageData.error || !pageData.access_token) {
      return j({
        ok: false, step: "derive_page_token",
        error: pageData.error?.message ?? "no access_token returned",
        user: { id: meData.id, name: meData.name },
        granted_scopes: granted,
        missing_scopes,
      }, 400);
    }

    const igBusinessId = pageData?.instagram_business_account?.id ?? null;

    // 4) Save BOTH tokens to vault
    const r1 = await admin.rpc("set_vault_secret", { p_name: "meta_user_access_token", p_value: user_token });
    if (r1.error) return j({ ok: false, step: "save_user_token", error: r1.error.message }, 500);
    const r2 = await admin.rpc("set_vault_secret", { p_name: "meta_page_access_token", p_value: pageData.access_token });
    if (r2.error) return j({ ok: false, step: "save_page_token", error: r2.error.message }, 500);

    // 5) ALSO sync to whatsapp_config (so old edge functions see the new token)
    await admin.from("whatsapp_config").upsert({ key: "access_token", value: pageData.access_token }, { onConflict: "key" });
    if (igBusinessId) {
      await admin.from("whatsapp_config").upsert({ key: "instagram_business_account_id", value: igBusinessId }, { onConflict: "key" });
    }

    // 6) Verify with fresh page token
    const verifyData = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${PAGE_ID}?fields=name&access_token=${pageData.access_token}`).then(r => r.json());

    // 7) Push scheduled posts if all good
    let pushedCount = 0;
    if (missing_scopes.length === 0) {
      const r3 = await admin.rpc("push_all_scheduled_to_now");
      pushedCount = (r3.data as number) ?? 0;
    }

    return j({
      ok: true,
      user: { id: meData.id, name: meData.name },
      page: { id: PAGE_ID, name: pageData.name },
      instagram_business_account_id: igBusinessId,
      granted_scopes: granted,
      missing_scopes,
      verify_page_token: verifyData,
      scheduled_pushed_to_now: pushedCount,
      message: missing_scopes.length === 0
        ? `توكن جديد محفوظ + IG ${igBusinessId ? "مربوط ✅" : "غير مربوط ⚠️"} + دفعت ${pushedCount} بوستات للنشر`
        : `⚠️ ناقص ${missing_scopes.length} permission — راجع missing_scopes`,
    });
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
