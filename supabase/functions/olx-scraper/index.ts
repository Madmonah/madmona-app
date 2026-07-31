// olx-scraper v4 — comprehensive: all major cities, rentals + FOR-SALE properties + vehicles
// v3 (9 Jul 2026): + for-sale apartments/villas/chalets URLs (categories *_sale)
// v4 (31 Jul 2026): + مركبات أوسع (سيارات للبيع، دراجات نارية) + مركبات بحرية (بورصة/يخوت)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// URLs across rental + sale categories + cities + vehicles
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
  // CARS FOR RENT — 4 cities
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/cairo/", category: "cars", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/giza/", category: "cars", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/alexandria/", category: "cars", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-rent/red-sea/", category: "cars", default_loc: "الغردقة" },
  // 🚗 CARS FOR SALE — v4 (31 Jul 2026). DB category_check constraint only
  // allows the generic "vehicles" value, not "cars_sale" — use "vehicles"
  // for the DB category column; business_name keeps the specific Arabic label.
  { url: "https://www.olx.com.eg/vehicles/cars-for-sale/cairo/", category: "vehicles", label: "سيارة للبيع", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-sale/giza/", category: "vehicles", label: "سيارة للبيع", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-sale/alexandria/", category: "vehicles", label: "سيارة للبيع", default_loc: "الإسكندرية" },
  { url: "https://www.olx.com.eg/vehicles/cars-for-sale/red-sea/", category: "vehicles", label: "سيارة للبيع", default_loc: "الغردقة" },
  // 🏍️ MOTORCYCLES & ACCESSORIES — v4 (31 Jul 2026) — also DB category "vehicles"
  { url: "https://www.olx.com.eg/vehicles/motorcycles-accessories/cairo/", category: "vehicles", label: "دراجة نارية", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/vehicles/motorcycles-accessories/giza/", category: "vehicles", label: "دراجة نارية", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/vehicles/motorcycles-accessories/alexandria/", category: "vehicles", label: "دراجة نارية", default_loc: "الإسكندرية" },
  // \u26f5 BOATS - WATERCRAFT (\u0645\u0631\u0643\u0628\u0627\u062a \u0628\u062d\u0631\u064a\u0629) \u2014 v4 (31 Jul 2026) \u2014 DB category "marine"/"marine_sale"
  // v5 (31 Jul 2026 \u062a\u0627\u0646\u064a): + \u0635\u0641\u062d\u0629 2 \u0644\u0643\u0644 \u0645\u0646\u0637\u0642\u0629 (\u0645\u0632\u064a\u062f \u0625\u0639\u0644\u0627\u0646\u0627\u062a) + \u062a\u0635\u0646\u064a\u0641 \u0628\u064a\u0639/\u0625\u064a\u062c\u0627\u0631 \u062a\u0644\u0642\u0627\u0626\u064a \u0641\u064a extractLeads
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/alexandria/", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/alexandria/?page=2", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/red-sea/", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u063a\u0631\u062f\u0642\u0629" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/red-sea/?page=2", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u063a\u0631\u062f\u0642\u0629" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/matrouh/", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u0633\u0627\u062d\u0644 \u0627\u0644\u0634\u0645\u0627\u0644\u064a" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/south-sinai/", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0633\u064a\u0646\u0627\u0621" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/south-sinai/?page=2", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0633\u064a\u0646\u0627\u0621" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/cairo/", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629" },
  { url: "https://www.olx.com.eg/vehicles/boats-watercraft/cairo/?page=2", category: "marine", label: "\u0645\u0631\u0643\u0628 \u0628\u062d\u0631\u064a", default_loc: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629" },
  { url: "https://www.olx.com.eg/business-industrial-agriculture/", category: "equipment", default_loc: "القاهرة" },
  // OFFICES & COMMERCIAL
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/cairo/", category: "workspaces", default_loc: "القاهرة" },
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/giza/", category: "workspaces", default_loc: "الجيزة" },
  { url: "https://www.olx.com.eg/properties/office-commercial-for-rent/alexandria/", category: "workspaces", default_loc: "الإسكندرية" },
  // 🏷️ APARTMENTS FOR SALE — v3 (مناطق عالية الطلب)
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
      // categoryInfo.label overrides the generic per-category label when several
      // 31 يوليو 2026 (تاني): مركبات بحرية OLX مالهاش رابط منفصل بيع/إيجار
      // زي الشقق — كله في نفس الصفحة. نصنّف من نص الوصف نفسه: كلمة إيجار/تأجير
      // صريحة = إيجار، غير كده (الأغلبية الساحقة) = بيع (marine_sale).
      let effectiveCategory = categoryInfo.category
      if (effectiveCategory === "marine") {
        const rentWords = ["إيجار", "تأجير", "ايجار", "يومي", "باليوم", "لليلة"]
        const isRent = rentWords.some(w => desc.includes(w))
        effectiveCategory = isRent ? "marine" : "marine_sale"
      }
      // sub-types share one DB category value (e.g. "vehicles" covers cars-for-sale
      // AND motorcycles — the DB category_check constraint doesn't allow finer values).
      const baseLabel = (categoryInfo as any).label || labelMap[categoryInfo.category] || "إعلان";
      const displayLabel = effectiveCategory === "marine_sale" ? `${baseLabel} للبيع` : effectiveCategory === "marine" ? `${baseLabel} للإيجار` : baseLabel;
      leads.push({
        business_name: `${displayLabel} - ${location}`,
        phone, category: effectiveCategory, location, city: location,
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
