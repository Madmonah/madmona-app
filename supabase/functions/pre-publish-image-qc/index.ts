// Pre-publish Image QC + cascade auto-fix (v2: removed non-existent updated_at)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIN_VALID_BYTES = 35_000;
const BATCH_SIZE = 25;
const MAX_RETRIES = 3;

async function fetchHead(url: string): Promise<{ ok: boolean; bytes: number; type: string; reason?: string }> {
  try {
    const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-99999" } });
    const buf = await r.arrayBuffer();
    const cl = r.headers.get("content-length");
    const totalBytes = cl ? parseInt(cl) : buf.byteLength;
    return { ok: r.ok, bytes: totalBytes, type: r.headers.get("content-type") || "", reason: r.ok ? undefined : `http_${r.status}` };
  } catch (e) {
    return { ok: false, bytes: 0, type: "", reason: `fetch_error:${String(e).slice(0, 60)}` };
  }
}

function qcImage(check: { ok: boolean; bytes: number; type: string }): { pass: boolean; reason: string } {
  if (!check.ok) return { pass: false, reason: "http_not_ok" };
  if (!check.type.startsWith("image/")) return { pass: false, reason: `bad_content_type:${check.type}` };
  if (check.bytes < MIN_VALID_BYTES) return { pass: false, reason: `image_too_small:${check.bytes}b<${MIN_VALID_BYTES}b (likely blank)` };
  return { pass: true, reason: "ok" };
}

type Post = { id: string; image_url: string | null; image_source: string | null; category: string | null; metadata: Record<string, unknown> | null };

async function pickListingPhotoForCategory(admin: ReturnType<typeof createClient>, category: string | null): Promise<string | null> {
  if (!category) return null;
  const { data } = await admin.from("listings").select("photos").eq("status", "approved").eq("category", category).not("photos", "is", null).limit(20);
  const lst = (data || []) as Array<{ photos: string[] | null }>;
  for (const l of lst) {
    if (l.photos && l.photos.length > 0) {
      const url = l.photos[Math.floor(Math.random() * l.photos.length)];
      if (url) return url;
    }
  }
  return null;
}

function unsplashFallback(category: string | null): string {
  const q: Record<string, string> = {
    weddings: "egyptian-wedding,bride,celebration", chalets: "chalet,beach-house,resort",
    cars: "luxury-car,sedan,driving", workspace: "coworking,office,modern-interior",
    cameras: "camera-gear,photography,lens", equipment: "tools,equipment,industrial",
    apartments: "apartment,living-room,interior", makeup_artists: "bridal-makeup,cosmetics",
    hair_stylists: "hair-salon,styling",
  };
  return `https://source.unsplash.com/1080x1350/?${q[category || ""] || "egypt,cairo,luxury"}`;
}

Deno.serve(async (req) => {
  const admin = createClient(SUPABASE_URL, SR);
  const t0 = Date.now();
  const body = req.method === "POST" ? (await req.json().catch(() => ({}))) : {};
  const dryRun: boolean = !!body.dry_run;

  const { data: posts, error } = await admin
    .from("content_calendar")
    .select("id, image_url, image_source, category, metadata")
    .in("status", ["drafted", "scheduled", "approved"])
    .eq("visual_status", "generated")
    .not("image_url", "is", null)
    .limit(BATCH_SIZE);
  if (error) return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
  const list = (posts || []) as Post[];
  const results: Array<Record<string, unknown>> = [];
  let passed = 0, fixed = 0, failed = 0;

  for (const post of list) {
    if (!post.image_url) continue;
    const meta = (post.metadata as any) || {};
    const retries = meta.qc_retries || 0;
    const head = await fetchHead(post.image_url);
    const qc = qcImage(head);

    if (qc.pass) {
      passed++;
      if (!dryRun) {
        const { error: uErr } = await admin.from("content_calendar").update({
          visual_status: "qc_passed",
          metadata: { ...meta, qc: { pass: true, bytes: head.bytes, type: head.type, at: new Date().toISOString() } },
        }).eq("id", post.id);
        if (uErr) console.error("update fail:", uErr);
      }
      results.push({ id: post.id, action: "pass", source: post.image_source, bytes: head.bytes });
      continue;
    }

    if (retries >= MAX_RETRIES) {
      failed++;
      if (!dryRun) {
        await admin.from("content_calendar").update({
          visual_status: "qc_failed_max_retries",
          status: "needs_manual_review",
          metadata: { ...meta, qc: { pass: false, reason: qc.reason, retries, at: new Date().toISOString() } },
        }).eq("id", post.id);
      }
      results.push({ id: post.id, action: "give_up_after_retries", reason: qc.reason, retries });
      continue;
    }

    let newUrl: string | null = null;
    let newSource = "";
    if (post.image_source === "branded_svg_fallback" || retries === 0) {
      newUrl = await pickListingPhotoForCategory(admin, post.category);
      if (newUrl) newSource = "listing_photo_qc_fix";
    }
    if (!newUrl) { newUrl = unsplashFallback(post.category); newSource = "unsplash_qc_fix"; }

    fixed++;
    if (!dryRun) {
      const { error: uErr } = await admin.from("content_calendar").update({
        image_url: newUrl,
        image_source: newSource,
        visual_status: "qc_refreshed",
        metadata: { ...meta, qc: { pass: false, reason: qc.reason, retries: retries + 1, old_source: post.image_source, old_url: post.image_url, at: new Date().toISOString() }, qc_retries: retries + 1 },
      }).eq("id", post.id);
      if (uErr) console.error("update fail:", uErr);
    }
    results.push({ id: post.id, action: "cascade_fix", old_source: post.image_source, new_source: newSource, reason: qc.reason });
  }

  return new Response(JSON.stringify({
    ok: true, duration_ms: Date.now() - t0, dry_run: dryRun,
    inspected: list.length, passed, fixed, failed,
    sample: results.slice(0, 10),
  }, null, 2), { headers: { "Content-Type": "application/json" } });
});
