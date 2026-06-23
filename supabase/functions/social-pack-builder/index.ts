// social-pack-builder v3 — fixed content_calendar inserts (right content_type + status)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

let cachedKey: string | null = null;
async function getAnthropicKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.rpc("get_anthropic_key");
  if (error || !data) throw new Error("No Anthropic key: " + (error?.message ?? "empty"));
  cachedKey = data as string;
  return cachedKey;
}

const BRAND = {
  name:    "مضمونة",
  tagline: "احنا بتوع الإيجار",
  pillars: "حماية كاملة • دفع مستحقات سريع • دعم مستمر",
  colors:  { green: "#1F5F3F", gold: "#B8860B", ivory: "#FAF7F0" },
  cta_url: "https://madmonacairo.com",
};

function buildPrompt(L: Record<string, unknown>): string {
  const photos = (L.photos as { url: string }[] | null) ?? [];
  const price  = (L.pricing as { price: number; period: string }[] | null)?.[0];
  return `أنت مساعد محتوى لمنصة "${BRAND.name}" المصرية للإيجار. الهوية عامية مصرية، مينيمالية، لكشري بهدوء (زي Aesop). الألوان: أخضر غامق ${BRAND.colors.green}، ذهبي ${BRAND.colors.gold}، إيفوري ${BRAND.colors.ivory}. لا برتقالي فاتح.
الشعار: "${BRAND.tagline}" — الأعمدة: ${BRAND.pillars}

الـ listing:
  العنوان: ${L.title}
  الوصف: ${L.description ?? ""}
  المدينة: ${L.city ?? ""}
  المنطقة: ${L.district ?? ""}
  التصنيف: ${L.category_name_ar} (${L.category_slug})
  السعر: ${price ? `${price.price} EGP / ${price.period}` : "غير محدد"}
  عدد الصور: ${photos.length}
  رابط: ${BRAND.cta_url}/listing/${L.slug ?? L.id}

رجّعلي JSON واحد فقط بدون markdown بالشكل ده:
{
  "reel_script": {
    "hook": "5-7 كلمات",
    "scenes": [{"shot":"وصف","voiceover":"عامية","duration":4}, {"shot":"...","voiceover":"...","duration":5}, {"shot":"...","voiceover":"...","duration":6}, {"shot":"...","voiceover":"...","duration":5}],
    "cta": "احجز دلوقتي على madmonacairo.com",
    "music_hint": "مثلا: lofi هادي / oriental modern / upbeat",
    "total_duration_seconds": 20
  },
  "post_copies": {
    "family": "للعائلات (90-140 حرف)",
    "youth": "للشباب (90-140 حرف)",
    "urgent": "إلحاح/عرض محدود (90-140 حرف)"
  },
  "carousel_slides": [
    {"title":"slide 1","body":"hook قصير"},
    {"title":"slide 2","body":"ميزة 1"},
    {"title":"slide 3","body":"ميزة 2"},
    {"title":"slide 4","body":"سعر وموقع"},
    {"title":"slide 5","body":"CTA + رابط"}
  ],
  "hashtags": ["#مضمونة","...","..."],
  "design_brief": "تعليمات لـ ad-designer",
  "group_post_text": "نص جاهز للنسخ (200-350 حرف)"
}

لا تستخدم أرقام عربية. الأرقام لاتيني 0-9.`;
}

async function buildOnePack(packId: string): Promise<{ ok: boolean; pack_id: string; error?: string }> {
  const { data: claimed, error: claimErr } = await supabase
    .from("social_packs")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", packId).eq("status", "pending")
    .select().maybeSingle();

  if (claimErr || !claimed) return { ok: false, pack_id: packId, error: claimErr?.message ?? "not pending" };

  try {
    const { data: listing } = await supabase
      .from("listings")
      .select(`id, title, slug, description, city, district, category_id,
               category:categories(name_ar, slug, parent_id),
               photos:listing_photos(url),
               pricing:pricing_rules(price, period_type)`)
      .eq("id", claimed.listing_id).single();

    if (!listing) throw new Error("listing not found");

    const ctx = {
      ...listing,
      category_name_ar: (listing.category as { name_ar: string } | null)?.name_ar ?? "غير محدد",
      category_slug:    (listing.category as { slug: string } | null)?.slug ?? null,
      pricing: ((listing.pricing as { price: number; period_type: string }[]) ?? []).map((p) => ({
        price: p.price, period: p.period_type,
      })),
    };

    const apiKey = await getAnthropicKey();
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3500,
        temperature: 0.7,
        messages: [{ role: "user", content: buildPrompt(ctx) }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}: ${await claudeRes.text()}`);

    const claudeJson = await claudeRes.json();
    const rawText = claudeJson?.content?.[0]?.text ?? "";
    const match = rawText.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim().match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON: ${rawText.slice(0, 200)}`);

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(match[0]); }
    catch (e) { throw new Error(`Parse fail: ${match[0].slice(0, 200)}`); }

    await supabase.from("social_packs").update({
      status:       "ready",
      reel_script:  parsed.reel_script,
      post_copies:  parsed.post_copies,
      hashtags:     parsed.hashtags,
      design_brief: parsed.design_brief,
      completed_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }).eq("id", packId);

    let mainSlug = ctx.category_slug;
    const parentId = (listing.category as { parent_id: string | null } | null)?.parent_id;
    if (parentId) {
      const { data: parentCat } = await supabase.from("categories").select("slug").eq("id", parentId).maybeSingle();
      if (parentCat) mainSlug = parentCat.slug;
    }

    if (mainSlug) {
      const { data: groups } = await supabase
        .from("social_groups_catalog")
        .select("id").eq("category_slug", mainSlug).eq("is_active", true);
      if (groups && groups.length > 0) {
        await supabase.from("social_pack_group_posts").insert(
          groups.map((g: { id: string }) => ({
            pack_id: packId, group_id: g.id,
            post_text: String(parsed.group_post_text ?? ""),
            status: "queued",
          })),
        );
      }
    }

    // Queue auto-publish across all 3 content channels for buffer/IG publisher pickup.
    // content_type constraint allows: instagram_post, instagram_carousel, instagram_reel,
    // instagram_story, facebook_post, tiktok_script, blog_post, whatsapp_status, youtube_script.
    // status convention in existing rows is 'drafted' (not 'draft').
    const postCopies = parsed.post_copies as Record<string, string> | undefined;
    const hashtags = (parsed.hashtags as string[] | undefined) ?? [];
    const carouselSlides = parsed.carousel_slides;
    if (postCopies) {
      const captionFamily = postCopies.family || postCopies.youth || postCopies.urgent || "";
      const captionYouth  = postCopies.youth  || postCopies.family || postCopies.urgent || "";
      const captionUrgent = postCopies.urgent || postCopies.family || postCopies.youth  || "";
      const ctaUrl = `${BRAND.cta_url}/listing/${ctx.slug ?? ctx.id}`;
      const baseMeta = { social_pack_id: packId, listing_id: ctx.id, variants: postCopies };

      // One row per channel; buffer-publisher reads these by content_type
      await supabase.from("content_calendar").insert([
        {
          content_type: "instagram_post",
          title: ctx.title,
          body: captionFamily + "\n\n" + hashtags.join(" "),
          hashtags, cta: ctaUrl, design_brief: parsed.design_brief,
          status: "drafted",
          agent_name: "social-pack-builder",
          category: mainSlug ?? null, language: "ar-EG",
          metadata: { ...baseMeta, variant: "family" },
        },
        {
          content_type: "facebook_post",
          title: ctx.title,
          body: captionYouth + "\n\n" + hashtags.join(" "),
          hashtags, cta: ctaUrl, design_brief: parsed.design_brief,
          status: "drafted",
          agent_name: "social-pack-builder",
          category: mainSlug ?? null, language: "ar-EG",
          metadata: { ...baseMeta, variant: "youth" },
        },
        {
          content_type: "instagram_reel",
          title: ctx.title,
          body: captionUrgent + "\n\n" + hashtags.join(" "),
          hashtags, cta: ctaUrl, design_brief: parsed.design_brief,
          status: "drafted",
          agent_name: "social-pack-builder",
          category: mainSlug ?? null, language: "ar-EG",
          metadata: { ...baseMeta, variant: "urgent", reel_script: parsed.reel_script },
        },
        {
          content_type: "instagram_carousel",
          title: ctx.title,
          body: captionFamily + "\n\n" + hashtags.join(" "),
          hashtags, cta: ctaUrl, design_brief: parsed.design_brief,
          status: "drafted",
          agent_name: "social-pack-builder",
          category: mainSlug ?? null, language: "ar-EG",
          metadata: { ...baseMeta, variant: "carousel", carousel_slides: carouselSlides },
        },
      ]);
    }

    return { ok: true, pack_id: packId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("social_packs").update({
      status: "error", error_message: msg,
      retry_count: (claimed.retry_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", packId);
    return { ok: false, pack_id: packId, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  const body = await req.json().catch(() => ({}));

  if (body.pack_id) {
    const result = await buildOnePack(body.pack_id);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 500,
      headers: { "content-type": "application/json" },
    });
  }

  const limit = Math.min(Number(body.limit ?? 1), 10);
  const { data: pending } = await supabase.from("social_packs")
    .select("id").eq("status", "pending")
    .order("created_at", { ascending: true }).limit(limit);

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0, message: "no pending packs" }), {
      headers: { "content-type": "application/json" },
    });
  }

  const results = [];
  for (const p of pending) results.push(await buildOnePack(p.id));

  return new Response(JSON.stringify({
    processed: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    details: results,
  }), { headers: { "content-type": "application/json" } });
});
