// metricool-pinterest — isolated helper for Pinterest publishing (board required).
// Does NOT touch the production metricool-publish function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MC_BASE = "https://app.metricool.com/api";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
let TOKEN = "";

type Cfg = { user_id: string; blog_id: string; timezone: string; autopublish: boolean };
const mcHeaders = () => ({ "Content-Type": "application/json", "X-Mc-Auth": TOKEN });
const qs = (cfg: Cfg, extra: Record<string,string> = {}) => new URLSearchParams({ userId: cfg.user_id, blogId: cfg.blog_id, ...extra }).toString();

function localIso(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).formatToParts(d);
  const g = (t:string)=>parts.find(p=>p.type===t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
}

async function normalizeImage(cfg: Cfg, url: string): Promise<string|null> {
  try {
    const res = await fetch(`${MC_BASE}/actions/normalize/image/url?${qs(cfg,{url})}`, { headers: mcHeaders() });
    if (!res.ok) return url;
    const txt = await res.text();
    try { const d = JSON.parse(txt); const id = d?.mediaId ?? d?.id ?? d?.url ?? null; if (id) return String(id); } catch {}
    const cleaned = txt.trim().replace(/^\"|\"$/g, "");
    return cleaned.startsWith("http") ? cleaned : url;
  } catch { return url; }
}

async function probeBoards(cfg: Cfg) {
  const cands = [
    "/v2/settings/pinterest/boards",
    "/v2/settings/networks/pinterest/boards",
    "/v2/scheduler/pinterest/boards",
    "/v2/pinterest/boards",
    "/pinterest/boards",
    "/v2/settings/connections/pinterest/boards",
  ];
  const out: any[] = [];
  for (const p of cands) {
    try {
      const res = await fetch(`${MC_BASE}${p}?${qs(cfg)}`, { headers: mcHeaders() });
      const txt = await res.text();
      out.push({ path: p, status: res.status, body: txt.slice(0, 1200) });
    } catch (e) { out.push({ path: p, error: String(e) }); }
  }
  return out;
}

Deno.serve(async (req) => {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: tok } = await supa.rpc("get_metricool_token");
  TOKEN = (tok ?? "") as string;
  if (!TOKEN) return new Response(JSON.stringify({ error: "no token" }), { status: 500 });
  const { data: cfgRow } = await supa.from("metricool_config").select("user_id, blog_id, timezone, autopublish").eq("id",1).single();
  const cfg = cfgRow as Cfg;
  const body = await req.json().catch(()=>({}));
  const action = body.action ?? "diag";

  if (action === "diag") {
    const boards = await probeBoards(cfg);
    return new Response(JSON.stringify({ boards }, null, 1), { headers: { "Content-Type": "application/json" } });
  }

  if (action === "publish") {
    const cid = body.id;
    const boardId = body.boardId; // explicit board id required
    if (!cid || !boardId) return new Response(JSON.stringify({ error: "id and boardId required" }), { status: 400 });
    const { data: row } = await supa.from("content_calendar").select("id, title, body, cta, image_url").eq("id", cid).single();
    if (!row) return new Response(JSON.stringify({ error: "row not found" }), { status: 404 });
    let text = [String(row.body??"").trim(), String(row.cta??"").trim()].filter(Boolean).join("\n\n");
    if (text.length > 480) text = text.slice(0, 477) + "…";
    let media: string[] = [];
    if (row.image_url) { const id = await normalizeImage(cfg, row.image_url); if (id) media = [String(id)]; }
    if (!media.length) return new Response(JSON.stringify({ error: "no media" }), { status: 400 });
    const when = new Date(Date.now() + 5*60*1000);
    const payload: Record<string,unknown> = {
      providers: [{ network: "pinterest" }],
      publicationDate: { dateTime: localIso(when, cfg.timezone), timezone: cfg.timezone },
      text,
      autoPublish: cfg.autopublish,
      media,
      pinterestData: { boardId: String(boardId), pinTitle: String(row.title ?? "مضمونة"), pinNewFormat: true, link: "https://madmonacairo.com/careers" },
    };
    const res = await fetch(`${MC_BASE}/v2/scheduler/posts?${qs(cfg)}`, { method:"POST", headers: mcHeaders(), body: JSON.stringify(payload) });
    const txt = await res.text();
    return new Response(JSON.stringify({ status: res.status, ok: res.ok, response: txt.slice(0,800), sentBoardId: boardId }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400 });
});
