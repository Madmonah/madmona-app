import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHEET_ID = "1S75ytMW_K5klO4OQuDPSYEv3U0qG5DRIZg-VEsf2h-w";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binary = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
  return await crypto.subtle.importKey("pkcs8", binary, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function getGoogleAccessToken(): Promise<string> {
  const { data: credsJson, error: vErr } = await sb.rpc("get_google_sheets_creds");
  if (vErr || !credsJson) throw new Error(`Vault RPC failed: ${vErr?.message}`);
  const creds = JSON.parse(credsJson as string);
  const key = await importPrivateKey(creds.private_key);
  const jwt = await create({ alg: "RS256", typ: "JWT" }, { iss: creds.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: creds.token_uri, iat: getNumericDate(0), exp: getNumericDate(3600) }, key);
  const tokRes = await fetch(creds.token_uri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const tokJson = await tokRes.json();
  if (!tokJson.access_token) throw new Error(`Google auth failed: ${JSON.stringify(tokJson)}`);
  return tokJson.access_token;
}

// 31 Jul 2026: normalize to FULL INTERNATIONAL format (+20XXXXXXXXXX) instead of
// stripping the country code back to local format. This sheet is used as a
// source list for WhatsApp bulk sends (OpenWA), which requires +20 format.
function normPhone(p: string | null): string | null {
  if (!p) return null;
  let x = String(p).replace(/[^\d]/g, "");
  if (x.startsWith("0") && x.length === 11) x = "20" + x.slice(1);
  if (!(x.startsWith("20") && x.length === 12)) return null;
  return "+" + x;
}

// 31 Jul 2026: clean Arabic display labels for category codes (بدل الكود الخام)
const CATEGORY_LABELS: Record<string, string> = {
  apartments: "شقق للإيجار",
  apartments_sale: "شقق للبيع",
  villas: "فيلات للإيجار",
  villas_sale: "فيلات للبيع",
  chalets: "شاليهات للإيجار",
  chalets_sale: "شاليهات للبيع",
  cars: "سيارات للإيجار",
  vehicles: "مركبات (بيع/دراجات نارية)",
  marine: "مركبات بحرية",
  equipment: "معدات وآليات",
  workspaces: "مكاتب ومساحات عمل",
  workspace: "مساحات عمل",
  weddings: "قاعات وأفراح",
  makeup_artists: "فنانين مكياج",
  hair_stylists: "مصففين شعر",
  clinics: "عيادات",
  products: "منتجات",
  cameras: "كاميرات",
  rentals: "إيجارات عامة",
  restaurants: "مطاعم",
  professionals: "محترفين",
  services: "خدمات",
  other: "أخرى",
};
function categoryLabel(cat: string | null): string {
  if (!cat) return "غير مصنّف";
  return CATEGORY_LABELS[cat] || cat;
}

// 31 Jul 2026: notes = real scraped ad text (much richer than the generic
// "شقة للبيع - المدينة" placeholder). Clean up JSON/HTML scraping artifacts
// and use it as the displayed ad description when it's usable.
function cleanAdText(notes: string | null, fallback: string): string {
  if (!notes) return fallback;
  let n = notes;
  n = n.replace(/\\"[a-zA-Z0-9_]+\\":\s*\\?"[^"]*\\?"/g, " ");
  n = n.replace(/"[a-zA-Z0-9_]+":\s*(null|true|false|[\d.]+|"[^"]*")/g, " ");
  n = n.replace(/[{}\[\]]/g, " ");
  n = n.replace(/\\n|\\u002F|\\u003C[^\\]*\\u003E/g, " ");
  n = n.replace(/["'`]/g, " ");
  n = n.replace(/\s+/g, " ").trim();
  if (n.length < 15) return fallback;
  return n.slice(0, 220);
}

async function fetchAllLeads(maxTotal: number): Promise<any[]> {
  const pageSize = 1000;
  const out: any[] = [];
  let from = 0;
  while (out.length < maxTotal) {
    const to = Math.min(from + pageSize - 1, maxTotal - 1);
    const { data, error } = await sb.from("cold_leads").select("phone, business_name, category, location, city, source, source_url, status, added_at, notes").order("category", { ascending: true }).order("added_at", { ascending: false }).range(from, to);
    if (error) throw new Error(`cold_leads page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10000");

    const leads = await fetchAllLeads(limit);

    const seen = new Set<string>();
    const rows: any[][] = [];
    for (const lead of leads) {
      const p = normPhone(lead.phone);
      if (!p || seen.has(p)) continue;
      seen.add(p);
      rows.push([
        p,
        categoryLabel(lead.category),
        cleanAdText(lead.notes, lead.business_name || ""),
        [lead.location, lead.city].filter(Boolean).join(" - "),
        "",
        lead.source || "",
        (lead.added_at || "").slice(0, 10),
        lead.status || "pending",
        (lead.source_url || "").slice(0, 200),
        new Date().toISOString().slice(0, 19).replace("T", " "),
      ]);
    }

    const token = await getGoogleAccessToken();

    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:J:clear`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
    if (!clearRes.ok) throw new Error(`Sheets clear failed: ${await clearRes.text()}`);

    const values = [["Phone", "القسم", "وصف الإعلان", "الموقع", "Price", "Source", "Added Date", "Status", "URL", "Synced_At"], ...rows];
    const endRow = values.length;
    const upRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1:J${endRow}?valueInputOption=RAW`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
    if (!upRes.ok) throw new Error(`Sheets upload failed: ${await upRes.text()}`);
    const upJson = await upRes.json();

    return new Response(JSON.stringify({
      ok: true,
      leads_fetched: leads.length,
      unique_rows_uploaded: rows.length,
      cells_updated: upJson.updatedCells,
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
      elapsed_ms: Date.now() - started,
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message, elapsed_ms: Date.now() - started }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
