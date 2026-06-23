// reel-upload — secret-gated base64→Storage uploader for reels produced by Claude.
// Part of the marid reel pipeline: Claude renders video → uploads here → public URL → metricool-publish.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = "ab02994082f84c2d81471ca041426038";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const body = await req.json().catch(() => ({}));
  if (body.secret !== SECRET) return new Response("forbidden", { status: 403 });
  const bucket = String(body.bucket || "marketing-media");
  const path = String(body.path || "");
  const b64 = String(body.b64 || "");
  const contentType = String(body.content_type || "video/mp4");
  if (!path || !b64) return new Response(JSON.stringify({ error: "path and b64 required" }), { status: 400 });
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await sb.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return new Response(JSON.stringify({ ok: true, public_url: data.publicUrl, bytes: bytes.length }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 500 });
  }
});
