// metricool-inbox-responder v2 (13 Jun 2026) — real Metricool inbox API.
// Reads DMs (/v2/inbox/conversations), comments (/v2/inbox/post-comments) & reviews
// (/v2/inbox/reviews) per provider, drafts a reply with Claude, then either auto-sends
// (mode=auto) or holds for owner approval (mode=approval). Reply endpoints are inferred
// REST paths, overridable from settings. Cron-driven (verify_jwt=false).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MC_BASE = 'https://app.metricool.com/api'
const FALLBACK_MODEL = 'claude-sonnet-4-6'
const MAX_PER_RUN = 15

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

const DEFAULT_BRAND_PROMPT = `إنت مسؤول الرد على رسايل وكومنتس السوشيال ميديا لمنصة «مضمونة» (Madmona) — ماركت بليس مصري مضمون اتلانش مايو 2026 (إيجار، بيع وشرا، خدمات، مطاعم، بيوتي).
قواعد صارمة:
- رد بالعامية المصرية، ودود ومختصر جداً (سطر أو سطرين)، وشخصي حسب الرسالة.
- السلوجان «معاملاتك مضمونة». لو حد عايز يعرض نشاطه وجّهه لـ madmonacairo.com/add-listing وسمّيها «ضيف الليستنج».
- للروابط madmonacairo.com فقط. ممنوع: روابط واتساب (wa.me)، ذكر 2019 أو إن المنصة قديمة، أي coworking، «أجر معانا».
- متوعدش بأسعار/مواعيد مش مؤكدة.
- لو ريفيو إيجابي (4-5 نجوم): اشكره بدفء. لو ريفيو سلبي أو شكوى/مشكلة فلوس/قانوني/إساءة: رد مهذّب مختصر من غير وعود واعمل escalate=true.
رجّع الرد النهائي فقط في حقل reply.`

function enforceBrand(t: string): string {
  if (!t) return t
  return t
    .replace(/مدمون[ةه]/g, 'مضمونة').replace(/مظمون[ةه]/g, 'مضمونة')
    .replace(/مذمون[ةه]/g, 'مضمونة').replace(/Madmoonah?/gi, 'Madmona')
    .replace(/أجر معانا/g, 'ضيف الليستنج')
    .replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com)\/?[^\s]*/gi, 'madmonacairo.com')
    .replace(/\b2019\b|٢٠١٩/g, '').trim()
}

const qs = (cfg: any, extra: Record<string, string> = {}) =>
  new URLSearchParams({ userId: String(cfg.user_id), blogId: String(cfg.blog_id), ...extra }).toString()
const mcHeaders = (token: string) => ({ 'Content-Type': 'application/json', 'X-Mc-Auth': token })

let cachedKey: string | null = null
async function getKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const { data, error } = await sb().rpc('get_anthropic_key')
  if (error || !data) throw new Error('no anthropic key')
  cachedKey = data as string
  return cachedKey
}

async function draftReply(model: string, system: string, ctx: { kind: string; provider: string; text: string; stars?: number; author?: string }): Promise<{ reply: string; escalate: boolean }> {
  const apiKey = await getKey()
  const tool = { name: 'submit_reply', description: 'Submit the reply', input_schema: { type: 'object', properties: { reply: { type: 'string' }, escalate: { type: 'boolean' } }, required: ['reply', 'escalate'] } }
  const meta = `النوع: ${ctx.kind} | الشبكة: ${ctx.provider}${ctx.stars ? ` | التقييم: ${ctx.stars}/5` : ''}${ctx.author ? ` | من: ${ctx.author}` : ''}`
  const user = `${meta}\nالنص الوارد:\n"""\n${ctx.text}\n"""\nاكتب الرد المناسب.`
  const attempt = (m: string) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m, max_tokens: 400, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: user }] })
  })
  let r = await attempt(model)
  if (r.status === 400 || r.status === 404) { const eb = await r.text(); if (/model/i.test(eb)) r = await attempt(FALLBACK_MODEL); else throw new Error(`Claude ${r.status}: ${eb.slice(0,160)}`) }
  const data = await r.json()
  if (!r.ok) throw new Error(`Claude ${r.status}`)
  const b = data?.content?.find((x: any) => x.type === 'tool_use')
  if (!b?.input) throw new Error('no tool_use')
  return { reply: enforceBrand(String(b.input.reply || '')), escalate: !!b.input.escalate }
}

async function fetchList(token: string, cfg: any, type: string, provider: string): Promise<any[]> {
  const path = type === 'conversations' ? '/v2/inbox/conversations' : type === 'comments' ? '/v2/inbox/post-comments' : '/v2/inbox/reviews'
  const url = `${MC_BASE}${path}?${qs(cfg, { provider })}`
  const res = await fetch(url, { headers: mcHeaders(token) })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data?.data) ? data.data : []
}

async function sendReply(s: any, token: string, cfg: any, kind: string, id: string, text: string): Promise<{ ok: boolean; status: number; body: string }> {
  const tmpl = kind === 'comment' ? s.comment_reply_path : kind === 'review' ? s.review_reply_path : s.conv_reply_path
  const path = String(tmpl).replaceAll('{{id}}', encodeURIComponent(id))
  const url = `${MC_BASE}${path}?${qs(cfg)}`
  const body = JSON.stringify({ [String(s.reply_text_key || 'text')]: text })
  const res = await fetch(url, { method: 'POST', headers: mcHeaders(token), body })
  const b = await res.text().catch(() => '')
  return { ok: res.ok, status: res.status, body: b.slice(0, 250) }
}

function windowOk(kind: string, iso: string | null): boolean {
  if (!iso) return true
  const ageH = (Date.now() - new Date(iso).getTime()) / 3600000
  if (kind === 'comment') return ageH <= 24
  if (kind === 'dm') return ageH <= 24 * 7
  return ageH <= 24 * 30
}

Deno.serve(async () => {
  const t0 = Date.now()
  const sum: Record<string, number> = { sent_approved: 0, drafted: 0, auto_replied: 0, held: 0, skipped: 0, errors: 0, out_of_window: 0 }
  try {
    const supa = sb()
    const { data: s } = await supa.from('social_inbox_settings').select('*').eq('id', 1).single()
    if (!s) return json({ skipped: 'no_settings' })
    if (!s.enabled) return json({ skipped: 'disabled' })
    const { data: tok } = await supa.rpc('get_metricool_token')
    const token = (tok ?? '') as string
    if (!token) return json({ error: 'no metricool token' }, 500)
    const { data: cfg } = await supa.from('metricool_config').select('user_id, blog_id, timezone').eq('id', 1).single()
    if (!cfg) return json({ error: 'no metricool_config' }, 500)
    const system = (s.brand_system_prompt as string) || DEFAULT_BRAND_PROMPT
    const model = (s.model as string) || FALLBACK_MODEL
    const prov = s.providers || {}

    // ---- PHASE A: send owner-approved drafts ----
    const { data: approved } = await supa.from('social_inbox_log').select('*').eq('status', 'approved').limit(20)
    for (const row of (approved ?? []) as any[]) {
      try {
        const r = await sendReply(s, token, cfg, row.kind, row.message_id || row.conversation_id, row.reply_text)
        await supa.from('social_inbox_log').update(r.ok
          ? { status: 'replied', replied_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : { status: 'error', error: `send ${r.status}: ${r.body}`, updated_at: new Date().toISOString() }).eq('id', row.id)
        sum[r.ok ? 'sent_approved' : 'errors']++
      } catch (e) { await supa.from('social_inbox_log').update({ status: 'error', error: String(e).slice(0,180), updated_at: new Date().toISOString() }).eq('id', row.id); sum.errors++ }
    }

    // ---- PHASE B: poll inbox ----
    type Item = { kind: string; mode: string; provider: string; convId: string; msgId: string; text: string; at: string | null; stars?: number; author?: string }
    const queue: Item[] = []

    // DMs
    for (const p of (prov.conversations ?? [])) {
      if (s.dm_mode === 'off') break
      for (const c of await fetchList(token, cfg, 'conversations', p)) {
        const msgs = Array.isArray(c.messages) ? c.messages : []
        if (!msgs.length) continue
        const last = msgs.reduce((a: any, b: any) => (new Date(b.publicationDateTime || 0) > new Date(a.publicationDateTime || 0) ? b : a))
        if (!last || String(last.from) === String(c.self)) continue // our message is the latest→ nothing to answer
        const other = (c.participants || []).find((x: any) => String(x.id) !== String(c.self))
        queue.push({ kind: 'dm', mode: s.dm_mode, provider: String(c.provider || p).toLowerCase(), convId: String(c.id), msgId: String(last.id || c.id), text: String(last.text || '').trim(), at: last.publicationDateTime || null, author: other?.name })
      }
    }
    // Comments
    for (const p of (prov.comments ?? [])) {
      if (s.comment_mode === 'off') break
      for (const c of await fetchList(token, cfg, 'comments', p)) {
        const txt = String(c.message ?? c.text ?? c.content ?? '').trim()
        if (!txt) continue
        if (c.self && c.from && String(c.from) === String(c.self)) continue
        const author = (c.participants || []).find((x: any) => String(x.id) !== String(c.self))?.name ?? c.authorName
        queue.push({ kind: 'comment', mode: s.comment_mode, provider: String(c.provider || p).toLowerCase(), convId: String(c.id), msgId: String(c.id), text: txt, at: c.publicationDateTime || c.creationDate || null, author })
      }
    }
    // Reviews
    for (const p of (prov.reviews ?? [])) {
      if (s.review_mode === 'off') break
      for (const c of await fetchList(token, cfg, 'reviews', p)) {
        const txt = String(c.message ?? c.text ?? '').trim()
        const author = (c.participants || []).find((x: any) => !String(x.id).startsWith('accounts/'))?.name
        queue.push({ kind: 'review', mode: s.review_mode, provider: String(c.provider || p).toLowerCase(), convId: String(c.id), msgId: String(c.id), text: txt || `(ريفيو ${c.stars || ''} نجوم بدون نص)`, at: c.creationDate || null, stars: c.stars, author })
      }
    }

    let processed = 0
    for (const it of queue) {
      if (processed >= MAX_PER_RUN) break
      // claim (dedupe via unique provider+conversation_id+message_id)
      const { data: claim, error: insErr } = await supa.from('social_inbox_log')
        .insert({ provider: it.provider, conversation_id: it.convId, message_id: it.msgId, kind: it.kind, inbound_text: it.text, inbound_at: it.at, status: 'pending' })
        .select('id').maybeSingle()
      if (insErr || !claim) { sum.skipped++; continue }
      const logId = (claim as any).id
      processed++
      if (!windowOk(it.kind, it.at)) { await supa.from('social_inbox_log').update({ status: 'skipped', error: 'outside reply window', updated_at: new Date().toISOString() }).eq('id', logId); sum.out_of_window++; continue }
      let d: { reply: string; escalate: boolean }
      try { d = await draftReply(model, system, it); sum.drafted++ }
      catch (e) { await supa.from('social_inbox_log').update({ status: 'error', error: String(e).slice(0,180), updated_at: new Date().toISOString() }).eq('id', logId); sum.errors++; continue }
      if (it.mode === 'auto' && !d.escalate) {
        try {
          const r = await sendReply(s, token, cfg, it.kind, it.msgId, d.reply)
          await supa.from('social_inbox_log').update(r.ok
            ? { reply_text: d.reply, status: 'replied', replied_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : { reply_text: d.reply, status: 'error', error: `send ${r.status}: ${r.body}`, updated_at: new Date().toISOString() }).eq('id', logId)
          sum[r.ok ? 'auto_replied' : 'errors']++
        } catch (e) { await supa.from('social_inbox_log').update({ reply_text: d.reply, status: 'error', error: String(e).slice(0,180), updated_at: new Date().toISOString() }).eq('id', logId); sum.errors++ }
      } else {
        await supa.from('social_inbox_log').update({ reply_text: d.reply, status: 'held_for_approval', updated_at: new Date().toISOString() }).eq('id', logId)
        sum.held++
      }
    }
    return json({ ...sum, duration_ms: Date.now() - t0 })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e), ...sum }, 500)
  }
})

function json(b: unknown, status = 200): Response { return new Response(JSON.stringify(b, null, 2), { status, headers: { 'Content-Type': 'application/json' } }) }
