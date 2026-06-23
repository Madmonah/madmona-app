import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUFFER_TOKEN = Deno.env.get('BUFFER_ACCESS_TOKEN')!
const BUFFER_ORG_ID = Deno.env.get('BUFFER_ORGANIZATION_ID')!
const BUFFER_IG = Deno.env.get('BUFFER_INSTAGRAM_CHANNEL_ID')
const BUFFER_FB_PAGE = Deno.env.get('BUFFER_FACEBOOK_PAGE_CHANNEL_ID')
const BUFFER_FB_GROUP = Deno.env.get('BUFFER_FACEBOOK_GROUP_CHANNEL_ID')

const COLORS = { green: '#1F5F3F', ivory: '#FAF7F0', gold: '#B8860B' }

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).length > maxChars) {
      if (current) lines.push(current)
      current = word
    } else {
      current = current ? current + ' ' + word : word
    }
  }
  if (current) lines.push(current)
  return lines
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildPostSVG(title: string, body: string): string {
  const W = 1080, H = 1350
  const bodyLines = wrapText(body, 35).slice(0, 12)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="${COLORS.green}"/><stop offset="100%" stop-color="#164430"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${W - 100}" cy="100" r="200" fill="${COLORS.gold}" opacity="0.08"/>
  <circle cx="100" cy="${H - 100}" r="150" fill="${COLORS.gold}" opacity="0.05"/>
  <rect x="0" y="0" width="${W}" height="80" fill="${COLORS.ivory}" opacity="0.05"/>
  <text x="${W/2}" y="55" font-family="Tahoma, Arial" font-size="24" font-weight="bold" fill="${COLORS.gold}" text-anchor="middle" letter-spacing="3">MADMONA</text>
  <foreignObject x="80" y="180" width="${W - 160}" height="200"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Tahoma, Arial; font-size: 56px; font-weight: bold; color: ${COLORS.ivory}; text-align: center; direction: rtl; line-height: 1.4;">${escapeXml(title)}</div></foreignObject>
  <line x1="${W/2 - 60}" y1="430" x2="${W/2 + 60}" y2="430" stroke="${COLORS.gold}" stroke-width="3"/>
  <foreignObject x="80" y="470" width="${W - 160}" height="${H - 700}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Tahoma, Arial; font-size: 32px; color: ${COLORS.ivory}; text-align: right; direction: rtl; line-height: 1.7;">${bodyLines.map(l => escapeXml(l)).join('<br/>')}</div></foreignObject>
  <rect x="0" y="${H - 120}" width="${W}" height="120" fill="${COLORS.gold}" opacity="0.15"/>
  <text x="${W/2}" y="${H - 70}" font-family="Tahoma, Arial" font-size="42" font-weight="bold" fill="${COLORS.gold}" text-anchor="middle" direction="rtl">احنا بتوع الإيجار</text>
  <text x="${W/2}" y="${H - 30}" font-family="Tahoma, Arial" font-size="22" fill="${COLORS.ivory}" text-anchor="middle" opacity="0.7">madmonacairo.com</text>
</svg>`
}

type ChannelType = 'instagram' | 'facebook_page' | 'facebook_group'

async function postToBufferChannel(
  channelId: string,
  channelType: ChannelType,
  text: string,
  imageUrl: string
): Promise<{ ok: boolean, postId?: string, error?: string }> {

  // FB Group requires notification scheduling, others use automatic
  const schedulingType = channelType === 'facebook_group' ? 'notification' : 'automatic'

  // Build channel-specific metadata
  const metadata: Record<string, unknown> = {}
  if (channelType === 'instagram') {
    metadata.instagram = { type: 'post', shouldShareToFeed: true }
  } else if (channelType === 'facebook_page' || channelType === 'facebook_group') {
    metadata.facebook = { type: 'post' }
  }

  const res = await fetch('https://api.buffer.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          __typename
          ... on PostActionSuccess {
            post { id }
          }
          ... on NotFoundError { message }
          ... on UnauthorizedError { message }
          ... on UnexpectedError { message }
          ... on RestProxyError { message link code }
          ... on LimitReachedError { message }
          ... on InvalidInputError { message }
        }
      }`,
      variables: {
        input: {
          channelId,
          text,
          schedulingType,
          mode: 'addToQueue',
          assets: { images: [{ url: imageUrl }] },
          metadata
        }
      }
    })
  })

  const json = await res.json()
  if (json.errors?.length) {
    return { ok: false, error: json.errors.map((e: { message: string }) => e.message).join('; ') }
  }

  const result = json.data?.createPost
  if (result?.__typename !== 'PostActionSuccess') {
    return { ok: false, error: result?.message || result?.__typename || 'Unknown error' }
  }

  return { ok: true, postId: result.post?.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const startTime = Date.now()
  const log = (msg: string) => console.log(`[${Date.now() - startTime}ms] ${msg}`)

  try {
    log('Starting buffer-publisher')

    if (!BUFFER_TOKEN || !BUFFER_ORG_ID) {
      return new Response(JSON.stringify({ ok: false, error: 'Buffer not configured' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const channels: { id: string, name: ChannelType }[] = []
    if (BUFFER_IG) channels.push({ id: BUFFER_IG, name: 'instagram' })
    if (BUFFER_FB_PAGE) channels.push({ id: BUFFER_FB_PAGE, name: 'facebook_page' })
    if (BUFFER_FB_GROUP) channels.push({ id: BUFFER_FB_GROUP, name: 'facebook_group' })

    if (channels.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'No channel IDs' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    log('Querying drafts')
    const { data: drafts, error: draftErr } = await supabase
      .from('content_calendar')
      .select('id, title, body, hashtags, cta')
      .eq('status', 'drafted')
      .eq('content_type', 'instagram_post')
      .order('created_at', { ascending: true })
      .limit(1)

    if (draftErr) {
      return new Response(JSON.stringify({ ok: false, error: draftErr.message, stage: 'query_drafts' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const draft = drafts?.[0]
    if (!draft) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no drafts' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    log(`Draft: ${draft.id}`)

    log('Generating SVG')
    const svg = buildPostSVG(draft.title, (draft.body || '').slice(0, 400))
    const svgBuffer = new TextEncoder().encode(svg)
    const fileName = `posts/${draft.id}.svg`

    log('Uploading to storage')
    const { error: uploadErr } = await supabase.storage
      .from('content-images')
      .upload(fileName, svgBuffer, { contentType: 'image/svg+xml', upsert: true })

    if (uploadErr) {
      await supabase.from('content_calendar').update({ status: 'image_failed' }).eq('id', draft.id)
      return new Response(JSON.stringify({ ok: false, error: uploadErr.message, stage: 'storage_upload' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(fileName)
    const svgUrl = urlData.publicUrl
    const pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=1080&h=1350`
    log('Image URL ready')

    const hashtags = (draft.hashtags || []).join(' ')
    const fullCaption = [draft.body, draft.cta || '', hashtags].filter(Boolean).join('\n\n').slice(0, 2200)

    log(`Posting to Buffer (${channels.length} channels)`)

    const results: Array<{ channel: string, ok: boolean, postId?: string, error?: string }> = []
    for (const ch of channels) {
      log(`Posting to ${ch.name}`)
      const r = await postToBufferChannel(ch.id, ch.name, fullCaption, pngUrl)
      results.push({ channel: ch.name, ...r })
      log(`${ch.name}: ${r.ok ? 'OK ' + r.postId : 'FAIL ' + r.error}`)
    }

    const successCount = results.filter(r => r.ok).length
    const firstSuccessId = results.find(r => r.ok)?.postId

    if (successCount === 0) {
      await supabase.from('content_calendar').update({ status: 'publish_failed' }).eq('id', draft.id)
      return new Response(JSON.stringify({ ok: false, error: 'All channels failed', results, stage: 'buffer_post' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    await supabase.from('content_calendar').update({
      status: 'scheduled',
      external_post_id: firstSuccessId
    }).eq('id', draft.id)

    await supabase.from('agent_runs').insert({
      agent_name: 'buffer-publisher',
      trigger_type: 'edge_function',
      status: 'success',
      started_at: new Date(startTime).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      output_summary: {
        scheduled: true,
        content_id: draft.id,
        title: draft.title,
        channels_posted: successCount,
        channels_total: channels.length,
        results,
        image_url: pngUrl
      }
    })

    log(`SUCCESS - ${successCount}/${channels.length} channels`)

    return new Response(JSON.stringify({
      ok: true,
      scheduled: true,
      content_id: draft.id,
      title: draft.title,
      channels_posted: successCount,
      channels_total: channels.length,
      results,
      duration_ms: Date.now() - startTime
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    log(`FATAL: ${msg}`)
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
