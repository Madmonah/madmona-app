import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  try {
    const { source_url, bucket, path } = await req.json()
    if (!source_url || !bucket || !path) {
      return new Response(JSON.stringify({ ok: false, error: 'need source_url, bucket, path' }), { status: 400 })
    }

    // Download the MP4 from Canva presigned URL
    const dl = await fetch(source_url)
    if (!dl.ok) {
      return new Response(JSON.stringify({ ok: false, stage: 'download', status: dl.status, error: await dl.text().then(t => t.slice(0,500)) }), { status: 502 })
    }
    const bytes = await dl.arrayBuffer()
    const sizeMB = (bytes.byteLength / 1024 / 1024).toFixed(2)

    // Upload to Supabase storage
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await sb.storage.from(bucket).upload(path, bytes, {
      contentType: 'video/mp4',
      upsert: true
    })
    if (error) {
      return new Response(JSON.stringify({ ok: false, stage: 'upload', error: error.message }), { status: 500 })
    }

    // Build public URL
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path)
    return new Response(JSON.stringify({
      ok: true,
      bucket, path,
      size_mb: sizeMB,
      public_url: pub.publicUrl,
      upload_data: data
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown' }), { status: 500 })
  }
})
