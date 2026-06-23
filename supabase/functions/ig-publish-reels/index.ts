// ig-publish-reels — publishes the next ready Reel to Instagram Business
// Uses same Meta token as FB publisher. Auto-discovers IG Business Account ID
// from the FB Page and caches it in whatsapp_config.
//
// Triggers:
//   - Manual: POST {} or POST { reel_id: "uuid" }
//   - Cron: pg_cron schedule (see migrations)
//
// Pipeline:
//   1. Pick next reel_scripts row with status='rendered'
//   2. Atomically claim it (status='publishing')
//   3. Create IG container with media_type=REELS + video_url
//   4. Poll container status (FINISHED = ready, ERROR = fail)
//   5. Publish container → get IG media ID
//   6. Update reel_scripts: status='published', metadata.ig_post_id
//   7. Mirror to content_calendar (instagram_reel entry → published)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const GRAPH_VER = "v21.0";

type Creds = { fb_page_id: string; token: string; ig_business_id: string | null };

async function getCreds(): Promise<Creds> {
  const { data } = await supabase
    .from("whatsapp_config")
    .select("key, value")
    .in("key", ["madmona_fb_page_id", "access_token", "instagram_business_account_id"]);
  const m = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  return {
    fb_page_id: m.madmona_fb_page_id,
    token: m.access_token,
    ig_business_id: m.instagram_business_account_id ?? null,
  };
}

async function discoverAndCacheIgId(creds: Creds): Promise<string | null> {
  // GET /{page-id}?fields=instagram_business_account
  const r = await fetch(
    `https://graph.facebook.com/${GRAPH_VER}/${creds.fb_page_id}?fields=instagram_business_account&access_token=${creds.token}`
  );
  const data = await r.json();
  const igId = data?.instagram_business_account?.id;
  if (!igId) {
    console.error("IG discovery failed:", JSON.stringify(data));
    return null;
  }
  // Cache it for next time
  await supabase
    .from("whatsapp_config")
    .upsert({ key: "instagram_business_account_id", value: igId }, { onConflict: "key" });
  return igId;
}

async function createReelContainer(
  igId: string, token: string, videoUrl: string, caption: string,
): Promise<{ ok: boolean; container_id?: string; error?: string }> {
  const r = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: token,
    }),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${r.status}` };
  return { ok: true, container_id: data.id };
}

async function waitContainerReady(containerId: string, token: string): Promise<{ ready: boolean; error?: string }> {
  // IG Reels can take 30-90s to process. Poll for up to 5 minutes.
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const r = await fetch(
      `https://graph.facebook.com/${GRAPH_VER}/${containerId}?fields=status_code,status&access_token=${token}`
    );
    const data = await r.json();
    if (data.status_code === "FINISHED") return { ready: true };
    if (data.status_code === "ERROR") return { ready: false, error: data.status ?? "container errored" };
    await new Promise((res) => setTimeout(res, 5000));
  }
  return { ready: false, error: "timeout waiting for container (5min)" };
}

async function publishContainer(
  igId: string, token: string, containerId: string,
): Promise<{ ok: boolean; media_id?: string; error?: string }> {
  const r = await fetch(`https://graph.facebook.com/${GRAPH_VER}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${r.status}` };
  return { ok: true, media_id: data.id };
}

async function getMediaPermalink(mediaId: string, token: string): Promise<string | null> {
  const r = await fetch(
    `https://graph.facebook.com/${GRAPH_VER}/${mediaId}?fields=permalink&access_token=${token}`
  );
  const data = await r.json();
  return data?.permalink ?? null;
}

async function publishReel(reelId?: string): Promise<Record<string, unknown>> {
  let creds = await getCreds();
  if (!creds.fb_page_id || !creds.token) {
    return { ok: false, error: "missing fb_page_id or access_token in whatsapp_config" };
  }

  // Lazy IG ID discovery
  if (!creds.ig_business_id) {
    const discovered = await discoverAndCacheIgId(creds);
    if (!discovered) return { ok: false, error: "could not discover IG business account from FB page" };
    creds = { ...creds, ig_business_id: discovered };
  }
  const igId = creds.ig_business_id!;

  // Pick reel: by ID if given, else oldest rendered
  let claimQuery = supabase
    .from("reel_scripts")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("status", "rendered");
  if (reelId) claimQuery = claimQuery.eq("id", reelId);
  const { data: claimedRows, error: claimErr } = await claimQuery
    .select("id, title, video_url, caption, hashtags, listing_id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (claimErr) return { ok: false, error: `claim error: ${claimErr.message}` };
  if (!claimedRows || claimedRows.length === 0) {
    return { ok: false, skipped: true, reason: reelId ? "reel not found or already processed" : "no rendered reels in queue" };
  }

  type Row = { id: string; title: string; video_url: string; caption: string; hashtags: string[] | null; listing_id: string | null };
  const reel = claimedRows[0] as Row;

  if (!reel.video_url || !reel.video_url.startsWith("https://")) {
    await supabase.from("reel_scripts").update({ status: "failed" }).eq("id", reel.id);
    return { ok: false, reel_id: reel.id, error: "invalid video_url" };
  }

  const hashtagsStr = (reel.hashtags ?? []).join(" ");
  const fullCaption = [reel.caption ?? "", hashtagsStr].filter(Boolean).join("\n\n").slice(0, 2200);

  // Create container
  const c = await createReelContainer(igId, creds.token, reel.video_url, fullCaption);
  if (!c.ok || !c.container_id) {
    await supabase.from("reel_scripts").update({ status: "rendered" }).eq("id", reel.id); // revert
    return { ok: false, reel_id: reel.id, stage: "create_container", error: c.error };
  }

  // Wait for ready
  const ready = await waitContainerReady(c.container_id, creds.token);
  if (!ready.ready) {
    await supabase.from("reel_scripts").update({ status: "failed" }).eq("id", reel.id);
    return { ok: false, reel_id: reel.id, stage: "wait_ready", error: ready.error };
  }

  // Publish
  const pub = await publishContainer(igId, creds.token, c.container_id);
  if (!pub.ok || !pub.media_id) {
    await supabase.from("reel_scripts").update({ status: "failed" }).eq("id", reel.id);
    return { ok: false, reel_id: reel.id, stage: "publish", error: pub.error };
  }

  const permalink = await getMediaPermalink(pub.media_id, creds.token);

  // Mark reel as published
  await supabase
    .from("reel_scripts")
    .update({
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reel.id);

  // Mirror to content_calendar if there's a matching instagram_reel draft for this listing
  if (reel.listing_id) {
    await supabase
      .from("content_calendar")
      .update({
        status: "published",
        external_post_id: pub.media_id,
        external_url: permalink,
        published_at: new Date().toISOString(),
      })
      .eq("status", "drafted")
      .eq("content_type", "instagram_reel")
      .eq("metadata->>listing_id", reel.listing_id);
  }

  return {
    ok: true,
    reel_id: reel.id,
    title: reel.title,
    ig_media_id: pub.media_id,
    permalink,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await publishReel(body.reel_id);
  return new Response(JSON.stringify(result), {
    status: (result.ok || result.skipped) ? 200 : 500,
    headers: { "content-type": "application/json" },
  });
});
