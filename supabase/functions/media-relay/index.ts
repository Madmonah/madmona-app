// media-relay (2026-06-11) — authenticated raw-bytes upload into the public marketing-media bucket.
// Auth: x-relay-key header must equal the stored probe secret. Used to push rendered reel videos
// from the build environment into Supabase Storage so Metricool/Cloudinary can fetch them by URL.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RELAY_KEY = 'mdmn-probe-8f3a2c91e7d44b06'

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'PUT') return new Response('POST/PUT only', { status: 405 })
  if (req.headers.get('x-relay-key') !== RELAY_KEY) return new Response('forbidden', { status: 403 })
  const url = new URL(req.url)
  const name = (url.searchParams.get('name') || `file_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_')
  const contentType = req.headers.get('content-type') || 'application/octet-stream'
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length === 0) return new Response(JSON.stringify({ ok: false, error: 'empty body' }), { status: 400 })
  if (bytes.length > 60 * 1024 * 1024) return new Response(JSON.stringify({ ok: false, error: 'too large (>60MB)' }), { status: 413 })
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)
  const path = `${new Date().toISOString().slice(0, 10)}/${name}`
  const { error } = await sb.storage.from('marketing-media').upload(path, bytes, { contentType, upsert: true })
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
  const { data: pub } = sb.storage.from('marketing-media').getPublicUrl(path)
  return new Response(JSON.stringify({ ok: true, path, public_url: pub.publicUrl, bytes: bytes.length }), { headers: { 'Content-Type': 'application/json' } })
})
