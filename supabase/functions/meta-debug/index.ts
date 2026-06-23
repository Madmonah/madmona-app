// meta-debug — inspects what the stored Meta token can actually do
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const GRAPH_VER = "v21.0";

Deno.serve(async () => {
  const { data: cfg } = await supabase
    .from("whatsapp_config")
    .select("key, value")
    .in("key", ["madmona_fb_page_id", "access_token"]);
  const m = Object.fromEntries(((cfg ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  const token = m.access_token;
  const pageId = m.madmona_fb_page_id;

  // 1. Token info (debug_token endpoint requires app token, so use /me instead)
  const meRes = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me?access_token=${token}`);
  const me = await meRes.json();

  // 2. What permissions does this token have?
  const permRes = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me/permissions?access_token=${token}`);
  const perms = await permRes.json();

  // 3. Page info — try with various field combinations
  const pageBasic = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${pageId}?access_token=${token}`).then(r => r.json());
  const pageWithIg = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${pageId}?fields=name,instagram_business_account,connected_instagram_account&access_token=${token}`).then(r => r.json());

  // 4. List all accessible pages (in case the token is a user token, not page token)
  const pages = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me/accounts?access_token=${token}`).then(r => r.json());

  return new Response(JSON.stringify({
    token_identity: me,
    permissions: perms,
    page_basic: pageBasic,
    page_with_ig: pageWithIg,
    user_pages: pages,
  }, null, 2), { headers: { "content-type": "application/json" } });
});
