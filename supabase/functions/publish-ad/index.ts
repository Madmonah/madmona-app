import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MC_BASE = "https://app.metricool.com/api";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
let TOKEN = "";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const mcHeaders = () => ({ "Content-Type": "application/json", "X-Mc-Auth": TOKEN });
const qs = (cfg: any, extra: Record<string, string> = {}) => new URLSearchParams({ userId: cfg.user_id, blogId: cfg.blog_id, ...extra }).toString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function localIso(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
}
async function uploadMedia(cfg: any, url: string): Promise<{ id: string | null; raw: any }> {
  // try POST upload-by-url endpoint to obtain a real mediaId
  const res = await fetch(`${MC_BASE}/v2/scheduler/medias?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify({ url }) });
  const data = await res.json().catch(() => ({}));
  const id = data?.id ?? data?.mediaId ?? data?.data?.id ?? data?.url ?? data?.data?.url ?? null;
  return { id: id ? String(id) : null, raw: { status: res.status, data } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: tok } = await supa.rpc("get_metricool_token");
  TOKEN = (tok ?? "") as string;
  if (!TOKEN) return json({ error: "no Metricool token" }, 500);
  const { data: cfg } = await supa.from("metricool_config").select("user_id, blog_id, timezone").eq("id", 1).single();
  if (!cfg) return json({ error: "no config" }, 500);
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "publish";

  if (action === "delete") {
    const ids: any[] = Array.isArray(body.ids) ? body.ids : [];
    const out: any[] = [];
    for (const id of ids) { const res = await fetch(`${MC_BASE}/v2/scheduler/posts/${id}?${qs(cfg)}`, { method: "DELETE", headers: mcHeaders() }); out.push({ id, ok: res.ok, status: res.status }); await sleep(500); }
    return json({ deleted: out });
  }
  if (action === "getpost") {
    const res = await fetch(`${MC_BASE}/v2/scheduler/posts/${body.id}?${qs(cfg)}`, { headers: mcHeaders() });
    const data = await res.json().catch(() => ({}));
    return json({ status: res.status, media: data?.media ?? data?.data?.media ?? null, picUrl: data?.picUrl ?? null, hasMedia: JSON.stringify(data).includes("hiring_v3") });
  }
  if (action === "uploadtest") {
    const u = await uploadMedia(cfg, String(body.image_url ?? ""));
    return json(u);
  }

  const auto = body.auto === true;
  const text = String(body.text ?? "").trim();
  const imageUrl = String(body.image_url ?? "").trim();
  const networks: string[] = Array.isArray(body.networks) && body.networks.length ? body.networks : ["instagram", "facebook", "twitter", "threads", "linkedin"];
  if (!text || !imageUrl) return json({ error: "text and image_url required" }, 400);

  // get a real mediaId via upload-by-url; fall back to raw url in media[]
  const up = await uploadMedia(cfg, imageUrl);
  const media = up.id ? [up.id] : [imageUrl];
  const when = new Date(Date.now() + 12 * 60 * 1000);
  const dateTime = localIso(when, (cfg as any).timezone);

  const results: any[] = [];
  for (const network of networks) {
    const payload: Record<string, unknown> = { providers: [{ network }], publicationDate: { dateTime, timezone: (cfg as any).timezone }, text, autoPublish: auto, media };
    if (network === "facebook") payload.facebookData = { type: "POST" };
    try {
      const res = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      results.push({ network, ok: res.ok, status: res.status, id: data?.id ?? data?.data?.id ?? null, error: res.ok ? null : JSON.stringify(data).slice(0, 200) });
    } catch (e) { results.push({ network, ok: false, error: String(e) }); }
    await sleep(1200);
  }
  return json({ auto, scheduled_for: dateTime, upload: up.raw, media_used: media, results });
});
