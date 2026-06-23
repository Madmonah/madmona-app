// ig-discover-debug — use the USER token (with instagram_basic) to find the IG account
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const GRAPH_VER = "v21.0";
const PAGE_ID = "920414804771355";

Deno.serve(async () => {
  // Get USER token from vault
  const { data: userTokenData } = await supabase.rpc("get_vault_secret", { p_name: "meta_user_access_token" });
  const userToken = userTokenData as string | null;
  if (!userToken) return new Response(JSON.stringify({ error: "no user token in vault" }), { status: 500 });

  // Query user token info
  const me = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me?access_token=${userToken}`).then(r => r.json());
  const perms = await fetch(`https://graph.facebook.com/${GRAPH_VER}/me/permissions?access_token=${userToken}`).then(r => r.json());

  // Try page query with user token
  const pageWithIg = await fetch(
    `https://graph.facebook.com/${GRAPH_VER}/${PAGE_ID}?fields=name,instagram_business_account{id,name,username},connected_instagram_account{id,name,username}&access_token=${userToken}`
  ).then(r => r.json());

  // Try /me/accounts (list pages user manages)
  const pages = await fetch(
    `https://graph.facebook.com/${GRAPH_VER}/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${userToken}`
  ).then(r => r.json());

  return new Response(JSON.stringify({
    user: me,
    permissions: perms,
    page_with_ig_via_user_token: pageWithIg,
    user_pages: pages,
  }, null, 2), { headers: { "content-type": "application/json" } });
});
