// reels-autopublish v1 — auto-posts APPROVED rendered reels to IG+FB+TikTok via metricool-publish (publish_video).
// Gate: only reel_scripts with status='rendered' AND metadata->>'publish_approved'='true' AND a video URL.
// Safe by default: nothing publishes until you approve a reel (so the old weak Canva backlog never auto-blasts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function sanitize(s: string): string {
  return (s || "")
    .replace(/[اإأآ]حنا بتوع ال[إا]يجار/g, "معاملاتك مضمونة")
    .replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com)\/?[^\s]*/gi, "")
    .trim();
}

function buildText(row: any): string {
  const parts: string[] = [];
  const cap = sanitize(String(row.caption || "").trim());
  if (cap) parts.push(cap);
  if (row.cta) parts.push(sanitize(String(row.cta).trim()));
  let tags: string[] = Array.isArray(row.hashtags) ? row.hashtags : [];
  tags = tags.map((t: string) => (t.startsWith("#") ? t : "#" + t)).slice(0, 15);
  if (tags.length) parts.push(tags.join(" "));
  let t = parts.join("\n\n");
  if (t.length > 2200) t = t.slice(0, 2197) + "…";
  return t || "معاملاتك مضمونة — madmonacairo.com";
}

Deno.serve(async (req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  // internal auth: header secret must match whatsapp_config.render_secret
  const got = req.headers.get("x-internal-secret") || "";
  const { data: secRow } = await supa.from("whatsapp_config").select("value").eq("key", "render_secret").single();
  const expected = (secRow?.value ?? "") as string;
  if (!expected || got !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;

  const { data: rows, error } = await supa
    .from("reel_scripts")
    .select("id, caption, cta, hashtags, video_url, metadata, status")
    .eq("status", "rendered")
    .filter("metadata->>publish_approved", "eq", "true")
    .limit(10);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: any[] = [];
  for (const row of rows ?? []) {
    const videoUrl = row.video_url || (row.metadata && row.metadata.video_url) || null;
    if (!videoUrl) { results.push({ id: row.id, ok: false, error: "no_video_url" }); continue; }
    const text = buildText(row);
    if (dryRun) { results.push({ id: row.id, would_publish: true, networks: ["instagram", "facebook", "tiktok"] }); continue; }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/metricool-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ action: "publish_video", video_url: videoUrl, text, networks: ["instagram", "facebook", "tiktok"] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const newMeta = { ...(row.metadata || {}), metricool_post_id: data.id ?? null, published_at: new Date().toISOString(), published_by: "auto", networks: data.networks ?? ["instagram", "facebook", "tiktok"] };
        await supa.from("reel_scripts").update({ status: "published", metadata: newMeta }).eq("id", row.id);
        results.push({ id: row.id, ok: true, metricool_post_id: data.id ?? null });
      } else {
        await supa.from("reel_scripts").update({ render_error: ("publish: " + JSON.stringify(data)).slice(0, 300) }).eq("id", row.id);
        results.push({ id: row.id, ok: false, error: data.error || `HTTP ${res.status}` });
      }
    } catch (e) {
      results.push({ id: row.id, ok: false, error: String((e as Error).message || e) });
    }
  }
  return new Response(JSON.stringify({ processed: results.length, dry_run: dryRun, results }), { headers: { "Content-Type": "application/json" } });
});
