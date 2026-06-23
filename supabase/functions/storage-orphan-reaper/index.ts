// Madmona Storage Orphan Reaper v2
// May 13 2026 — ZERO-TOLERANCE photo-loss guarantee
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") || "madmona_reaper_2026";
const BUCKET = "listing-drafts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = req.headers.get("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode || "stats";
  const minAgeMinutes = Number(body.min_age_minutes) || (mode === "purge_anon" ? 60 : 1440);
  const dryRun = Boolean(body.dry_run);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const result: any = { mode, min_age_minutes: minAgeMinutes, dry_run: dryRun };

  try {
    // Get all storage objects via public view
    const { data: allObjects, error: listErr } = await admin
      .from("v_storage_objects")
      .select("name, created_at, size_bytes")
      .eq("bucket_id", BUCKET);

    if (listErr) throw listErr;

    const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000);
    const anonObjects = (allObjects || []).filter((o: any) => o.name.startsWith("anon/"));
    const tokenObjects = (allObjects || []).filter((o: any) => !o.name.startsWith("anon/"));

    const tokenPrefixes = Array.from(new Set(tokenObjects.map((o: any) => o.name.split("/")[0])));
    const { data: drafts } = tokenPrefixes.length
      ? await admin
          .from("listing_drafts")
          .select("id, claim_token, status, converted_listing_id, contact_phone")
          .in("claim_token", tokenPrefixes)
      : { data: [] };

    const tokenToDraft = new Map<string, any>();
    (drafts || []).forEach((d: any) => tokenToDraft.set(d.claim_token, d));

    result.total_objects = (allObjects || []).length;
    result.anon_count = anonObjects.length;
    result.token_count = tokenObjects.length;
    result.matched_tokens = drafts?.length || 0;

    if (mode === "stats") {
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ATTACH MATCHED
    if (mode === "attach_matched" || mode === "full_sweep") {
      let attached = 0;
      let skipped_no_listing = 0;
      const groupedByToken = new Map<string, any[]>();
      tokenObjects.forEach((o: any) => {
        const token = o.name.split("/")[0];
        if (!groupedByToken.has(token)) groupedByToken.set(token, []);
        groupedByToken.get(token)!.push(o);
      });

      for (const [token, objects] of groupedByToken.entries()) {
        const draft = tokenToDraft.get(token);
        if (!draft || !draft.converted_listing_id) {
          skipped_no_listing += objects.length;
          continue;
        }

        const { data: existingPhotos } = await admin
          .from("listing_photos")
          .select("url")
          .eq("listing_id", draft.converted_listing_id);
        const existingUrls = new Set((existingPhotos || []).map((p: any) => p.url));
        const maxOrder = (existingPhotos || []).length;

        objects.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const toAttach: any[] = [];
        let order = maxOrder;
        for (const o of objects) {
          const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${o.name}`;
          if (existingUrls.has(url)) continue;
          toAttach.push({
            listing_id: draft.converted_listing_id,
            url,
            display_order: order,
            is_primary: order === 0,
          });
          order++;
        }

        if (toAttach.length && !dryRun) {
          const { error: insErr } = await admin.from("listing_photos").insert(toAttach);
          if (insErr) {
            console.error("attach insert failed:", insErr);
            continue;
          }
        }
        attached += toAttach.length;
      }
      result.attached = attached;
      result.skipped_no_listing = skipped_no_listing;
    }

    // PURGE ANON
    if (mode === "purge_anon" || mode === "full_sweep") {
      const stale = anonObjects.filter((o: any) => new Date(o.created_at) < cutoff);
      result.anon_eligible = stale.length;
      if (stale.length && !dryRun) {
        const paths = stale.map((o: any) => o.name);
        // Delete in batches of 100 (Supabase storage limit)
        let totalRemoved = 0;
        for (let i = 0; i < paths.length; i += 100) {
          const batch = paths.slice(i, i + 100);
          const { data: removed, error: rmErr } = await admin.storage.from(BUCKET).remove(batch);
          if (rmErr) {
            result.purge_anon_error = rmErr.message;
            break;
          }
          totalRemoved += removed?.length || 0;
        }
        result.anon_deleted = totalRemoved;
      }
    }

    // PURGE UNMATCHED
    if (mode === "purge_unmatched" || mode === "full_sweep") {
      const stale = tokenObjects.filter((o: any) => {
        const token = o.name.split("/")[0];
        return !tokenToDraft.has(token) && new Date(o.created_at) < cutoff;
      });
      result.unmatched_eligible = stale.length;
      if (stale.length && !dryRun) {
        const paths = stale.map((o: any) => o.name);
        let totalRemoved = 0;
        for (let i = 0; i < paths.length; i += 100) {
          const batch = paths.slice(i, i + 100);
          const { data: removed, error: rmErr } = await admin.storage.from(BUCKET).remove(batch);
          if (rmErr) {
            result.purge_unmatched_error = rmErr.message;
            break;
          }
          totalRemoved += removed?.length || 0;
        }
        result.unmatched_deleted = totalRemoved;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
