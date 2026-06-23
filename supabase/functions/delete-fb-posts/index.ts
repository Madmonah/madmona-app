// delete-fb-posts — deletes a list of FB post IDs via Meta Graph API + updates content_calendar
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getPageToken(): Promise<string> {
  const { data } = await supabase.rpc("get_meta_page_token");
  if (!data) throw new Error("no page token");
  return data as string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  try {
    const { post_ids, agent_filter } = await req.json();

    let posts: { id: string; external_post_id: string }[];
    if (Array.isArray(post_ids) && post_ids.length > 0) {
      const { data } = await supabase.from("content_calendar")
        .select("id, external_post_id")
        .in("id", post_ids);
      posts = (data ?? []) as typeof posts;
    } else if (agent_filter) {
      const { data } = await supabase.from("content_calendar")
        .select("id, external_post_id")
        .eq("agent_name", agent_filter)
        .eq("status", "published")
        .not("external_post_id", "is", null);
      posts = (data ?? []) as typeof posts;
    } else {
      return new Response(JSON.stringify({ error: "need post_ids or agent_filter" }), { status: 400 });
    }

    const token = await getPageToken();
    const results: Array<{ cc_id: string; fb_id: string; ok: boolean; error?: string }> = [];

    for (const p of posts) {
      if (!p.external_post_id) continue;
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${p.external_post_id}?access_token=${token}`, { method: "DELETE" });
        const data = await r.json();
        if (r.ok && data.success) {
          await supabase.from("content_calendar")
            .update({
              status: "rejected",
              metadata: { deleted_at: new Date().toISOString(), reason: "customer-focused content, pivoting to supplier acquisition" }
            }).eq("id", p.id);
          results.push({ cc_id: p.id, fb_id: p.external_post_id, ok: true });
        } else {
          results.push({ cc_id: p.id, fb_id: p.external_post_id, ok: false, error: data?.error?.message ?? `HTTP ${r.status}` });
        }
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        results.push({ cc_id: p.id, fb_id: p.external_post_id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      deleted: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      details: results,
    }, null, 2), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
});
