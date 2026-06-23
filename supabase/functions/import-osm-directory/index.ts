import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").slice(0, 40);
}

// Map an OSM element's tags to a Madmona directory bucket (resolved to a
// category_id later in promote_directory_batch). Returns null to skip.
function bucketize(t: any): string | null {
  const shop = t.shop, am = t.amenity, lei = t.leisure, tou = t.tourism, craft = t.craft, off = t.office;
  if (am) {
    if (am === "restaurant" || am === "fast_food" || am === "food_court") return "food";
    if (am === "cafe" || am === "bar" || am === "pub" || am === "nightclub") return "cafe";
    if (am === "ice_cream") return "dessert";
    if (am === "pharmacy") return "pharmacy";
    if (am === "clinic" || am === "doctors" || am === "dentist" || am === "hospital") return "clinic";
    if (am === "veterinary") return "vet";
    if (am === "car_wash" || am === "car_rental") return "auto_service";
    if (am === "marketplace") return "supermarket";
    if (am === "fuel" || am === "cinema" || am === "theatre") return "misc";
  }
  if (lei) return "fitness";
  if (tou) return "hotel";
  if (craft) return "craft";
  if (off) return "office";
  if (shop) {
    const s = shop;
    const inn = (arr: string[]) => arr.includes(s);
    if (inn(["supermarket","convenience","grocery","general","department_store","wholesale","variety_store","kiosk"])) return "supermarket";
    if (inn(["greengrocer","farm","dairy"])) return "produce";
    if (inn(["butcher","seafood","cheese","deli"])) return "produce";
    if (inn(["bakery","pastry","confectionery","chocolate"])) return "dessert";
    if (inn(["clothes","boutique","fashion","shoes","tailor","fabric","bag","leather","fashion_accessories"])) return "fashion";
    if (inn(["jewelry","jewellery","watches"])) return "fashion";
    if (inn(["electronics","computer","hifi","camera","radiotechnics"])) return "electronics";
    if (inn(["mobile_phone","telecommunication"])) return "electronics";
    if (inn(["furniture","houseware","kitchen","interior_decoration","curtain","bed","carpet","lighting","window_blind"])) return "home";
    if (inn(["doityourself","hardware","trade","paint","electrical","building_materials","tiles","glaziery","plumbing"])) return "hardware";
    if (inn(["car","motorcycle"])) return "auto";
    if (inn(["car_repair"])) return "auto_service";
    if (inn(["car_parts","tyres"])) return "auto_parts";
    if (inn(["bicycle"])) return "sports";
    if (inn(["books","stationery","newsagent"])) return "books";
    if (inn(["toys","baby_goods","kids"])) return "baby";
    if (inn(["sports","outdoor","fishing","hunting"])) return "sports";
    if (inn(["cosmetics","perfumery","chemist"])) return "cosmetics";
    if (inn(["hairdresser","beauty","massage","tattoo","nail"])) return "beauty";
    if (inn(["laundry","dry_cleaning"])) return "laundry";
    if (inn(["pet","pet_grooming"])) return "pet";
    if (inn(["travel_agency"])) return "office";
    return "misc";
  }
  return null;
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { south, west, north, east } = body;
    const governorate = body.governorate ?? null;
    const cityHint = body.city ?? null;
    if ([south, west, north, east].some((v) => typeof v !== "number")) {
      return new Response(JSON.stringify({ error: "south/west/north/east (numbers) required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const cap = Math.min(body.max ?? 10000, 20000);

    const bb = `(${south},${west},${north},${east})`;
    const q = `[out:json][timeout:120];(`
      + `nwr["shop"]${bb};`
      + `nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|pharmacy|clinic|doctors|dentist|hospital|veterinary|car_wash|car_rental|marketplace|fuel|cinema|theatre|bar|pub|nightclub)$"]${bb};`
      + `nwr["leisure"~"^(fitness_centre|sports_centre|swimming_pool|dance|bowling_alley)$"]${bb};`
      + `nwr["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"]${bb};`
      + `nwr["craft"]${bb};`
      + `nwr["office"~"^(company|estate_agent|insurance|lawyer|accountant|it|advertising_agency|travel_agent|architect|engineer|financial|telecommunication|coworking)$"]${bb};`
      + `);out center ${cap};`;

    const ovRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Madmona-directory/2.0" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!ovRes.ok) {
      return new Response(JSON.stringify({ error: "overpass " + ovRes.status }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
    const ov = await ovRes.json();
    const els = (ov.elements ?? []) as any[];

    const rows: any[] = [];
    for (const e of els) {
      const t = e.tags ?? {};
      const name = t["name:ar"] || t["name"];
      if (!name) continue;
      const lat = typeof e.lat === "number" ? e.lat : e.center?.lat;
      const lon = typeof e.lon === "number" ? e.lon : e.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      const cat = bucketize(t);
      if (!cat) continue;
      const phone = t["phone"] || t["contact:phone"] || t["mobile"] || null;
      const website = t["website"] || t["contact:website"] || null;
      const addrParts = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"]].filter(Boolean);
      const address = addrParts.length ? addrParts.join(", ") : null;
      const city = t["addr:city"] || cityHint;
      const subtype = t.shop || t.amenity || t.leisure || t.tourism || t.craft || t.office || null;
      rows.push({
        source: "osm",
        source_ref: `${e.type}/${e.id}`,
        name,
        category: cat,
        subtype,
        phone,
        website,
        address,
        city,
        governorate,
        lat,
        lon,
        raw: t,
        dedupe_key: `${norm(name)}_${lat.toFixed(3)}_${lon.toFixed(3)}`,
        status: "staged",
      });
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/directory_import_staging?on_conflict=source,source_ref`, {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": "Bearer " + SERVICE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: "insert failed", detail: txt.slice(0, 400), inserted_before_fail: inserted }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({ fetched: els.length, named_geo: rows.length, upserted: inserted, with_phone: rows.filter((r) => r.phone).length }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
