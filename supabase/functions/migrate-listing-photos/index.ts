// migrate-listing-photos
// Copies photos from listing-drafts bucket -> listing-photos bucket using Storage API
// Updates listing_photos.url + storage_path to new location
// Per memory: NEVER UPDATE storage.objects.bucket_id directly — must use Storage API copy()

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SRC_BUCKET = "listing-drafts";
const DST_BUCKET = "listing-photos";

interface MigrateResult {
  photo_id: string;
  status: "migrated" | "already_migrated" | "source_missing" | "error";
  old_url?: string;
  new_url?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "POST required" }, 405);
  }

  const body = await req.json().catch(() => ({}));
  const listing_id: string | undefined = body.listing_id;
  const migrate_all: boolean = body.migrate_all === true;

  if (!listing_id && !migrate_all) {
    return jsonResponse({ ok: false, error: "listing_id or migrate_all required" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SR);

  // Fetch photos to migrate (still pointing at listing-drafts)
  let q = admin
    .from("listing_photos")
    .select("id, listing_id, url, storage_path")
    .like("url", `%${SRC_BUCKET}%`);
  if (listing_id) q = q.eq("listing_id", listing_id);

  const { data: photos, error: fetchErr } = await q;
  if (fetchErr) return jsonResponse({ ok: false, error: fetchErr.message }, 500);
  if (!photos || photos.length === 0) {
    return jsonResponse({ ok: true, migrated: 0, message: "no photos to migrate" });
  }

  const results: MigrateResult[] = [];

  for (const photo of photos) {
    try {
      // Extract source path from URL: .../public/listing-drafts/<path>
      const srcPath = extractStoragePath(photo.url, SRC_BUCKET);
      if (!srcPath) {
        results.push({ photo_id: photo.id, status: "error", error: "could not extract source path" });
        continue;
      }

      // Destination path: {listing_id}/{original_filename}
      const filename = srcPath.split("/").pop() || `photo-${photo.id}.jpg`;
      const dstPath = `${photo.listing_id}/${filename}`;

      // Download from source
      const { data: fileBlob, error: dlErr } = await admin
        .storage
        .from(SRC_BUCKET)
        .download(srcPath);

      if (dlErr || !fileBlob) {
        results.push({
          photo_id: photo.id,
          status: "source_missing",
          old_url: photo.url,
          error: dlErr?.message || "file not found in source bucket",
        });
        continue;
      }

      // Upload to destination (upsert in case of re-runs)
      const { error: upErr } = await admin
        .storage
        .from(DST_BUCKET)
        .upload(dstPath, fileBlob, {
          upsert: true,
          contentType: fileBlob.type || "image/jpeg",
        });

      if (upErr) {
        results.push({ photo_id: photo.id, status: "error", error: upErr.message });
        continue;
      }

      // Build new public URL
      const { data: pub } = admin.storage.from(DST_BUCKET).getPublicUrl(dstPath);
      const newUrl = pub.publicUrl;

      // Update listing_photos row
      const { error: updErr } = await admin
        .from("listing_photos")
        .update({ url: newUrl, storage_path: dstPath })
        .eq("id", photo.id);

      if (updErr) {
        results.push({ photo_id: photo.id, status: "error", error: updErr.message });
        continue;
      }

      // Delete old file from drafts bucket to free space
      await admin.storage.from(SRC_BUCKET).remove([srcPath]).catch(() => null);

      results.push({
        photo_id: photo.id,
        status: "migrated",
        old_url: photo.url,
        new_url: newUrl,
      });
    } catch (e) {
      results.push({
        photo_id: photo.id,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const migrated = results.filter((r) => r.status === "migrated").length;
  const orphaned = results.filter((r) => r.status === "source_missing").length;
  const errors = results.filter((r) => r.status === "error").length;

  return jsonResponse({
    ok: true,
    total: results.length,
    migrated,
    orphaned,
    errors,
    details: results,
  });
});

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
