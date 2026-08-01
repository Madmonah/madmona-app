// sync-leads-to-sheets v2 (31 يوليو 2026)
//
// v1: تاب واحد فيه كل الليدز مع عمود category نصي.
// v2 (طلب محمد): تابات منفصلة لكل قسم + عمود "اتبعتله؟" مبني من داتا حقيقية
// (whatsapp_conversations.last_outbound_at) مش من status الجدول اللي محدش
// بيحدّثه فعليًا (كل الليدز status='new' للأبد لأنه مفيش أوتوميشن بيبعت
// من cold_leads أصلاً — status مش موثوق فيه كمصدر حقيقة).

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

function normPhone(p: string | null): string | null {
  if (!p) return null;
  let x = String(p).replace(/[^\d]/g, "");
  if (x.startsWith("0") && x.length === 11) x = "20" + x.slice(1);
  if (!(x.startsWith("20") && x.length === 12)) return null;
  return "+" + x;
}

const CATEGORY_LABELS: Record<string, string> = {
  apartments: "شقق للإيجار",
  apartments_sale: "شقق للبيع",
  villas: "فيلات للإيجار",
  villas_sale: "فيلات للبيع",
  chalets: "شاليهات للإيجار",
  chalets_sale: "شاليهات للبيع",
  cars: "سيارات للإيجار",
  vehicles: "مركبات (بيع دراجات نارية)",
  marine: "مركبات بحرية للإيجار",
  marine_sale: "مركبات بحرية للبيع",
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
  if (!cat) return "غير مصنف";
  return (CATEGORY_LABELS[cat] || cat).replace(/[\/\\?*\[\]]/g, "-").slice(0, 90);
}

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

// 1 أغسطس 2026: clinic_leads جدول منفصل تمامًا عن cold_leads (مفيش category عليه)،
// وده اللي كان مخلي العيادات مش ظاهرة في الشيت خالص. clinic_leads.status موثوق فيه
// فعليًا (مش زي cold_leads) لأن enqueue_clinic_outreach_batch() بيحدّثه لـ'contacted'
// بعد كل إرسال حقيقي — فبنجمعه مع سجل whatsapp_conversations عشان أدق نتيجة.
async function fetchClinicLeads(): Promise<any[]> {
  const pageSize = 1000;
  const out: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("clinic_leads")
      .select("name, phone, specialty_ar, city, area, rating, user_ratings_total, status, source, place_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`clinic_leads page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function fetchContactedPhones(): Promise<Set<string>> {
  const pageSize = 1000;
  const set = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("whatsapp_conversations")
      .select("contact_phone")
      .not("last_outbound_at", "is", null)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`whatsapp_conversations page ${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data as { contact_phone: string | null }[]) {
      const p = normPhone(row.contact_phone);
      if (p) set.add(p);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return set;
}

async function sheetsGet(token: string): Promise<{ sheets: { properties: { sheetId: number; title: string } }[] }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets get failed: ${await res.text()}`);
  return res.json();
}

async function ensureTabsExist(token: string, existing: Map<string, number>, wantedTitles: string[]): Promise<Map<string, number>> {
  const toCreate = wantedTitles.filter(t => !existing.has(t));
  if (toCreate.length === 0) return existing;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: toCreate.map(title => ({ addSheet: { properties: { title } } })) }),
  });
  if (!res.ok) throw new Error(`addSheet failed: ${await res.text()}`);
  const json = await res.json();
  for (const reply of json.replies || []) {
    const p = reply.addSheet?.properties;
    if (p) existing.set(p.title, p.sheetId);
  }
  return existing;
}

const HEADERS = ["Phone", "اتبعتله؟", "وصف الإعلان", "الموقع", "Price", "Source", "Added Date", "Status الخام", "URL", "Synced_At"];

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10000");

    const [leads, contactedPhones, clinicLeads] = await Promise.all([fetchAllLeads(limit), fetchContactedPhones(), fetchClinicLeads()]);

    const byCategory = new Map<string, any[][]>();
    let totalRows = 0;
    let contactedCount = 0;
    for (const lead of leads) {
      const p = normPhone(lead.phone);
      if (!p) continue;
      const tabTitle = categoryLabel(lead.category);
      const arr = byCategory.get(tabTitle) || [];
      if (arr.some(r => r[0] === p)) continue;
      const contacted = contactedPhones.has(p);
      if (contacted) contactedCount++;
      arr.push([
        p,
        contacted ? "اتبعتله" : "لسه",
        cleanAdText(lead.notes, lead.business_name || ""),
        [lead.location, lead.city].filter(Boolean).join(" - "),
        "",
        lead.source || "",
        (lead.added_at || "").slice(0, 10),
        lead.status || "",
        (lead.source_url || "").slice(0, 200),
        new Date().toISOString().slice(0, 19).replace("T", " "),
      ]);
      byCategory.set(tabTitle, arr);
      totalRows++;
    }

    const clinicTabTitle = "\u0639\u064a\u0627\u062f\u0627\u062a";
    const clinicRows: any[][] = [];
    let clinicContactedCount = 0;
    for (const clinic of clinicLeads) {
      const p = normPhone(clinic.phone);
      if (!p) continue;
      if (clinicRows.some(r => r[0] === p)) continue;
      const contacted = (clinic.status && clinic.status !== "new") || contactedPhones.has(p);
      if (contacted) clinicContactedCount++;
      const ratingText = clinic.rating ? `${clinic.rating}\u2b50 (${clinic.user_ratings_total || 0} \u062a\u0642\u064a\u064a\u0645)` : "";
      clinicRows.push([
        p,
        contacted ? "\u0627\u062a\u0628\u0639\u062a\u0644\u0647" : "\u0644\u0633\u0647",
        [clinic.name, clinic.specialty_ar, ratingText].filter(Boolean).join(" - "),
        [clinic.area, clinic.city].filter(Boolean).join(" - "),
        "",
        clinic.source || "",
        (clinic.created_at || "").slice(0, 10),
        clinic.status || "",
        clinic.place_id || "",
        new Date().toISOString().slice(0, 19).replace("T", " "),
      ]);
    }
    if (clinicRows.length > 0) {
      byCategory.set(clinicTabTitle, clinicRows);
      totalRows += clinicRows.length;
      contactedCount += clinicContactedCount;
    }

    for (const [, rows] of byCategory) {
      rows.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === "\u0644\u0633\u0647" ? -1 : 1));
    }

    const token = await getGoogleAccessToken();
    const existingSheets = await sheetsGet(token);
    const existingMap = new Map<string, number>(
      existingSheets.sheets.map(s => [s.properties.title, s.properties.sheetId])
    );

    const wantedTitles = Array.from(byCategory.keys());
    await ensureTabsExist(token, existingMap, wantedTitles);

    const perTabResults: Record<string, number> = {};
    for (const [tabTitle, rows] of byCategory) {
      const safeTitle = tabTitle.replace(/'/g, "''");
      const clearRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/'${encodeURIComponent(safeTitle)}'!A:J:clear`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" }
      );
      if (!clearRes.ok) throw new Error(`clear tab "${tabTitle}" failed: ${await clearRes.text()}`);

      const values = [HEADERS, ...rows];
      const endRow = values.length;
      const upRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/'${encodeURIComponent(safeTitle)}'!A1:J${endRow}?valueInputOption=RAW`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) }
      );
      if (!upRes.ok) throw new Error(`upload tab "${tabTitle}" failed: ${await upRes.text()}`);
      perTabResults[tabTitle] = rows.length;
      await new Promise(r => setTimeout(r, 150));
    }

    return new Response(JSON.stringify({
      ok: true,
      leads_fetched: leads.length,
      unique_rows_uploaded: totalRows,
      contacted_count: contactedCount,
      not_contacted_count: totalRows - contactedCount,
      tabs: perTabResults,
      sheet_url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
      elapsed_ms: Date.now() - started,
    }, null, 2), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message, elapsed_ms: Date.now() - started }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
