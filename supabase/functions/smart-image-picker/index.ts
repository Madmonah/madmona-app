// smart-image-picker (v4 — MASCOT-ONLY, owner rule 15 Jun 2026 "بلّغ كل الـ agents").
// Every post image MUST be the official المارد genie mascot. Listing photos / Unsplash / SVG fallbacks
// are FORBIDDEN (also hard-blocked at the DB gate trg_content_publish_gate). This picker now simply
// assigns the genie mascot image to any active post that lacks an approved mascot image.
// Posts with no image (text-only / video reels) are left untouched.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Official المارد mascot (Cloudinary madmona/mascots/genie.png)
const GENIE_URL = "https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png";
const MASCOT_SOURCES = ["mared", "mared_mascot", "mascot", "genie", "brand_mascot"];

function isApprovedMascot(url: string | null, src: string | null): boolean {
  const u = (url ?? "").toLowerCase();
  const s = (src ?? "").toLowerCase();
  return u.includes("madmona/mascots/") || MASCOT_SOURCES.includes(s);
}

interface PostRow { id: string; image_url: string | null; image_source: string | null; status: string | null; }

async function setGenie(id: string) {
  await sb.from("content_calendar")
    .update({ image_url: GENIE_URL, image_source: "mared_mascot" })
    .eq("id", id);
}

Deno.serve(async (req) => {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const limit = Math.min(Number(body.limit ?? 100), 300);
  const singleId = body.id as string | undefined;

  let posts: PostRow[];
  if (singleId) {
    const { data } = await sb.from("content_calendar")
      .select("id, image_url, image_source, status").eq("id", singleId).limit(1);
    posts = (data ?? []) as PostRow[];
  } else {
    const { data, error } = await sb.from("content_calendar")
      .select("id, image_url, image_source, status")
      .in("status", ["drafted", "scheduled", "approved", "pending_review"])
      .is("published_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
    posts = (data ?? []) as PostRow[];
  }

  let fixed = 0, already = 0, no_image = 0;
  for (const p of posts) {
    if (!p.image_url || p.image_url.trim() === "") { no_image++; continue; } // text/video reel — leave as-is
    if (isApprovedMascot(p.image_url, p.image_source)) { already++; continue; }
    await setGenie(p.id);
    fixed++;
  }

  return new Response(JSON.stringify({
    processed: posts.length,
    fixed_to_genie: fixed,
    already_mascot: already,
    no_image_left_untouched: no_image,
    genie_url: GENIE_URL,
  }, null, 2), { headers: { "content-type": "application/json" } });
});
