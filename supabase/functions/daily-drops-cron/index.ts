// daily-drops-cron — Auto-generate daily drop at midnight Cairo time
// Runs via pg_cron at 22:00 UTC (00:00 Cairo, EET+2)
// Picks a top-viewed published listing, creates a curated drop with smart discount labeling.
// Idempotent: skips if today's drop already exists.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get Cairo date (UTC+2, no DST since 2014)
function getCairoDate(): string {
  const now = new Date();
  const cairo = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return cairo.toISOString().split("T")[0];
}

// Smart discount labels — vary daily to feel fresh
const DISCOUNT_TEMPLATES = [
  { label: "خصم خاص ٢٠٪", pct: 20 },
  { label: "عرض اليوم ١٥٪", pct: 15 },
  { label: "وفّر ٢٥٪", pct: 25 },
  { label: "خصم بمناسبة...", pct: 18 },
  { label: "عرض حصري", pct: 22 },
  { label: "٢٤ ساعة فقط — ٣٠٪", pct: 30 },
];

const CTA_VARIANTS = [
  "احجز قبل ما يخلص",
  "اقتنصها دلوقتي",
  "عرض اليوم — اضغط",
  "اطلب قبل ١٢ بليل",
  "خد العرض قبل ما يطير",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const today = getCairoDate();
  const runStartedAt = new Date().toISOString();

  try {
    // 1) Idempotency check
    const { data: existing } = await supabase
      .from("daily_drops")
      .select("id, drop_date")
      .eq("drop_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          status: "already_exists",
          drop_date: today,
          existing_drop_id: existing.id,
          message: "الـ drop لليوم موجود بالفعل",
        }),
        { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2) Pick a candidate — top 15 by views, exclude listings already in active drops
    const { data: recentDropIds } = await supabase
      .from("daily_drops")
      .select("listing_id")
      .gte("drop_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
      .not("listing_id", "is", null);

    const recentListingIds = (recentDropIds || []).map((r) => r.listing_id).filter(Boolean);

    let query = supabase
      .from("listings")
      .select(
        `id, title, city, district, views_count, supplier_id,
         categories(slug, name_ar),
         pricing_rules(price, period_type, label_ar)`
      )
      .eq("status", "published")
      .order("views_count", { ascending: false })
      .limit(15);

    if (recentListingIds.length > 0) {
      query = query.not("id", "in", `(${recentListingIds.join(",")})`);
    }

    const { data: candidates, error: candErr } = await query;

    if (candErr) throw new Error(`candidate fetch failed: ${candErr.message}`);
    if (!candidates || candidates.length === 0) {
      // Log alert and exit gracefully
      await supabase.from("admin_alerts").insert({
        alert_type: "daily_drops_no_candidates",
        severity: "warning",
        title: "⚠️ مفيش listings مرشحة لـ daily drop اليوم",
        summary: `لم يتم العثور على published listings لاختيار daily drop ليوم ${today}. كل الـ top 15 منشورة بالفعل في آخر ٣٠ يوم.`,
        agent_name: "daily-drops-cron",
        status: "unread",
      });
      return new Response(
        JSON.stringify({ status: "no_candidates", drop_date: today }),
        { headers: { ...CORS, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 3) Pick random from top candidates (weighted toward top 5)
    const weights = candidates.map((_, i) => Math.max(1, 15 - i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { pickedIdx = i; break; }
    }
    const picked = candidates[pickedIdx];

    // 4) Generate discount + CTA from rotation
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const discount = DISCOUNT_TEMPLATES[dayOfYear % DISCOUNT_TEMPLATES.length];
    const cta = CTA_VARIANTS[dayOfYear % CTA_VARIANTS.length];

    // Compute prices if we have any pricing_rule
    const firstRule = (picked.pricing_rules as any)?.[0];
    const originalPrice = firstRule?.price || null;
    const dropPrice = originalPrice ? Math.round(originalPrice * (1 - discount.pct / 100)) : null;

    const categorySlug = (picked.categories as any)?.slug || "properties";
    const categoryName = (picked.categories as any)?.name_ar || "";

    // 5) Build hero copy
    const heroTitle = `🎯 عرض اليوم: ${picked.title}`;
    const heroSubtitle = `${picked.city || ""}${picked.city && categoryName ? " · " : ""}${categoryName} — ٢٤ ساعة فقط`;

    // 6) Insert drop
    const { data: newDrop, error: insertErr } = await supabase
      .from("daily_drops")
      .insert({
        drop_date: today,
        listing_id: picked.id,
        hero_title_ar: heroTitle,
        hero_subtitle_ar: heroSubtitle,
        discount_label_ar: discount.label,
        original_price: originalPrice,
        drop_price: dropPrice,
        cta_label_ar: cta,
        cta_url: `/listing/${picked.id}`,
        badge_color: "#1F6F5F",
        sponsorship_type: "madmona_curated",
        daily_fee_egp: 0,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) throw new Error(`drop insert failed: ${insertErr.message}`);

    // 7) Log activity event for pulse feed
    await supabase.from("live_activity_events").insert({
      event_type: "price_dropped",
      display_message_ar: `🎯 عرض اليوم نزل! ${discount.label} على ${picked.title}`,
      emoji: "🔥",
      listing_id: picked.id,
      category_slug: categorySlug,
      city: picked.city,
      metadata: { drop_id: newDrop.id, source: "daily-drops-cron" },
    });

    // 8) Success log
    await supabase.from("agent_runs").insert({
      agent_name: "daily-drops-cron",
      trigger_type: "cron",
      status: "success",
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
      output_summary: {
        drop_date: today,
        listing_id: picked.id,
        listing_title: picked.title,
        discount_pct: discount.pct,
        original_price: originalPrice,
        drop_price: dropPrice,
      },
    });

    return new Response(
      JSON.stringify({
        status: "created",
        drop_date: today,
        drop_id: newDrop.id,
        listing: {
          id: picked.id,
          title: picked.title,
          city: picked.city,
          views: picked.views_count,
        },
        discount: discount.label,
        cta: cta,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (err: any) {
    // Log failure
    await supabase.from("agent_runs").insert({
      agent_name: "daily-drops-cron",
      trigger_type: "cron",
      status: "error",
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
      error_message: err.message || String(err),
    });
    await supabase.from("admin_alerts").insert({
      alert_type: "daily_drops_cron_failed",
      severity: "high",
      title: "🚨 daily-drops-cron فشل",
      summary: err.message || String(err),
      agent_name: "daily-drops-cron",
      status: "unread",
    });
    return new Response(
      JSON.stringify({ status: "error", error: err.message || String(err) }),
      { headers: { ...CORS, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
