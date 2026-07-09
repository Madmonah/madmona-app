// olx-scraper v3 — comprehensive: all major cities, rentals + FOR-SALE properties
// v3 (9 Jul 2026): + for-sale apartments/villas/chalets URLs (categories *_sale)
//   عشان تاب «فرص معروضة 🔥 — للبيع» في بورصة العقارات يتملي بإعلانات بيع حقيقية.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 36 URLs across rental + sale categories + cities
const CATEGORIES = [
  // APARTMENTS FOR RENT — 11 cities
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/cairo/", category: "apartments", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/giza/", category: "apartments", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/alexandria/", category: "apartments", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/dakahlia/", category: "apartments", default_loc: "الدقهلية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/sharkia/", category: "apartments", default_loc: "الشرقية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/gharbia/", category: "apartments", default_loc: "الغربية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/qalyubia/", category: "apartments", default_loc: "القليوبية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/menofia/", category: "apartments", default_loc: "المنوفية" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/port-said/", category: "apartments", default_loc: "بورسعيد" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/suez/", category: "apartments", default_loc: "السويس" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-rent/ismailia/", category: "apartments", default_loc: "الإسماعيلية" },
  // VILLAS FOR RENT — 4 cities
  { url: "https://www.olx.com.eg/properties/houses-villas-for-rent/cairo/", category: "villas", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/houses-villas-for-rent/giza/", category: "villas", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/properties/houses-villas-for-rent/alexandria/", category: "villas", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/properties/houses-villas-for-rent/red-sea/", category: "villas", default_loc: "الغردقة" },
  // CHALETS / SHORT-TERM — 5 areas
  { url: "https://www.olx.com.eg/properties/short-term-cairo/cairo/", category: "chalets", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/short-term-cairo/alexandria/", category: "chalets", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/properties/short-term-cairo/red-sea/", category: "chalets", default_loc: "الغردقة" },
  { url: "https://www.olx.com.eg/properties/short-term-cairo/matrouh/", category: "chalets", default_loc: "مرسى مطروح" },
  { url: "https://www.olx.com.eg/properties/short-term-cairo/south-sinai/", category: "chalets", default_loc: "سيناء" },
  // CARS — 4 cities
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/cairo/", category: "cars", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/giza/", category: "cars", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/alexandria/", category: "cars", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/red-sea/", category: "cars", default_loc: "الغردقة" },
  // BUSINESS / EQUIPMENT
  { url: "https://www.olx.com.eg/business-industrial-agriculture/", category: "equipment", default_loc: "القاهرة" },
  // OFFICES & COMMERCIAL
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/cairo/", category: "workspaces", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/giza/", category: "workspaces", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/alexandria/", category: "workspaces", default_loc: "الإسكندرية" },
  // 🏷️ APARTMENTS FOR SALE — v3 (5 areas عالية الطلب)
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-sale/cairo/", category: "apartments_sale", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-sale/giza/", category: "apartments_sale", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/properties/apartments-duplex-for-sale/alexandria/", category: "apartments_sale", default_loc: "الإسكندرية" },
  // 🏷️ VILLAS FOR SALE
  { url: "https://www.olx.com.eg/properties/houses-villas-for-sale/cairo/", category: "villas_sale", default_loc: "القاهرة" },
  // 🏷️ CHALETS / VACATION FOR SALE (الساحل والعين السخنة)
  { url: "https://www.olx.com.eg/properties/vacation-homes-for-sale/matrouh/", category: "chalets_sale", default_loc: "الساحل الشمالي" },
  { url: "https://www.olx.com.eg/properties/vacation-homes-for-sale/suez/", category: "chalets_sale", default_loc: "العين السخنة" },
];

const LOCATIONS = ["مدينتي", "مدينة نصر", "التجمع", "الرحاب", "القاهرة الجديدة", "الشيخ زايد", "المعادي", "6 أكتوبر", "أكتوبر", "الشروق", "مارينا", "العين السخنة", "الغردقة", "الإسكندرية", "الساحل الشمالي", "هليوبوليس", "مصر الجديدة", "الزمالك", "شرم الشيخ", "دهب", "في لبان", "رأس سدر", "جمصة", "دون تاون", "العاصمة الإدارية", "راس الحكمة"];
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractLeads(html: string, categoryInfo: typeof CATEGORIES[0]) {
  const phonePattern = /\b(?:01[0125]\d{8}|\+201[0125]\d{8})\b/g;
  const seen = new Set<string>();
  const leads: Array<Record<string, unknown>> = [];
  let match;
  while ((match = phonePattern.exec(html)) !== null) {
    let phone = match[0];
    if (!phone.startsWith("+")) phone = "+20" + phone.slice(1);
    if (seen.has(phone)) continue;
    seen.add(phone);
    const start = Math.max(0, match.index - 600);
    const ctx = html.slice(start, match.index + 50);
    let desc = "";
    const altMatch = new RegExp(`alt="([^"]*${match[0].replace(/[+]/g, "\\+")}[^"]*)"`).exec(ctx);
    if (altMatch) desc = altMatch[1];
    else desc = ctx.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(-300);
    desc = desc.replace(/\\n/g, " ").replace(/\\u002F/g, "/").replace(/\\u003C[^>]+\\u003E/g, "").slice(0, 250);
    let location = categoryInfo.default_loc;
    for (const loc of LOCATIONS) {
      if (desc.includes(loc)) { location = loc; break; }
    }
    if (desc.length > 20) {
      const labelMap: Record<string, string> = {
        apartments: "شقة", chalets: "شاليه", villas: "فيلا",
        cars: "سيارة", workspaces: "مكتب", equipment: "معدات",
        apartments_sale: "شقة للبيع", villas_sale: "فيلا للبيع", chalets_sale: "شاليه للبيع",
      };
      leads.push({
        business_name: `${labelMap[categoryInfo.category] || "إعلان"} - ${location}`,
        phone, category: categoryInfo.category, location,
        source: "olx_individuals", source_url: categoryInfo.url, status: "new", notes: desc
      });
    }
  }
  return leads;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Allow ?start=N&count=M for batched runs (avoid 60s timeout)
  const url = new URL(req.url);
  const start = parseInt(url.searchParams.get("start") || "0", 10);
  const count = parseInt(url.searchParams.get("count") || "10", 10);
  const slice = CATEGORIES.slice(start, start + count);
  
  const results: Record<string, unknown> = { categories: [], total_extracted: 0, total_inserted: 0, errors: [], processed_range: [start, start + count] };
  const cats = results.categories as Array<unknown>;
  const errs = results.errors as Array<unknown>;

  for (const cat of slice) {
    try {
      const resp = await fetch(cat.url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "ar,en;q=0.9" } });
      if (!resp.ok) { errs.push({ url: cat.url, status: resp.status }); continue; }
      const html = await resp.text();
      const leads = extractLeads(html, cat);
      let inserted = 0;
      for (const lead of leads) {
        const { error } = await supabase.from("cold_leads").insert(lead);
        if (!error) inserted++;
      }
      cats.push({ url: cat.url, category: cat.category, extracted: leads.length, inserted });
      results.total_extracted = (results.total_extracted as number) + leads.length;
      results.total_inserted = (results.total_inserted as number) + inserted;
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      errs.push({ url: cat.url, error: (e as Error).message });
    }
  }
  results.completed_at = new Date().toISOString();
  results.total_categories = CATEGORIES.length;
  results.next_start = start + count < CATEGORIES.length ? start + count : null;
  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
});
