// mark-published
// Called by Make.com scenario after a post is successfully published to FB/IG
// Updates content_calendar: status='published', external_post_id, published_at
// Authentication via shared secret header

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("MAKE_SHARED_SECRET") || "madmona_make_2026_yLDvJk7nRq8Pf3MaB";

Deno.serve(async (req) => {
  // Verify shared secret
  const auth = req.headers.get("x-make-secret") || req.headers.get("authorization")?.replace(/^Bearer /i, "") || "";
  if (auth !== SHARED_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST required" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.post_id) {
    return new Response(JSON.stringify({ ok: false, error: "post_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SR);

  const update: Record<string, unknown> = {
    status: "published",
    published_at: new Date().toISOString(),
  };
  if (body.external_post_id) update.external_post_id = String(body.external_post_id);
  if (body.external_url) update.external_url = String(body.external_url);

  const { error } = await admin
    .from("content_calendar")
    .update(update)
    .eq("id", body.post_id);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error.message || error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, post_id: body.post_id, updated: update }), {
    headers: { "Content-Type": "application/json" },
  });
});
