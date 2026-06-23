// instant-claim-builder v2 (13 Jun 2026)
// Drains instant_listing_drafts (where the WhatsApp webhook dumps inbound listings)
// into the REAL claim flow: builds a listing under the Madmona placeholder supplier
// + a listing_claims token, then WhatsApps the sender their /claim/<token> link.
// v2: LISTING_STATUS = 'published' — inbound listings go live in the marketplace
// automatically (no manual review step). De-fragments by merging same-phone +
// same-category drafts within an 18h window into ONE listing. Idempotent: a row is
// 'done' once its published_listing_id is set, so re-runs never duplicate/double-send.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://madmonacairo.com'
const MADMONA_SUPPLIER_ID = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
const LISTING_STATUS = 'published' // inbound listings auto-published to the marketplace (no manual review)
const FALLBACK_SLUG = 'shop-misc'
const DEDUP_WINDOW_HOURS = 18
const BATCH = 30

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

async function getMetaCreds(): Promise<{ phone_id: string; token: string }> {
  const { data } = await sb().from('whatsapp_config').select('key, value').in('key', ['phone_number_id', 'access_token'])
  const m = Object.fromEntries(((data || []) as Array<{ key: string; value: string }>).map(r => [r.key, r.value]))
  return { phone_id: m.phone_number_id, token: m.access_token }
}

async function sendWA(to: string, body: string): Promise<{ wa_id?: string; error?: string }> {
  try {
    const { phone_id, token } = await getMetaCreds()
    if (!phone_id || !token) return { error: 'no creds' }
    const r = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body, preview_url: true } })
    })
    const d = await r.json()
    if (!r.ok) return { error: d?.error?.message || `HTTP ${r.status}` }
    return { wa_id: d?.messages?.[0]?.id }
  } catch (e) { return { error: String(e).slice(0, 150) } }
}

async function resolveCategory(slug: string | null): Promise<string | null> {
  if (slug) {
    const { data } = await sb().from('categories').select('id').eq('slug', slug).limit(1).maybeSingle()
    if ((data as { id?: string } | null)?.id) return (data as { id: string }).id
  }
  const { data: fb } = await sb().from('categories').select('id').eq('slug', FALLBACK_SLUG).limit(1).maybeSingle()
  return (fb as { id?: string } | null)?.id || null
}

function genToken(): string { return crypto.randomUUID().replace(/-/g, '') }

Deno.serve(async (_req) => {
  const out = { processed: 0, created: 0, merged: 0, sent: 0, send_failed: 0, skipped: 0, errors: [] as string[] }
  try {
    const { data: rows } = await sb().from('instant_listing_drafts')
      .select('id, contact_phone, contact_name, conversation_id, title, description, category_slug, image_urls')
      .is('published_listing_id', null)
      .order('created_at', { ascending: true })
      .limit(BATCH)
    const drafts = (rows || []) as Array<Record<string, any>>

    for (const d of drafts) {
      try {
        if (!d.title || !d.contact_phone) { out.skipped++; continue }
        const categoryId = await resolveCategory(d.category_slug)
        if (!categoryId) { out.skipped++; out.errors.push(`${d.id}: no category`); continue }

        const title = String(d.title).slice(0, 120)
        const description = d.description ? String(d.description).slice(0, 1500) : null
        const imageUrls: string[] = Array.isArray(d.image_urls) ? d.image_urls.filter(Boolean) : []
        const fullPhone = String(d.contact_phone)
        const windowStart = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3600 * 1000).toISOString()

        // De-fragment: reuse a recent unclaimed listing for the same phone + category
        const { data: existing } = await sb().from('listings')
          .select('id')
          .eq('supplier_id', MADMONA_SUPPLIER_ID)
          .eq('contact_phone', fullPhone)
          .eq('category_id', categoryId)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle()

        let listingId: string
        if ((existing as { id?: string } | null)?.id) {
          listingId = (existing as { id: string }).id
          const { data: have } = await sb().from('listing_photos').select('url').eq('listing_id', listingId)
          const haveSet = new Set(((have || []) as Array<{ url: string }>).map(p => p.url))
          const start = (have || []).length
          const newRows = imageUrls.filter(u => !haveSet.has(u)).map((u, i) => ({ listing_id: listingId, url: u, display_order: start + i, is_primary: false }))
          if (newRows.length) await sb().from('listing_photos').insert(newRows)
          if (description && description.length > 40) await sb().from('listings').update({ description }).eq('id', listingId)
          out.merged++
        } else {
          const { data: nl, error: lErr } = await sb().from('listings').insert({
            supplier_id: MADMONA_SUPPLIER_ID, category_id: categoryId,
            title, description, contact_phone: fullPhone, status: LISTING_STATUS, country: 'EG'
          }).select('id').single()
          if (lErr || !nl) throw new Error('listing insert: ' + (lErr?.message || 'no row'))
          listingId = (nl as { id: string }).id
          if (imageUrls.length) {
            await sb().from('listing_photos').insert(
              imageUrls.map((u, i) => ({ listing_id: listingId, url: u, display_order: i, is_primary: i === 0 }))
            )
          }
          const token = genToken()
          await sb().from('listing_claims').insert({ listing_id: listingId, token, status: 'pending' })
          out.created++
          const claimUrl = `${SITE_URL}/claim/${token}`
          const msg =
            `🎉 جهّزنالك صفحة إعلانك على مضمونة كاملة بالصور — من غير ما تكتب ولا حرف!\n` +
            `افتحها واستلمها بضغطة واحدة:\n${claimUrl}\n\n` +
            `بعد الاستلام بنكمّل معاك أي تفاصيل ناقصة. معاملاتك مضمونة 🟢`
          const res = await sendWA(fullPhone.replace(/^\+/, ''), msg)
          if (res.error) out.send_failed++; else out.sent++
          if (d.conversation_id) {
            await sb().from('whatsapp_messages').insert({
              conversation_id: d.conversation_id, direction: 'outbound', wa_message_id: res.wa_id,
              body: msg, message_type: 'text', status: res.error ? 'failed' : 'sent',
              status_updated_at: new Date().toISOString(), ai_generated: true, agent_name: 'instant-claim-builder',
              error_message: res.error, metadata: { listing_id: listingId, claim_token: token }
            })
          }
        }

        await sb().from('instant_listing_drafts').update({ published_listing_id: listingId }).eq('id', d.id)
        out.processed++
      } catch (e) {
        out.errors.push(`${d.id}: ${String(e).slice(0, 140)}`)
      }
    }
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
