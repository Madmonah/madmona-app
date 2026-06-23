// social-setup v3 — fetch Page access token via /{page_id}?fields=access_token (System User path)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GRAPH = "https://graph.facebook.com/v21.0";
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function getCreds() {
  const { data } = await sb.from("whatsapp_config").select("key, value").in("key", ["madmona_fb_page_id", "access_token"]);
  const m: Record<string, string> = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map(r => [r.key, r.value]));
  return { page_id: m.madmona_fb_page_id, user_token: m.access_token };
}

// For System User tokens, the Page token is obtained via /{page_id}?fields=access_token
async function getPageToken(pageId: string, userToken: string): Promise<{ pageToken: string | null; debug: unknown }> {
  // Method 1: System User path
  const r = await fetch(`${GRAPH}/${pageId}?fields=access_token,name&access_token=${userToken}`);
  const d = await r.json();
  if (r.ok && d.access_token) return { pageToken: d.access_token, debug: { method: "system_user_page_field", page_name: d.name } };
  // Method 2: /me/accounts (User token path)
  const r2 = await fetch(`${GRAPH}/me/accounts?fields=id,access_token,name&limit=100&access_token=${userToken}`);
  const d2 = await r2.json();
  if (r2.ok && d2.data) {
    const match = (d2.data as Array<{ id: string; access_token: string; name: string }>).find(p => p.id === pageId);
    if (match) return { pageToken: match.access_token, debug: { method: "me_accounts", page_name: match.name } };
  }
  return { pageToken: null, debug: { method_1_error: d, method_2_data: d2 } };
}

async function uploadToStorage(b64: string, filename: string): Promise<string> {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const path = `social/${Date.now()}-${filename}`;
  const { error } = await sb.storage.from("site-assets").upload(path, buf, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`storage upload: ${error.message}`);
  const { data } = sb.storage.from("site-assets").getPublicUrl(path);
  return data.publicUrl;
}

async function fbUpdateProfilePic(pageId: string, pageToken: string, imageUrl: string) {
  const r = await fetch(`${GRAPH}/${pageId}/picture`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url: imageUrl, access_token: pageToken }),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

async function fbUpdateCover(pageId: string, pageToken: string, imageUrl: string) {
  const r1 = await fetch(`${GRAPH}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url: imageUrl, published: "false", access_token: pageToken }),
  });
  const d1 = await r1.json();
  if (!r1.ok || !d1.id) return { ok: false, step: "photo_upload", status: r1.status, data: d1 };
  const r2 = await fetch(`${GRAPH}/${pageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ cover: d1.id, access_token: pageToken }),
  });
  const d2 = await r2.json();
  return { ok: r2.ok, photo_id: d1.id, status: r2.status, data: d2 };
}

async function getIgUserId(pageId: string, pageToken: string): Promise<string | null> {
  const r = await fetch(`${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`);
  const d = await r.json();
  return d?.instagram_business_account?.id ?? null;
}

async function igUpdateProfilePic(igUserId: string, pageToken: string, imageUrl: string) {
  // IG Business profile pic update endpoint
  const r = await fetch(`${GRAPH}/${igUserId}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ profile_picture_url: imageUrl, access_token: pageToken }),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const { page_id, user_token } = await getCreds();
  if (!page_id || !user_token) return new Response(JSON.stringify({ error: "missing creds" }), { status: 500 });

  const { pageToken, debug } = await getPageToken(page_id, user_token);
  const tokenUsed = pageToken ?? user_token;

  const results: Record<string, unknown> = {
    page_id,
    token_resolution: pageToken ? "page_token_obtained" : "using_user_token_fallback",
    token_debug: debug,
  };

  try {
    const igId = await getIgUserId(page_id, tokenUsed);
    results.ig_business_account_id = igId;

    if (body.profile_b64) {
      const url = await uploadToStorage(body.profile_b64 as string, "profile.png");
      results.profile_url = url;
      results.fb_profile = await fbUpdateProfilePic(page_id, tokenUsed, url);
      if (igId) results.ig_profile = await igUpdateProfilePic(igId, tokenUsed, url);
    }
    if (body.cover_b64) {
      const url = await uploadToStorage(body.cover_b64 as string, "cover.png");
      results.cover_url = url;
      results.fb_cover = await fbUpdateCover(page_id, tokenUsed, url);
    }
  } catch (e) {
    results.error = e instanceof Error ? e.message : String(e);
  }

  return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
});
