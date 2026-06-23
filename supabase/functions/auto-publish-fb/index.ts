// auto-publish-fb — Picks scheduled facebook_post/instagram_post rows with real images
// and publishes them to the Madmona Cairo FB page using the page token from vault.
//
// Safety rails:
//   - Skips posts whose image_source still indicates an unsplash placeholder (defense in depth)
//   - Publishes at most `limit` per run (defaults to 2) to avoid flooding the page
//   - Atomic claim via status: scheduled → approved before posting, then → published on success
//   - On failure: status → rejected with error metadata, so cron retries don't loop

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAGE_ID = "920414804771355"; // Madmona Cairo
const MIN_INTERVAL_MINUTES = 90;   // Don't publish two posts within this window

async function getPageToken(): Promise<string> {
  const { data } = await sb.rpc("get_vault_secret", { p_name: "meta_page_access_token" });
  if (!data) throw new Error("meta_page_access_token missing from vault");
  return data as string;
}

interface PostRow {
  id: string;
  content_type: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  image_source: string | null;
  cta: string | null;
  metadata: Record<string, unknown> | null;
}

async function publishOnePhoto(post: PostRow, token: string): Promise<{ ok: boolean; post_id?: string; error?: string }> {
  if (!post.image_url) return { ok: false, error: "no image_url" };
  if (post.image_source && post.image_source.startsWith("unsplash")) {
    return { ok: false, error: "refused: unsplash image_source" };
  }

  // Caption = body. Body usually already contains hashtags. We don't double-add link
  // because FB sometimes pushes back. If a CTA URL exists, include as plain text.
  let message = (post.body ?? "").trim();
  if (post.cta && !message.includes(post.cta)) {
    message = message + "\n\n" + post.cta;
  }
  if (!message) message = post.title ?? "مضمونة — احنا بتوع الإيجار";

  const params = new URLSearchParams({
    url: post.image_url,
    message,
    published: "true",
    access_token: token,
  });

  const r = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await r.json();
  if (!r.ok) {
    return { ok: false, error: data?.error?.message ?? `HTTP ${r.status}` };
  }
  // /photos returns { id: photoId, post_id: page_id_postId }
  return { ok: true, post_id: (data.post_id as string) ?? (data.id as string) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit ?? 2), 10);
  const forceCcId = body.cc_id as string | undefined;

  // Throttle: if a post was published within MIN_INTERVAL_MINUTES, skip (unless cc_id forced)
  if (!forceCcId) {
    const { data: recent } = await sb
      .from("content_calendar")
      .select("published_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .gte("published_at", new Date(Date.now() - MIN_INTERVAL_MINUTES * 60 * 1000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `throttle: a post was published within last ${MIN_INTERVAL_MINUTES}min`,
          last_publish: (recent[0] as { published_at: string }).published_at,
        }),
        { headers: { "content-type": "application/json" } }
      );
    }
  }

  // Pick rows to publish
  let rows: PostRow[];
  if (forceCcId) {
    const { data } = await sb
      .from("content_calendar")
      .select("id, content_type, title, body, image_url, image_source, cta, metadata")
      .eq("id", forceCcId);
    rows = (data ?? []) as PostRow[];
  } else {
    const { data } = await sb
      .from("content_calendar")
      .select("id, content_type, title, body, image_url, image_source, cta, metadata")
      .eq("status", "scheduled")
      .in("content_type", ["facebook_post", "instagram_post"])
      .not("image_url", "is", null)
      .not("image_source", "like", "unsplash%")
      .order("created_at", { ascending: true })
      .limit(limit);
    rows = (data ?? []) as PostRow[];
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "nothing to publish" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const token = await getPageToken();
  const results: Array<Record<string, unknown>> = [];

  for (const post of rows) {
    // Atomic claim: scheduled → approved
    const { data: claimed } = await sb
      .from("content_calendar")
      .update({ status: "approved" })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();

    if (!claimed && !forceCcId) {
      results.push({ id: post.id, ok: false, error: "could not claim (already taken)" });
      continue;
    }

    const r = await publishOnePhoto(post, token);

    if (r.ok && r.post_id) {
      await sb.from("content_calendar")
        .update({
          status: "published",
          external_post_id: r.post_id,
          external_url: `https://www.facebook.com/${r.post_id}`,
          published_at: new Date().toISOString(),
          metadata: { ...(post.metadata ?? {}), published_via: "auto-publish-fb", published_at_iso: new Date().toISOString() },
        })
        .eq("id", post.id);
      results.push({
        id: post.id,
        ok: true,
        title: post.title,
        content_type: post.content_type,
        permalink: `https://www.facebook.com/${r.post_id}`,
      });
    } else {
      await sb.from("content_calendar")
        .update({
          status: "rejected",
          metadata: { ...(post.metadata ?? {}), publish_error: r.error, failed_at: new Date().toISOString() },
        })
        .eq("id", post.id);
      results.push({ id: post.id, ok: false, error: r.error });
    }

    // Small pause between posts in same batch
    await new Promise((res) => setTimeout(res, 2000));
  }

  return new Response(
    JSON.stringify({
      processed: results.length,
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }, null, 2),
    { headers: { "content-type": "application/json" } }
  );
});
