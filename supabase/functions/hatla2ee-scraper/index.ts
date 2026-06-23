// hatla2ee-scraper — used cars marketplace, paginated /ar/car/page/N
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractLeads(html: string, pageNum: number) {
  const phonePattern = /\b01[0125]\d{8}\b/g;
  const seen = new Set<string>();
  const leads: Array<Record<string, unknown>> = [];
  let match: RegExpExecArray | null;
  while ((match = phonePattern.exec(html)) !== null) {
    const raw = match[0];
    const phone = "+20" + raw.slice(1);
    if (seen.has(phone)) continue;
    seen.add(phone);
    const start = Math.max(0, match.index - 400);
    const ctx = html.slice(start, match.index + 50);
    const desc = ctx.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(-250);
    if (desc.length < 15) continue;
    leads.push({
      business_name: "سيارة مستعملة - Hatla2ee",
      phone,
      category: "vehicles",
      location: "مصر",
      source: "hatla2ee_used_cars",
      source_url: `https://eg.hatla2ee.com/ar/car/page/${pageNum}`,
      status: "new",
      notes: desc.slice(0, 250),
    });
  }
  return leads;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const url = new URL(req.url);
  const startPage = parseInt(url.searchParams.get("start") || "1", 10);
  const count = Math.min(parseInt(url.searchParams.get("count") || "10", 10), 15);

  const results: Record<string, unknown> = {
    pages_processed: [] as Array<unknown>,
    total_extracted: 0,
    total_inserted: 0,
    errors: [] as Array<unknown>,
  };
  const pages = results.pages_processed as Array<Record<string, unknown>>;
  const errs = results.errors as Array<unknown>;

  for (let i = 0; i < count; i++) {
    const pageNum = startPage + i;
    const pageUrl = `https://eg.hatla2ee.com/ar/car/page/${pageNum}`;
    try {
      const resp = await fetch(pageUrl, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "ar,en;q=0.9" } });
      if (!resp.ok) {
        errs.push({ page: pageNum, status: resp.status });
        continue;
      }
      const html = await resp.text();
      const leads = extractLeads(html, pageNum);
      let inserted = 0;
      for (const lead of leads) {
        const { error } = await supabase.from("cold_leads").insert(lead);
        if (!error) inserted++;
      }
      pages.push({ page: pageNum, extracted: leads.length, inserted });
      results.total_extracted = (results.total_extracted as number) + leads.length;
      results.total_inserted = (results.total_inserted as number) + inserted;
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) {
      errs.push({ page: pageNum, error: e instanceof Error ? e.message : "unknown" });
    }
  }

  results.completed_at = new Date().toISOString();
  results.next_start = startPage + count;
  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
});
