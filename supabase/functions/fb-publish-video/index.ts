// fb-publish-video — uploads a video to FB page via Graph API /videos endpoint
// Pulls reel from reel_scripts table (status='rendered'), POSTs to FB, marks as published
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const GRAPH_VER = "v21.0";

async function getCreds() {
  const { data } = await supabase.from("whatsapp_config").select("key, value").in("key", ["madmona_fb_page_id", "access_token"]);
  const m = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  return { page_id: m.madmona_fb_page_id, token: m.access_token };
}

async function postVideo(pageId: string, token: string, videoUrl: string, caption: string) {
  // FB /videos endpoint accepts file_url (source URL)
  const r = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      file_url: videoUrl,
      description: caption,
      access_token: token,
    }),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${r.status}`, full: data };
  return { ok: true, video_id: data.id, post_id: data.post_id ?? null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  const body = await req.json().catch(() => ({}));
  const reelId = body.reel_id;
  if (!reelId) return new Response(JSON.stringify({ error: "reel_id required" }), { status: 400 });

  const { page_id, token } = await getCreds();
  if (!page_id || !token) return new Response(JSON.stringify({ error: "missing fb creds" }), { status: 500 });

  const { data: reel, error: e } = await supabase
    .from("reel_scripts")
    .select("id, title, video_url, caption, hashtags, status")
    .eq("id", reelId)
    .single();
  if (e || !reel) return new Response(JSON.stringify({ error: e?.message ?? "reel not found" }), { status: 404 });
  if (!reel.video_url) return new Response(JSON.stringify({ error: "no video_url" }), { status: 400 });

  const hashtags = ((reel.hashtags as string[] | null) ?? []).join(" ");
  const caption = [reel.caption ?? "", hashtags].filter(Boolean).join("\n\n");

  const r = await postVideo(page_id, token, reel.video_url, caption);
  if (!r.ok) return new Response(JSON.stringify({ ok: false, error: r.error, full: r.full }), { status: 500 });

  // Mark as published
  await supabase.from("reel_scripts").update({
    status: "published",
    updated_at: new Date().toISOString(),
  }).eq("id", reelId);

  // Update site_settings counter
  await supabase.from("whatsapp_config").upsert({
    key: "fb_videos_published_count",
    value: "1",
  });

  return new Response(JSON.stringify({
    ok: true,
    video_id: r.video_id,
    post_id: r.post_id,
    permalink: r.post_id ? `https://www.facebook.com/${r.post_id}` : `https://www.facebook.com/${page_id}/videos/${r.video_id}`,
  }), { headers: { "content-type": "application/json" } });
});
