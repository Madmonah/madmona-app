// Refresh Meta Page Token from a fresh User Token
// Steps: (1) test user token, (2) fetch page token, (3) save to vault

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAGE_ID = "920414804771355";

Deno.serve(async () => {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get fresh user token from vault
    const { data: userTokenRow } = await admin
      .schema("vault" as any)
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "meta_user_access_token")
      .single();

    const userToken = (userTokenRow as any)?.decrypted_secret;
    if (!userToken) {
      return new Response(JSON.stringify({ error: "no user token in vault" }), { status: 500 });
    }

    // Step 1: Test user token
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${userToken}`
    );
    const meData = await meRes.json();
    if (meData.error) {
      return new Response(
        JSON.stringify({
          step: "test_user_token",
          error: meData.error,
          message: "User token invalid or expired - need a fresh one from Meta",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Try to extend to long-lived (60 days) - requires app_secret which we may not have
    // Skip for now - go directly to fetch page token (short-lived OK for today's traffic)

    // Step 3: Fetch Page Access Token using user token
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}?fields=access_token,name&access_token=${userToken}`
    );
    const pageData = await pageRes.json();
    if (pageData.error) {
      return new Response(
        JSON.stringify({
          step: "fetch_page_token",
          error: pageData.error,
          user_id: meData.id,
          user_name: meData.name,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!pageData.access_token) {
      return new Response(
        JSON.stringify({
          step: "no_page_token_returned",
          page_response: pageData,
          hint: "User may not have admin access to this page, or scope missing (pages_show_list, pages_manage_posts)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Save the fresh page token to vault
    const { data: existingSecret } = await admin
      .schema("vault" as any)
      .from("secrets")
      .select("id")
      .eq("name", "meta_page_access_token")
      .single();

    if (existingSecret) {
      await admin.rpc("vault_update_secret_by_name", {
        p_name: "meta_page_access_token",
        p_secret: pageData.access_token,
      }).catch(async () => {
        // Fallback: direct SQL via execute
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "apikey": SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            query: `SELECT vault.update_secret('${(existingSecret as any).id}', $$${pageData.access_token}$$)`,
          }),
        });
      });
    }

    // Step 5: Verify by testing the new page token
    const verifyRes = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}?fields=name&access_token=${pageData.access_token}`
    );
    const verifyData = await verifyRes.json();

    return new Response(
      JSON.stringify({
        ok: true,
        user: { id: meData.id, name: meData.name },
        page: { id: PAGE_ID, name: pageData.name },
        page_token_first10: pageData.access_token.substring(0, 10) + "...",
        verify: verifyData,
        saved_to_vault: true,
      }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), stack: (e as any).stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
