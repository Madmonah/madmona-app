// metricool-publish v12 — ➕ Google Business Profile + explicit LinkedIn data.
// v11 + : (1) googleBusiness network added to instagram_post fan-out, with googleBusinessData (STANDARD topic).
//         (2) explicit linkedinData so LinkedIn renders as a proper post not a bare image.
//         (3) probe_networks action — discovers which Google network name Metricool accepts (googleBusiness|gmb|google).
//         (4) GOOGLE_NET cached in metricool_config.google_network once discovered.
// Video flow unchanged (IG/FB/TikTok/YouTube reels/shorts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MC_BASE = "https://app.metricool.com/api";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
let TOKEN = "";

type Cfg = { user_id: string; blog_id: string; timezone: string; autopublish: boolean; batch: number; enabled: boolean; google_network?: string | null };

const SITE = "https://madmonacairo.com";

// Google Business network name candidates (Metricool has used different ids across versions)
const GOOGLE_CANDIDATES = ["googleBusiness", "gmb", "google", "googlemybusiness"];

const NETWORK_MAP: Record<string, { networks: string[]; kind: "image" | "video" | "text" }> = {
  // googleBusiness appended dynamically (resolved name) in resolveNetworks()
  instagram_post:     { networks: ["instagram", "facebook", "twitter", "threads", "bluesky", "linkedin", "__google__"], kind: "image" },
  instagram_carousel: { networks: ["instagram", "facebook", "threads"], kind: "image" },
  facebook_post:      { networks: ["facebook", "__google__"], kind: "image" },
  google_post:        { networks: ["__google__"], kind: "image" },
  instagram_reel:     { networks: ["instagram", "facebook", "tiktok"], kind: "video" },
  tiktok_script:      { networks: ["tiktok"], kind: "video" },
  youtube_script:     { networks: ["youtube"], kind: "video" },
  instagram_story:    { networks: ["instagram"], kind: "video" },
};
const CHAR_LIMIT: Record<string, number> = {
  instagram: 2200, facebook: 16192, twitter: 280, threads: 500,
  bluesky: 300, linkedin: 3000, tiktok: 2200, youtube: 5000, pinterest: 500,
  googleBusiness: 1500, gmb: 1500, google: 1500, googlemybusiness: 1500,
};

function isStockImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes("unsplash.com") || u.includes("pexels.com") || u.includes("pixabay.com");
}

const mcHeaders = () => ({ "Content-Type": "application/json", "X-Mc-Auth": TOKEN });
const qs = (cfg: Cfg, extra: Record<string, string> = {}) => new URLSearchParams({ userId: cfg.user_id, blogId: cfg.blog_id, ...extra }).toString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isGoogle = (n: string) => GOOGLE_CANDIDATES.includes(n);

// replace the __google__ placeholder with the resolved google network name (or drop it if unknown)
function resolveNetworks(networks: string[], googleNet: string | null | undefined): string[] {
  const out: string[] = [];
  for (const n of networks) {
    if (n === "__google__") { if (googleNet) out.push(googleNet); }
    else out.push(n);
  }
  return out;
}

function buildText(row: any, network: string): string {
  const parts: string[] = [];
  if (row.body) parts.push(String(row.body).trim());
  if (row.cta) parts.push(String(row.cta).trim());
  let tags: string[] = Array.isArray(row.hashtags) ? row.hashtags : [];
  tags = tags.map((t: string) => (t.startsWith("#") ? t : "#" + t)).slice(0, 30);
  if (tags.length) parts.push(tags.join(" "));
  let text = parts.join("\n\n");
  const limit = CHAR_LIMIT[network] ?? 2200;
  if (text.length > limit) text = text.slice(0, limit - 3) + "…";
  return text;
}

function buildShortText(row: any, network: string): string {
  const limit = CHAR_LIMIT[network] ?? 2200;
  if (limit > 2000) return buildText(row, network);
  const body = String(row.body ?? "").trim().replace(/\n+/g, " ");
  const cta = row.cta ? " " + String(row.cta).trim() : "";
  let text = body + cta;
  if (text.length > limit) text = text.slice(0, limit - 3) + "…";
  return text;
}

// Google Business posts can't contain hashtags well; build a clean version
function buildGoogleText(row: any): string {
  const parts: string[] = [];
  if (row.body) parts.push(String(row.body).trim());
  if (row.cta) parts.push(String(row.cta).trim());
  let text = parts.join("\n\n");
  const limit = 1500;
  if (text.length > limit) text = text.slice(0, limit - 3) + "…";
  return text;
}

function localIso(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
}

async function normalizeMedia(cfg: Cfg, url: string, kind: "image" | "video"): Promise<string> {
  try {
    const res = await fetch(`${MC_BASE}/actions/normalize/${kind}/url?${qs(cfg, { url })}`, { headers: mcHeaders() });
    if (!res.ok) return url;
    const txt = await res.text();
    try {
      const data = JSON.parse(txt);
      const id = data?.mediaId ?? data?.id ?? data?.data?.mediaId ?? data?.url ?? null;
      if (id) return String(id);
    } catch { /* plain text */ }
    const cleaned = txt.trim().replace(/^"|"$/g, "");
    if (cleaned.startsWith("http")) return cleaned;
    return url;
  } catch { return url; }
}
const normalizeImage = (cfg: Cfg, url: string) => normalizeMedia(cfg, url, "image");

async function deletePost(cfg: Cfg, postId: string): Promise<{ ok: boolean; status: number; body?: string }> {
  const url = `${MC_BASE}/v2/scheduler/posts/${encodeURIComponent(postId)}?${qs(cfg)}`;
  const res = await fetch(url, { method: "DELETE", headers: mcHeaders() });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: body.slice(0, 200) };
}

// Build the per-network data objects (facebook/instagram/twitter/linkedin/google)
function buildNetworkData(networks: string[], auto: boolean, googleText: string): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (networks.includes("facebook")) d.facebookData = { type: "POST" };
  if (networks.includes("instagram")) d.instagramData = { autoPublish: auto };
  if (networks.includes("twitter")) d.twitterData = { type: "POST" };
  if (networks.includes("linkedin")) d.linkedinData = { documentTitle: "", publishImageAsPost: true };
  const gnet = networks.find(isGoogle);
  if (gnet) {
    d.googleBusinessData = {
      topicType: "STANDARD",
      cta: { actionType: "LEARN_MORE", url: SITE },
    };
  }
  return d;
}

async function scheduleVideo(cfg: Cfg, opts: { video_url: string; text: string; networks?: string[]; when?: string; autopublish?: boolean; title?: string }): Promise<{ ok: boolean; id?: string; error?: string; networks?: string[]; attempt?: number }> {
  const networks = opts.networks && opts.networks.length ? opts.networks : ["instagram", "facebook", "tiktok"];
  const media = [await normalizeMedia(cfg, opts.video_url, "video")];
  const when = opts.when && new Date(opts.when) > new Date() ? new Date(opts.when) : new Date(Date.now() + 10 * 60 * 1000);
  const auto = opts.autopublish ?? cfg.autopublish;
  const ytTitle = String(opts.title || opts.text || "مضمونة").replace(/\n+/g, " ").trim().slice(0, 95) || "مضمونة";
  const basePayload: Record<string, unknown> = {
    providers: networks.map((n) => ({ network: n })),
    publicationDate: { dateTime: localIso(when, cfg.timezone), timezone: cfg.timezone },
    text: opts.text,
    autoPublish: auto,
    media,
    ...(networks.includes("youtube") ? { youtubeData: { title: ytTitle, type: "SHORT", privacy: "PUBLIC", madeForKids: false } } : {}),
  };
  const attempts: Array<Record<string, unknown>> = [
    { ...basePayload,
      ...(networks.includes("instagram") ? { instagramData: { autoPublish: auto, type: "REEL" } } : {}),
      ...(networks.includes("facebook") ? { facebookData: { type: "REEL" } } : {}) },
    { ...basePayload,
      ...(networks.includes("instagram") ? { instagramData: { autoPublish: auto } } : {}),
      ...(networks.includes("facebook") ? { facebookData: { type: "POST" } } : {}) },
  ];
  let lastErr = "";
  for (let i = 0; i < attempts.length; i++) {
    const res = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify(attempts[i]) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const id = data?.id ?? data?.data?.id ?? data?.postId ?? null;
      return { ok: true, id: id ? String(id) : undefined, networks, attempt: i + 1 };
    }
    lastErr = `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`;
    await sleep(900);
  }
  return { ok: false, error: lastErr, networks };
}

async function schedulePost(cfg: Cfg, row: any, networksOverride?: string[]): Promise<{ ok: boolean; id?: string; error?: string; networks?: string[] }> {
  const map = NETWORK_MAP[row.content_type];
  if (!map) return { ok: false, error: `unmapped content_type: ${row.content_type}` };
  if (map.kind === "video") return { ok: false, error: "video_use_publish_video_action" };
  if (isStockImage(row.image_url)) return { ok: false, error: "BLOCKED: stock fallback image" };
  let networks = networksOverride && networksOverride.length ? networksOverride : resolveNetworks(map.networks, cfg.google_network);
  if (!networks.length) return { ok: false, error: "no networks specified" };
  const primary = networks.includes("facebook") ? "facebook" : networks.includes("instagram") ? "instagram" : networks[0];
  const text = buildText(row, primary);
  const hasShort = networks.includes("twitter") || networks.includes("bluesky");
  const finalText = hasShort ? buildShortText(row, networks.includes("twitter") ? "twitter" : "bluesky") : text;
  let media: string[] = [];
  if (row.image_url) {
    const id = await normalizeImage(cfg, row.image_url);
    if (id) media = [String(id)];
  }
  if (!media.length) return { ok: false, error: "image_normalize_failed_no_media" };
  const when = row.scheduled_for && new Date(row.scheduled_for) > new Date() ? new Date(row.scheduled_for) : new Date(Date.now() + 5 * 60 * 1000);
  const payload: Record<string, unknown> = {
    providers: networks.map((n) => ({ network: n })),
    publicationDate: { dateTime: localIso(when, cfg.timezone), timezone: cfg.timezone },
    text: finalText,
    autoPublish: cfg.autopublish,
    media,
    ...buildNetworkData(networks, cfg.autopublish, buildGoogleText(row)),
  };
  const res = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // If Google network caused the rejection, retry once WITHOUT google so the rest still publish
    const gnet = networks.find(isGoogle);
    if (gnet) {
      const noG = networks.filter((n) => !isGoogle(n));
      const payload2: Record<string, unknown> = {
        providers: noG.map((n) => ({ network: n })),
        publicationDate: { dateTime: localIso(when, cfg.timezone), timezone: cfg.timezone },
        text: finalText, autoPublish: cfg.autopublish, media,
        ...buildNetworkData(noG, cfg.autopublish, ""),
      };
      const res2 = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify(payload2) });
      const data2 = await res2.json().catch(() => ({}));
      if (res2.ok) {
        const id = data2?.id ?? data2?.data?.id ?? data2?.postId ?? null;
        return { ok: true, id: id ? String(id) : undefined, networks: noG, error: `google_dropped: HTTP ${res.status}` };
      }
      return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`, networks };
    }
    return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`, networks };
  }
  const id = data?.id ?? data?.data?.id ?? data?.postId ?? null;
  return { ok: true, id: id ? String(id) : undefined, networks };
}

// Probe which google network name Metricool accepts by scheduling a far-future test post per candidate, then deleting it.
async function probeGoogle(cfg: Cfg, imageUrl: string): Promise<{ accepted: string | null; tried: Array<{ name: string; status: number; ok: boolean; body?: string }> }> {
  const media = imageUrl ? [await normalizeImage(cfg, imageUrl)] : [];
  const when = new Date(Date.now() + 40 * 24 * 3600 * 1000); // 40 days out
  const tried: Array<{ name: string; status: number; ok: boolean; body?: string }> = [];
  let accepted: string | null = null;
  for (const cand of GOOGLE_CANDIDATES) {
    const payload: Record<string, unknown> = {
      providers: [{ network: cand }],
      publicationDate: { dateTime: localIso(when, cfg.timezone), timezone: cfg.timezone },
      text: "اختبار مضمونة — سيتم الحذف",
      autoPublish: false,
      media,
      googleBusinessData: { topicType: "STANDARD", cta: { actionType: "LEARN_MORE", url: SITE } },
    };
    const res = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method: "POST", headers: mcHeaders(), body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok;
    tried.push({ name: cand, status: res.status, ok, body: JSON.stringify(data).slice(0, 160) });
    if (ok) {
      accepted = cand;
      const id = data?.id ?? data?.data?.id ?? data?.postId ?? null;
      if (id) await deletePost(cfg, String(id)); // clean up test post
      break;
    }
    await sleep(800);
  }
  return { accepted, tried };
}

Deno.serve(async (req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: tok } = await supa.rpc("get_metricool_token");
  TOKEN = (tok ?? "") as string;
  if (!TOKEN) return new Response(JSON.stringify({ error: "no Metricool token in Vault" }), { status: 500, headers: { "Content-Type": "application/json" } });
  const { data: cfgRow } = await supa.from("metricool_config").select("user_id, blog_id, timezone, autopublish, batch, enabled, google_network").eq("id", 1).single();
  if (!cfgRow) return new Response(JSON.stringify({ error: "metricool_config row missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  const cfg = cfgRow as Cfg;
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "publish";
  const dryRun = body.dry_run === true;

  if (action === "probe_networks") {
    // find a recent real image to test with
    let img = body.image_url as string | undefined;
    if (!img) {
      const { data: r } = await supa.from("content_calendar").select("image_url").not("image_url", "is", null).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle();
      img = (r as any)?.image_url;
    }
    const probe = await probeGoogle(cfg, img || "");
    if (probe.accepted) {
      await supa.from("metricool_config").update({ google_network: probe.accepted }).eq("id", 1);
    }
    return new Response(JSON.stringify({ ...probe, saved: probe.accepted ? `google_network=${probe.accepted}` : "none accepted" }), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "publish_video") {
    if (!body.video_url || !body.text) return new Response(JSON.stringify({ error: "video_url and text required" }), { status: 400 });
    const r = await scheduleVideo(cfg, { video_url: String(body.video_url), text: String(body.text), networks: body.networks, when: body.when, autopublish: body.autopublish, title: body.title });
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "delete") {
    const postId = body.post_id;
    if (!postId) return new Response(JSON.stringify({ error: "post_id required" }), { status: 400 });
    const r = await deletePost(cfg, String(postId));
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "republish") {
    const cid = body.id;
    const networksOverride = body.networks as string[] | undefined;
    if (!cid) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const { data: row } = await supa.from("content_calendar").select("id, content_type, body, cta, hashtags, image_url, scheduled_for, status, metadata").eq("id", cid).single();
    if (!row) return new Response(JSON.stringify({ error: "content_calendar row not found" }), { status: 404 });
    const r = await schedulePost(cfg, row, networksOverride);
    return new Response(JSON.stringify(r), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "bulk_delete_stock") {
    const { data: rows } = await supa.from("content_calendar").select("id, external_post_id, title, image_source, metadata").eq("image_source", "unsplash_direct_fallback").eq("status", "published").not("external_post_id", "is", null);
    const results: any[] = [];
    for (const row of (rows ?? [])) {
      if (dryRun) { results.push({ id: row.id, would_delete: row.external_post_id, title: row.title }); continue; }
      const r = await deletePost(cfg, String(row.external_post_id));
      if (r.ok || r.status === 404) {
        const newMeta = { ...(row.metadata || {}), deleted_at: new Date().toISOString(), deleted_reason: "stock_image_cleanup_6jun2026", metricool_delete_status: r.status };
        await supa.from("content_calendar").update({ status: "deleted_stock", metadata: newMeta }).eq("id", row.id);
      }
      results.push({ id: row.id, external_post_id: row.external_post_id, title: row.title, ...r });
      await sleep(700);
    }
    return new Response(JSON.stringify({ processed: results.length, dry_run: dryRun, results }), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "validate") {
    const res = await fetch(`${MC_BASE}/admin/simpleProfiles?${qs(cfg)}`, { headers: mcHeaders() });
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ status: res.status, ids: { userId: cfg.user_id, blogId: cfg.blog_id }, google_network: cfg.google_network ?? null, brands: data }), { status: res.ok ? 200 : res.status, headers: { "Content-Type": "application/json" } });
  }

  const supported = Object.keys(NETWORK_MAP).filter((k) => NETWORK_MAP[k].kind === "image");
  const { data: rows, error } = await supa.from("content_calendar").select("id, content_type, body, cta, hashtags, image_url, scheduled_for, status, metadata").eq("status", "approved").in("content_type", supported).order("scheduled_for", { ascending: true, nullsFirst: true }).limit(cfg.batch);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const results: any[] = [];
  for (const row of rows ?? []) {
    if (dryRun) { const map = NETWORK_MAP[row.content_type]; results.push({ id: row.id, networks: resolveNetworks(map?.networks ?? [], cfg.google_network), would_publish: true, has_image: !!row.image_url, stock_blocked: isStockImage(row.image_url) }); continue; }
    const r = await schedulePost(cfg, row);
    if (r.ok) { await supa.rpc("metricool_mark_scheduled", { p_id: row.id, p_external_id: r.id ?? null, p_autopublish: cfg.autopublish }); }
    else { await supa.rpc("metricool_mark_failed", { p_id: row.id, p_error: r.error }); }
    results.push({ id: row.id, ...r });
    await sleep(1100);
  }
  return new Response(JSON.stringify({ processed: results.length, autopublish: cfg.autopublish, dry_run: dryRun, google_network: cfg.google_network ?? "NOT_SET", networks_per_post: "IG+FB+X+Threads+Bluesky+LinkedIn+Google", results }), { headers: { "Content-Type": "application/json" } });
});
