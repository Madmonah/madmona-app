// media-ingest — token-protected raw upload into Supabase Storage. POST ?bucket=reels&path=x.mp4&token=SECRET with raw body.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SECRET = 'mdmn-ingest-7c4f91ae2b8d4e05'
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const u = new URL(req.url)
  if (u.searchParams.get('token') !== SECRET) return new Response('forbidden', { status: 403 })
  const bucket = u.searchParams.get('bucket') || 'reels'
  const path = u.searchParams.get('path') || `upload-${Date.now()}.bin`
  const ct = req.headers.get('content-type') || 'application/octet-stream'
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (!bytes.length) return new Response(JSON.stringify({ ok: false, error: 'empty body' }), { status: 400 })
  const { error } = await sb.storage.from(bucket).upload(path, bytes, { contentType: ct, upsert: true })
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  const { data } = sb.storage.from(bucket).getPublicUrl(path)
  return new Response(JSON.stringify({ ok: true, url: data.publicUrl, bytes: bytes.length }), { headers: { 'Content-Type': 'application/json' } })
})
