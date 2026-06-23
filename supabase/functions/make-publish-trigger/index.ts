// make-publish-trigger v5 - new webhook URL (3044642) post-queue-cleanup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/lpyhftbvcjrlm7kqiwvlxka3tcyn8oqv";
const BATCH_SIZE = 10;

type Post = {
  id: string;
  content_type: string;
  title: string | null;
  body: string | null;
  hashtags: string[] | null;
  cta: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
};

function buildCaption(p: Post): string {
  const parts: string[] = [];
  if (p.title) parts.push(p.title);
  if (p.body) parts.push(p.body);
  if (p.cta) parts.push(p.cta);
  if (p.hashtags && p.hashtags.length > 0) {
    parts.push(p.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" "));
  }
  return parts.join("\n\n").trim();
}

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SR);
  const t0 = Date.now();
  const body = req.method === "POST" ? (await req.json().catch(() => ({}))) : {};
  const dryRun: boolean = !!body.dry_run;

  const { data, error } = await admin
    .from("content_calendar")
    .select("id, content_type, title, body, hashtags, cta, image_url, metadata")
    .in("visual_status", ["qc_passed", "qc_refreshed"])
    .in("status", ["drafted", "approved"])
    .in("content_type", ["instagram_post", "facebook_post"])
    .not("image_url", "is", null)
    .is("external_post_id", null)
    .or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString())
    .order("scheduled_for", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ ok: false, stage: "select", error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const list = (data || []) as Post[];
  const results: Array<Record<string, unknown>> = [];
  let sent = 0, failed = 0, skipped = 0;

  for (const post of list) {
    if (!post.image_url) { skipped++; continue; }

    const payload = {
      post_id: post.id,
      content_type: post.content_type,
      caption: buildCaption(post),
      image_url: post.image_url,
    };

    // Mark as sent BEFORE webhook. Skip post if update fails (constraint, network).
    if (!dryRun) {
      const { error: updErr } = await admin.from("content_calendar").update({
        status: "sent_to_make",
        metadata: {
          ...(post.metadata || {}),
          make_dispatch: {
            at: new Date().toISOString(),
            payload_sent: payload,
          },
        },
      }).eq("id", post.id);

      if (updErr) {
        failed++;
        results.push({ id: post.id, action: "mark_failed", error: updErr.message || String(updErr) });
        continue;
      }
    }

    try {
      const r = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        sent++;
        results.push({ id: post.id, content_type: post.content_type, action: "sent", status: r.status });
      } else {
        failed++;
        const text = await r.text().catch(() => "");
        results.push({ id: post.id, action: "webhook_returned_error", status: r.status, response: text.slice(0, 200) });
        if (r.status === 410 && !dryRun) {
          await admin.from("content_calendar").update({
            status: "approved",
            metadata: { ...(post.metadata || {}), make_dispatch_failed: { at: new Date().toISOString(), status: r.status } }
          }).eq("id", post.id);
        }
      }
    } catch (e) {
      failed++;
      results.push({ id: post.id, action: "fetch_error", error: String(e).slice(0, 200) });
      if (!dryRun) {
        await admin.from("content_calendar").update({
          status: "approved",
          metadata: { ...(post.metadata || {}), make_dispatch_error: { at: new Date().toISOString(), error: String(e).slice(0, 100) } }
        }).eq("id", post.id);
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    duration_ms: Date.now() - t0,
    dry_run: dryRun,
    inspected: list.length,
    sent,
    failed,
    skipped,
    sample: results.slice(0, 5),
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
