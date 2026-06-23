// fb-page-publish-now v2 — use only allowed status values (drafted/approved/scheduled/published/rejected)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function getMetaCreds(): Promise<{ page_id: string; token: string }> {
  const { data } = await supabase
    .from("whatsapp_config")
    .select("key, value")
    .in("key", ["madmona_fb_page_id", "access_token"]);
  const m = Object.fromEntries(((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
  return { page_id: m.madmona_fb_page_id, token: m.access_token };
}

async function postToFBPage(
  pageId: string, token: string,
  message: string, link: string,
): Promise<{ ok: boolean; post_id?: string; error?: string }> {
  const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message, link, access_token: token }),
  });
  const data = await r.json();
  if (!r.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${r.status}` };
  return { ok: true, post_id: data.id };
}

async function publishOne(ccId: string): Promise<{ ok: boolean; cc_id: string; post_id?: string; error?: string; permalink?: string }> {
  const { page_id, token } = await getMetaCreds();
  if (!page_id || !token) return { ok: false, cc_id: ccId, error: "missing fb credentials" };

  // Atomic claim: drafted → approved (so concurrent calls don't double-post)
  const { data: claimed, error: claimErr } = await supabase
    .from("content_calendar")
    .update({ status: "approved" })
    .eq("id", ccId)
    .eq("status", "drafted")
    .select()
    .maybeSingle();

  if (claimErr) return { ok: false, cc_id: ccId, error: `claim error: ${claimErr.message}` };
  if (!claimed) return { ok: false, cc_id: ccId, error: "already claimed or not drafted" };

  try {
    const cta  = (claimed as { cta?: string }).cta ?? "https://madmonacairo.com";
    const body = (claimed as { body?: string }).body ?? "";
    const r = await postToFBPage(page_id, token, body, cta);
    if (!r.ok) {
      // Revert to drafted so it can be retried, log the error in metadata
      await supabase.from("content_calendar")
        .update({
          status: "rejected",
          metadata: {
            ...(claimed as { metadata?: Record<string, unknown> }).metadata ?? {},
            publish_error: r.error,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", ccId);
      return { ok: false, cc_id: ccId, error: r.error };
    }

    await supabase.from("content_calendar").update({
      status: "published",
      external_post_id: r.post_id,
      external_url: r.post_id ? `https://www.facebook.com/${r.post_id}` : null,
      published_at: new Date().toISOString(),
    }).eq("id", ccId);

    return {
      ok: true,
      cc_id: ccId,
      post_id: r.post_id,
      permalink: r.post_id ? `https://www.facebook.com/${r.post_id}` : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("content_calendar")
      .update({ status: "rejected" })
      .eq("id", ccId);
    return { ok: false, cc_id: ccId, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  const body = await req.json().catch(() => ({}));

  if (body.cc_id) {
    const result = await publishOne(body.cc_id);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "content-type": "application/json" },
    });
  }

  const limit = Math.min(Number(body.limit ?? 5), 20);
  const { data: drafts } = await supabase
    .from("content_calendar")
    .select("id")
    .eq("status", "drafted")
    .eq("agent_name", "social-pack-builder")
    .eq("content_type", "facebook_post")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!drafts || drafts.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "no drafted facebook_posts" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const results = [];
  for (const d of drafts) {
    results.push(await publishOne(d.id));
    await new Promise((res) => setTimeout(res, 1500));
  }

  return new Response(JSON.stringify({
    processed: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    posts: results.filter((r) => r.ok).map((r) => r.permalink),
    results,
  }), { headers: { "content-type": "application/json" } });
});
