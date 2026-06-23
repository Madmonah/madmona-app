// reel-composer v1 (13 Jun 2026) — mounts Mohamed's music (Epidemic Sound tracks sent via WhatsApp)
// onto reel videos BEFORE Metricool publish, using Cloudinary video transformations (cloud duxfgqioc).
// Needs whatsapp_config keys: cloudinary_api_key + cloudinary_api_secret (from Cloudinary dashboard).
// Actions:
//   {action:'list'} → music library tracks
//   {action:'compose', video_url, track:'<name or uuid>', reel_id?} → uploads video+track to Cloudinary (signed),
//       returns composed mp4 URL with the music as audio layer; updates reel_scripts.video_url if reel_id given
//   {action:'compose_latest', track:'<name>'} → same but on the most recent rendered reel
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLOUD = 'duxfgqioc'
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function cfg(key: string): Promise<string> {
  const { data } = await sb.from('whatsapp_config').select('value').eq('key', key).maybeSingle()
  return (data as { value?: string } | null)?.value || ''
}

async function sha1hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// signed upload of a remote file URL into Cloudinary (resource_type video covers both video & audio)
async function cldUpload(fileUrl: string, publicId: string, apiKey: string, apiSecret: string): Promise<{ ok: boolean; public_id?: string; err?: string }> {
  const ts = Math.floor(Date.now() / 1000)
  const toSign = `overwrite=true&public_id=${publicId}&timestamp=${ts}${apiSecret}`
  const signature = await sha1hex(toSign)
  const form = new FormData()
  form.append('file', fileUrl)
  form.append('public_id', publicId)
  form.append('overwrite', 'true')
  form.append('timestamp', String(ts))
  form.append('api_key', apiKey)
  form.append('signature', signature)
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, { method: 'POST', body: form })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) return { ok: false, err: d?.error?.message || `HTTP ${r.status}` }
  return { ok: true, public_id: d.public_id }
}

async function findTrack(track: string): Promise<Record<string, any> | null> {
  if (/^[0-9a-f-]{36}$/i.test(track)) {
    const { data } = await sb.from('music_library').select('*').eq('id', track).maybeSingle()
    return data as any
  }
  const { data } = await sb.from('music_library').select('*').ilike('name', `%${track}%`)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data as any
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'list')

    if (action === 'list') {
      const { data } = await sb.from('music_library').select('id, name, public_url, times_used, created_at')
        .order('created_at', { ascending: false }).limit(30)
      return json({ ok: true, tracks: data || [] })
    }

    if (action === 'compose' || action === 'compose_latest') {
      const apiKey = await cfg('cloudinary_api_key')
      const apiSecret = await cfg('cloudinary_api_secret')
      if (!apiKey || !apiSecret) {
        return json({ ok: false, error: 'missing_cloudinary_creds', hint: 'حط cloudinary_api_key و cloudinary_api_secret في whatsapp_config الأول (من Cloudinary Dashboard → Settings → Access Keys)' })
      }

      const trackName = String(body.track || '')
      if (!trackName) return json({ ok: false, error: 'track required' })
      const track = await findTrack(trackName)
      if (!track) return json({ ok: false, error: `مفيش تراك اسمه «${trackName}» في المكتبة — ابعته على الواتساب الأول` })

      let videoUrl = String(body.video_url || '')
      let reelId = body.reel_id ? String(body.reel_id) : null
      if (action === 'compose_latest') {
        const { data: reel } = await sb.from('reel_scripts').select('id, video_url, title')
          .eq('status', 'rendered').not('video_url', 'is', null)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!reel) return json({ ok: false, error: 'مفيش ريل rendered جاهز' })
        videoUrl = (reel as any).video_url
        reelId = (reel as any).id
      }
      if (!videoUrl) return json({ ok: false, error: 'video_url required' })

      // 1) ensure track in Cloudinary
      let musicPid = track.cloudinary_public_id as string | null
      if (!musicPid) {
        musicPid = `madmona/music/${track.id}`
        const up = await cldUpload(track.public_url, musicPid, apiKey, apiSecret)
        if (!up.ok) return json({ ok: false, error: 'music upload: ' + up.err })
        await sb.from('music_library').update({ cloudinary_public_id: musicPid }).eq('id', track.id)
      }
      // 2) upload video
      const vidPid = `madmona/reels/${reelId || crypto.randomUUID().slice(0, 8)}-${Date.now()}`
      const vUp = await cldUpload(videoUrl, vidPid, apiKey, apiSecret)
      if (!vUp.ok) return json({ ok: false, error: 'video upload: ' + vUp.err })
      // 3) composed URL: music as audio layer over the video (Cloudinary transcodes on the fly)
      const layerId = musicPid.replace(/\//g, ':')
      const composedUrl = `https://res.cloudinary.com/${CLOUD}/video/upload/l_audio:${layerId},fl_layer_apply/${vidPid}.mp4`
      // warm the derived asset so Metricool fetch doesn't timeout
      await fetch(composedUrl, { method: 'HEAD' }).catch(() => {})

      if (reelId) {
        await sb.from('reel_scripts').update({
          video_url: composedUrl,
          metadata_note: `music: ${track.name}`
        }).eq('id', reelId).then(() => {}, async () => {
          // metadata_note column may not exist — retry without it
          await sb.from('reel_scripts').update({ video_url: composedUrl }).eq('id', reelId)
        })
      }
      await sb.from('music_library').update({ times_used: Number(track.times_used || 0) + 1 }).eq('id', track.id)
      return json({ ok: true, composed_url: composedUrl, track: track.name, reel_id: reelId })
    }

    return json({ ok: false, error: 'unknown action' })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
