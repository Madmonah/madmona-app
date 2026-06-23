// secure-upload v1 (2026-06-04)
// Service-role-backed wrapper for uploading to the `ads` storage bucket (and other restricted buckets in future).
// Replaces the now-removed `ads_public_insert` open RLS policy.
//
// Auth model: caller MUST provide ONE of:
//   - Authenticated user JWT (verify_jwt=true on this fn) — user must have role in (admin, supplier, employee).
//   - X-Admin-Secret header matching ADMIN_UPLOAD_SECRET env var — for internal server-to-server calls.
//
// Input (POST JSON):
//   { bucket: 'ads', path: 'folder/file.png', content_type: 'image/png', data_base64: '...' }
//
// Output: { ok, public_url, path } or { ok:false, error }
//
// Anonymous publishable-key calls FAIL (verify_jwt=true ensures Supabase rejects no-JWT calls before hitting this code).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Admin-Secret'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_SECRET = Deno.env.get('ADMIN_UPLOAD_SECRET') || ''

// Buckets this wrapper is allowed to write to. Add new ones explicitly.
const ALLOWED_BUCKETS = new Set(['ads'])
// Allowed MIME types (image/video only — reject everything else)
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm|quicktime))$/
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB hard cap

const sb = () => createClient(SUPABASE_URL, SERVICE_ROLE)

interface UploadBody {
  bucket?: string
  path?: string
  content_type?: string
  data_base64?: string
  upsert?: boolean
}

function sanitizePath(p: string): string | null {
  if (!p || typeof p !== 'string') return null
  // No leading slash, no directory traversal, only safe chars
  if (p.startsWith('/') || p.includes('..')) return null
  if (!/^[A-Za-z0-9_\-./]+$/.test(p)) return null
  if (p.length > 256) return null
  return p
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // --- Auth gate ---
  // Path A: admin secret (server-to-server)
  const adminHeader = req.headers.get('x-admin-secret') || req.headers.get('X-Admin-Secret')
  let isAdminSecret = false
  if (ADMIN_SECRET && adminHeader && adminHeader === ADMIN_SECRET) {
    isAdminSecret = true
  }

  // Path B: authenticated user JWT (Supabase already verified it; we extract sub + role)
  let callerUserId: string | null = null
  let callerRole: string | null = null
  const authHeader = req.headers.get('authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!isAdminSecret) {
    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: 'missing auth' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } })
    }
    try {
      const { data: u, error: uErr } = await sb().auth.getUser(jwt)
      if (uErr || !u?.user?.id) {
        return new Response(JSON.stringify({ ok: false, error: 'invalid auth' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } })
      }
      callerUserId = u.user.id
      // Look up role in profiles (admin, supplier, employee — anyone else rejected)
      const { data: p } = await sb().from('profiles').select('role').eq('id', callerUserId).maybeSingle()
      callerRole = (p?.role as string) || null
      const allowedRoles = new Set(['admin', 'owner', 'supplier', 'employee'])
      if (!callerRole || !allowedRoles.has(callerRole)) {
        return new Response(JSON.stringify({ ok: false, error: 'forbidden role: ' + (callerRole || 'unknown') }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } })
      }
    } catch (_e) {
      return new Response(JSON.stringify({ ok: false, error: 'auth check failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } })
    }
  }

  // --- Body validation ---
  let body: UploadBody = {}
  try { body = await req.json() } catch (_e) { /* default */ }
  const bucket = (body.bucket || '').trim()
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return new Response(JSON.stringify({ ok: false, error: 'bucket not allowed' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
  const path = sanitizePath(body.path || '')
  if (!path) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid path' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
  const mime = (body.content_type || '').toLowerCase()
  if (!ALLOWED_MIME.test(mime)) {
    return new Response(JSON.stringify({ ok: false, error: 'mime not allowed: ' + mime }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
  if (!body.data_base64 || typeof body.data_base64 !== 'string') {
    return new Response(JSON.stringify({ ok: false, error: 'data_base64 required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
  // Decode base64
  let bytes: Uint8Array
  try {
    const cleaned = body.data_base64.replace(/^data:[^;]+;base64,/, '')
    bytes = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0))
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: 'base64 decode failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
  if (bytes.byteLength > MAX_BYTES) {
    return new Response(JSON.stringify({ ok: false, error: 'file too large (max 20 MB)' }),
      { status: 413, headers: { 'Content-Type': 'application/json', ...CORS } })
  }

  // --- Upload via service role ---
  try {
    const { error: upErr } = await sb().storage.from(bucket).upload(path, bytes, {
      contentType: mime,
      upsert: body.upsert === true,
      cacheControl: '3600'
    })
    if (upErr) {
      return new Response(JSON.stringify({ ok: false, error: upErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
    }
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`

    // Audit trail
    try {
      await sb().from('storage_upload_audit').insert({
        bucket, path, mime, size_bytes: bytes.byteLength,
        caller_user_id: callerUserId,
        caller_role: callerRole,
        is_admin_secret: isAdminSecret,
        public_url: publicUrl
      })
    } catch (_e) { /* audit table may not exist — ignore */ }

    return new Response(JSON.stringify({
      ok: true, bucket, path, public_url: publicUrl, size_bytes: bytes.byteLength
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
