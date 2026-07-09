// ============================================================
// marid-restaurant-agent v5 — المارد: وكيل الاستقطاب الكامل (2026-07-09)
// v2: sends HARD-GATED on approved restaurant template.
// v3: outreach_log.target_type CHECK fix (cold_lead + context in notes).
// v4: • per-lead name param (اسم المطعم بدل «حضرتك»)
//     • A/B template split (config: restaurant_partnership_template_b)
//     • multi-sector leads (restaurant_leads.sector) — كل قطاع بتمبلته
//     • DRAFT CHASE: مطاردة مسودات /add-listing الواقفة عبر تمبلت draft_resume
//     • ?report=1 daily digest → owner WhatsApp + marid_notifications
//     • Google Places harvest stub (gated on config google_places_api_key)
// v5: 🏠 حملة العقارات (يوليو 2026)
//     • HARVEST-RE: سحب ليدز الملاك من cold_leads (olx-scraper —
//       apartments/villas/chalets/offices) → restaurant_leads sector='real_estate'
//     • FRESH routing: sector real_estate → تمبلت مخصص
//       (config: realestate_intro_template) وفولباك للتمبلت العام لو مش معتمد
//
// Steps per run: HARVEST → HARVEST-RE → FRESH (per sector) → FOLLOWUP → REVIVE → DRAFT CHASE.
// ?dry=1 = report only, no sends/writes.
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const BASE = SUPABASE_URL

const AGENT = 'marid-restaurant-agent'
const CAP_FRESH = 30
const CAP_FOLLOWUP = 25
const CAP_REVIVE = 15
const CAP_DRAFT_CHASE = 20
const REVIVE_AFTER_DAYS = 14
const RETOUCH_COOLDOWN_DAYS = 10

function normPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('0020')) d = d.slice(2)
  if (d.startsWith('20') && d.length === 12) return d
  if (d.startsWith('01') && d.length === 11) return '2' + d
  if (d.startsWith('1') && d.length === 10) return '20' + d
  return null
}

// Clean a lead/business name into a short WhatsApp-friendly param.
function cleanName(raw: string | null | undefined): string {
  const s = String(raw || '')
    .replace(/["«»|•_*~]+/g, ' ')
    .split(/[-–—(\[]/)[0]
    .replace(/\s+/g, ' ')
    .trim()
  if (!s || s.length < 2) return 'حضرتك'
  return s.slice(0, 30)
}

Deno.serve(async (req) => {
  const cronAuth = req.headers.get('authorization')
  const agentSecret = req.headers.get('x-agent-secret')
  const isAuthorized = agentSecret === AGENT_SECRET || (cronAuth && cronAuth.includes(AGENT_SECRET)) || (cronAuth && cronAuth.includes(SUPABASE_SERVICE_ROLE_KEY))
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const reportMode = url.searchParams.get('report') === '1'

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const log: Array<Record<string, unknown>> = []
  const t0 = Date.now()

  // ---------- template gates (per sector + A/B) ----------
  async function cfg(key: string): Promise<string> {
    const { data } = await sb.from('whatsapp_config').select('value').eq('key', key).maybeSingle()
    return (data as { value?: string } | null)?.value || ''
  }
  async function templateApproved(name: string): Promise<boolean> {
    if (!name) return false
    const statusKey = `template_${name}_status`
    let { data: st } = await sb.from('whatsapp_config').select('value').eq('key', statusKey).maybeSingle()
    if ((st as { value?: string } | null)?.value !== 'APPROVED') {
      await fetch(`${BASE}/functions/v1/refresh-template-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name: name }),
      }).catch(() => {})
      const r2 = await sb.from('whatsapp_config').select('value').eq('key', statusKey).maybeSingle()
      st = r2.data
    }
    return (st as { value?: string } | null)?.value === 'APPROVED'
  }

  const tplRestaurants = await cfg('restaurant_partnership_template')
  const tplRestaurantsB = await cfg('restaurant_partnership_template_b')
  const tplSupplier = await cfg('supplier_intro_template')
  const tplDraftResume = await cfg('draft_resume_template')
  const tplRealEstate = await cfg('realestate_intro_template')
  const okRestaurants = await templateApproved(tplRestaurants)
  const okRestaurantsB = tplRestaurantsB ? await templateApproved(tplRestaurantsB) : false
  const okSupplier = await templateApproved(tplSupplier)
  const okDraftResume = await templateApproved(tplDraftResume)
  const okRealEstate = tplRealEstate ? await templateApproved(tplRealEstate) : false
  log.push({ step: 'templates', restaurants: { name: tplRestaurants, ok: okRestaurants }, b: { name: tplRestaurantsB || null, ok: okRestaurantsB }, supplier: { name: tplSupplier, ok: okSupplier }, draft_resume: { name: tplDraftResume, ok: okDraftResume }, real_estate: { name: tplRealEstate || null, ok: okRealEstate }, dry, reportMode })

  const adminPhone = normPhone(await cfg('admin_alert_phone'))

  async function notify(kind: string, title: string, body: string, phone?: string | null, refTable?: string, refId?: string) {
    if (dry) return
    try {
      await sb.from('marid_notifications').insert({ kind, title, body: body.slice(0, 2000), phone: phone || null, ref_table: refTable || null, ref_id: refId || null })
    } catch (_e) { /* non-fatal */ }
  }

  // ============================================================
  // REPORT MODE — daily digest to owner (20:00 Cairo cron)
  // ============================================================
  if (reportMode) {
    try {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString()
      const { count: sentToday } = await sb.from('outreach_log').select('id', { count: 'exact', head: true }).in('agent_name', [AGENT, 'marid-campaign-manager']).gte('created_at', since)
      const { count: repliesToday } = await sb.from('whatsapp_conversations').select('id', { count: 'exact', head: true }).eq('agent_name', AGENT).gte('last_inbound_at', since)
      const { count: poolNew } = await sb.from('restaurant_leads').select('id', { count: 'exact', head: true }).eq('status', 'new')
      const { count: poolReplied } = await sb.from('restaurant_leads').select('id', { count: 'exact', head: true }).eq('status', 'replied')
      const { count: draftsChased } = await sb.from('outreach_log').select('id', { count: 'exact', head: true }).eq('agent_name', AGENT).gte('created_at', since).ilike('notes', '%draft_chase%')
      const { count: hotToday } = await sb.from('marid_notifications').select('id', { count: 'exact', head: true }).eq('kind', 'hot_lead').gte('created_at', since)
      const { count: instantDrafts } = await sb.from('instant_listing_drafts').select('id', { count: 'exact', head: true }).gte('created_at', since)

      const gateLine = okRestaurants ? '✅ تمبلت المطاعم معتمد والإرسال شغال' : '⏳ تمبلت المطاعم لسه قيد المراجعة عند ميتا — الإرسال الجديد واقف مؤقتاً'
      const report = [
        '🧞 تقرير المارد اليومي',
        `📤 رسايل اتبعتت (24س): ${sentToday ?? 0}`,
        `💬 ردود وصلت: ${repliesToday ?? 0}`,
        `🔥 ليدز سخنة النهارده: ${hotToday ?? 0}`,
        `📋 مسودات جاهزة من الشات: ${instantDrafts ?? 0}`,
        `🪄 مطاردات مسودات التسجيل: ${draftsChased ?? 0}`,
        `📦 ليدز مستنية: ${poolNew ?? 0} · ردوا: ${poolReplied ?? 0}`,
        gateLine,
        'التفاصيل: madmonacairo.com/admin/marid',
      ].join('\n')

      if (!dry && adminPhone) {
        await sb.from('whatsapp_outbound_queue').insert({
          recipient_phone: '+' + adminPhone,
          recipient_name: 'Madmona Admin',
          message: report,
          agent_name: AGENT,
          campaign: 'marid_daily_report',
          status: 'pending',
          metadata: { kind: 'daily_report' }
        })
      }
      await notify('daily_report', 'تقرير المارد اليومي', report)
      return new Response(JSON.stringify({ ok: true, mode: 'report', sent_today: sentToday, replies_today: repliesToday, pool_new: poolNew, took_ms: Date.now() - t0 }), { headers: { 'Content-Type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, mode: 'report', error: e instanceof Error ? e.message : 'unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // ---------- suppression sets ----------
  const suppressed = new Set<string>()
  try {
    const { data: dnc } = await sb.from('cold_leads').select('phone').in('status', ['do_not_contact', 'dead', 'converted']).not('phone', 'is', null)
    for (const r of dnc || []) { const p = normPhone(r.phone); if (p) suppressed.add(p) }
    const { data: sups } = await sb.from('suppliers').select('contact_phone').not('contact_phone', 'is', null)
    for (const r of sups || []) { const p = normPhone(r.contact_phone); if (p) suppressed.add(p) }
    const { data: recent } = await sb.from('outreach_log').select('phone')
      .eq('agent_name', AGENT)
      .gte('created_at', new Date(Date.now() - RETOUCH_COOLDOWN_DAYS * 86400_000).toISOString())
    for (const r of recent || []) { const p = normPhone(r.phone); if (p) suppressed.add(p) }
  } catch (e) {
    log.push({ step: 'suppression', error: e instanceof Error ? e.message : 'unknown' })
  }
  log.push({ step: 'suppression', size: suppressed.size })

  // ---------- A) HARVEST from deleted-directory backup ----------
  let harvested = 0
  try {
    const { data: existing } = await sb.from('restaurant_leads').select('phone')
    const known = new Set<string>()
    for (const r of existing || []) { const p = normPhone(r.phone); if (p) known.add(p) }

    const { data: backupRows } = await sb
      .from('_backup_noprice_listings_20260705')
      .select('title, contact_phone, district, city, category_id')
      .not('contact_phone', 'is', null)
      .limit(2000)

    const { data: cats } = await sb.from('categories').select('id').eq('track', 'restaurants')
    const restCats = new Set((cats || []).map((c: { id: string }) => c.id))

    const fresh: Array<Record<string, unknown>> = []
    for (const b of backupRows || []) {
      if (!restCats.has(b.category_id)) continue
      const p = normPhone(b.contact_phone)
      if (!p || known.has(p) || suppressed.has(p)) continue
      known.add(p)
      fresh.push({
        name: (b.title || '').slice(0, 120),
        phone: p,
        area: b.district || b.city || null,
        source: 'directory_backup_20260705',
        sector: 'restaurants',
        status: 'new',
        has_whatsapp: true,
      })
      if (fresh.length >= 300) break
    }
    if (fresh.length > 0 && !dry) {
      const { error } = await sb.from('restaurant_leads').insert(fresh)
      if (error) throw error
    }
    harvested = fresh.length
    log.push({ step: 'harvest', inserted: harvested })
  } catch (e) {
    log.push({ step: 'harvest', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- A2) Google Places harvest (stub — gated on API key) ----------
  try {
    const gKey = await cfg('google_places_api_key')
    if (gKey) {
      const q = encodeURIComponent('مطاعم في القاهرة')
      const r = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&language=ar&key=${gKey}`)
      const d = await r.json()
      const results = (d?.results || []) as Array<Record<string, unknown>>
      let added = 0
      for (const pl of results.slice(0, 20)) {
        const placeId = String(pl.place_id || '')
        if (!placeId) continue
        const { data: dup } = await sb.from('restaurant_leads').select('id').eq('place_id', placeId).maybeSingle()
        if (dup) continue
        const dr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,name,vicinity,rating&language=ar&key=${gKey}`)
        const dd = await dr.json()
        const ph = normPhone(dd?.result?.formatted_phone_number)
        if (!ph || suppressed.has(ph)) continue
        if (!dry) {
          await sb.from('restaurant_leads').insert({
            name: String(dd?.result?.name || pl.name || '').slice(0, 120),
            phone: ph, area: String(dd?.result?.vicinity || '').slice(0, 120) || null,
            rating: dd?.result?.rating ?? null, place_id: placeId,
            source: 'google_places', sector: 'restaurants', status: 'new', has_whatsapp: true,
          })
        }
        added++
      }
      log.push({ step: 'google_places', added })
    } else {
      log.push({ step: 'google_places', skipped: 'no_api_key' })
    }
  } catch (e) {
    log.push({ step: 'google_places', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- A3) HARVEST-RE 🏠 real-estate owners from cold_leads (olx-scraper) ----------
  // olx-scraper بيحط ملاك العقارات في cold_leads بفئات apartments/villas/chalets/offices.
  // بنرحّلهم لـ restaurant_leads بقطاع real_estate عشان محرك الإرسال الموحد يتولاهم.
  let harvestedRE = 0
  try {
    const RE_CATS = ['apartments', 'villas', 'chalets', 'offices', 'commercial', 'apartments_sale', 'villas_sale', 'chalets_sale']
    const { data: existingRE } = await sb.from('restaurant_leads').select('phone')
    const knownRE = new Set<string>()
    for (const r of existingRE || []) { const p = normPhone(r.phone); if (p) knownRE.add(p) }

    const { data: reRows } = await sb.from('cold_leads')
      .select('id, business_name, phone, category, location')
      .in('category', RE_CATS)
      .eq('status', 'new')
      .not('phone', 'is', null)
      .limit(1000)

    const freshRE: Array<Record<string, unknown>> = []
    for (const b of reRows || []) {
      const p = normPhone(b.phone)
      if (!p || knownRE.has(p) || suppressed.has(p)) continue
      knownRE.add(p)
      freshRE.push({
        name: (b.business_name || '').slice(0, 120),
        phone: p,
        area: (b as { location?: string }).location || null,
        source: 'cold_leads_olx',
        sector: 'real_estate',
        status: 'new',
        has_whatsapp: true,
      })
      if (freshRE.length >= 200) break
    }
    if (freshRE.length > 0 && !dry) {
      const { error } = await sb.from('restaurant_leads').insert(freshRE)
      if (error) throw error
    }
    harvestedRE = freshRE.length
    log.push({ step: 'harvest_real_estate', pool: (reRows || []).length, inserted: harvestedRE })
  } catch (e) {
    log.push({ step: 'harvest_real_estate', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- send helper (per-recipient params, HARD-GATED upstream) ----------
  type SendRec = { phone: string; param1: string; template_name: string }
  async function sendBulk(recs: SendRec[], tag: string): Promise<Set<string>> {
    const sentPhones = new Set<string>()
    if (recs.length === 0) return sentPhones
    if (dry) { log.push({ step: tag, dry_would_send: recs.length }); return sentPhones }
    try {
      const r = await fetch(`${BASE}/functions/v1/whatsapp-bulk-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'x-agent-secret': AGENT_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients: recs, agent_name: AGENT }),
      })
      const data = await r.json()
      for (const p of (data?.sent_phones || [])) sentPhones.add(String(p))
      log.push({ step: tag, total: recs.length, sent: sentPhones.size, first_errors: data?.first_errors })
      if (recs.length > 0 && sentPhones.size === 0) {
        await notify('send_failure', `فشل إرسال ${tag}`, JSON.stringify(data?.first_errors || []).slice(0, 500))
      }
      return sentPhones
    } catch (e) {
      log.push({ step: tag, error: e instanceof Error ? e.message : 'unknown' })
      return sentPhones
    }
  }

  async function logOutreach(rows: Array<{ phone: string; target_type: string; target_id?: string | null; note?: string; template?: string }>) {
    if (dry || rows.length === 0) return
    try {
      // outreach_log.target_type CHECK only allows stuck_supplier/dormant_customer/cold_lead
      // — use cold_lead/stuck_supplier and keep the real context in notes.
      const allowed = new Set(['stuck_supplier', 'dormant_customer', 'cold_lead'])
      const { error } = await sb.from('outreach_log').insert(rows.map((r) => ({
        phone: r.phone,
        target_type: allowed.has(r.target_type) ? r.target_type : 'cold_lead',
        target_id: r.target_id ?? null,
        agent_name: AGENT,
        channel: 'whatsapp',
        status: 'sent',
        message_text: `template:${r.template || 'unknown'}`,
        notes: [r.target_type, r.note].filter(Boolean).join(' | '),
        sent_at: new Date().toISOString(),
      })))
      if (error) log.push({ step: 'outreach_log', error: error.message })
    } catch (_e) { /* non-fatal */ }
  }

  // ---------- B) FRESH OUTREACH (sector-aware + A/B + named) ----------
  let freshSent = 0
  try {
    const { data: leads } = await sb.from('restaurant_leads')
      .select('id, phone, name, sector')
      .eq('status', 'new')
      .not('phone', 'is', null)
      .limit(CAP_FRESH * 4)

    const batch: Array<{ id: string; phone: string; param1: string; template_name: string; sector: string }> = []
    for (const l of leads || []) {
      const p = normPhone(l.phone)
      if (!p || suppressed.has(p)) continue
      const sector = (l as { sector?: string }).sector || 'restaurants'
      let template = ''
      if (sector === 'restaurants') {
        if (!okRestaurants && !okRestaurantsB) continue
        // A/B split by last phone digit parity (stable per lead)
        const useB = okRestaurantsB && (okRestaurants ? (parseInt(p.slice(-1), 10) % 2 === 1) : true)
        template = useB ? tplRestaurantsB : tplRestaurants
      } else if (sector === 'real_estate') {
        // 🏠 تمبلت العقارات المخصص أولاً، وفولباك للتمبلت العام لحد ما يتعمد
        if (okRealEstate) template = tplRealEstate
        else if (okSupplier) template = tplSupplier
        else continue
      } else {
        if (!okSupplier) continue
        template = tplSupplier
      }
      batch.push({ id: l.id, phone: p, param1: cleanName(l.name), template_name: template, sector })
      if (batch.length >= CAP_FRESH) break
    }

    if ((leads || []).length > 0 && batch.length === 0) {
      log.push({ step: 'fresh_outreach', skipped: 'no_approved_template_for_pending_sectors', candidates: (leads || []).length })
    }

    const sent = await sendBulk(batch.map(({ phone, param1, template_name }) => ({ phone, param1, template_name })), 'fresh_outreach')
    freshSent = sent.size
    if (!dry && sent.size > 0) {
      const okBatch = batch.filter(b => sent.has(b.phone))
      await sb.from('restaurant_leads').update({ status: 'contacted' }).in('id', okBatch.map(b => b.id))
      await logOutreach(okBatch.map((b) => ({ phone: b.phone, target_type: 'restaurant_lead', target_id: b.id, note: `sector:${b.sector}`, template: b.template_name })))
    }
    if (dry) log.push({ step: 'fresh_outreach_candidates', count: batch.length })
  } catch (e) {
    log.push({ step: 'fresh_outreach', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- C) FOLLOWUP 24-72h non-repliers ----------
  let followupSent = 0
  try {
    if (okRestaurants) {
      const { data: stale } = await sb.from('whatsapp_conversations')
        .select('contact_phone, last_outbound_at, last_inbound_at')
        .gte('last_outbound_at', new Date(Date.now() - 72 * 3600_000).toISOString())
        .lte('last_outbound_at', new Date(Date.now() - 24 * 3600_000).toISOString())
        .is('last_inbound_at', null)
        .eq('agent_name', AGENT)
        .limit(CAP_FOLLOWUP)

      const recs: SendRec[] = []
      for (const s of stale || []) {
        const p = normPhone(s.contact_phone)
        if (p) recs.push({ phone: p, param1: 'حضرتك', template_name: tplRestaurants })
      }
      const sent = await sendBulk(recs, 'stale_followup')
      followupSent = sent.size
      await logOutreach([...sent].map((p) => ({ phone: p, target_type: 'followup', note: '24-72h no-reply', template: tplRestaurants })))
    } else {
      log.push({ step: 'stale_followup', skipped: 'restaurant_template_not_approved' })
    }
  } catch (e) {
    log.push({ step: 'stale_followup', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- D) REVIVE old contacted cold leads ----------
  let reviveSent = 0
  try {
    if (okRestaurants) {
      const { data: olds } = await sb.from('cold_leads')
        .select('id, phone, business_name, category')
        .eq('status', 'contacted')
        .lt('last_contacted', new Date(Date.now() - REVIVE_AFTER_DAYS * 86400_000).toISOString()) // fix 6 Jul: كان created_at (عمود مش موجود — الإحياء كان مكسور)
        .not('phone', 'is', null)
        .limit(CAP_REVIVE * 4)

      // fix 6 Jul (2): توجيه القالب حسب التصنيف — قالب المطاعم للمطاعم فقط،
      // والباقي (عقارات/عربيات/خدمات...) ياخد قالب المورد العام. قبل كده كله كان بياخد «مطعمك» بالغلط.
      const FOOD_CATS = new Set(['restaurants', 'food-general', 'food-cafe', 'food-desserts', 'food-catering'])
      const batch: Array<{ id: string; phone: string; param1: string; template: string }> = []
      for (const l of olds || []) {
        const p = normPhone(l.phone)
        if (!p || suppressed.has(p)) continue
        const isFood = FOOD_CATS.has(((l as { category?: string }).category || '').toLowerCase())
        const template = isFood ? tplRestaurants : tplSupplier
        if (isFood && !okRestaurants) continue
        if (!isFood && !okSupplier) continue
        batch.push({ id: l.id, phone: p, param1: cleanName((l as { business_name?: string }).business_name), template })
        if (batch.length >= CAP_REVIVE) break
      }
      const sent = await sendBulk(batch.map(b => ({ phone: b.phone, param1: b.param1, template_name: b.template })), 'revive_old_leads')
      reviveSent = sent.size
      await logOutreach(batch.filter(b => sent.has(b.phone)).map((b) => ({ phone: b.phone, target_type: 'cold_lead', target_id: b.id, note: 'revive>14d', template: tplRestaurants })))
      if (dry) log.push({ step: 'revive_candidates', count: batch.length })
    } else {
      log.push({ step: 'revive_old_leads', skipped: 'restaurant_template_not_approved' })
    }
  } catch (e) {
    log.push({ step: 'revive_old_leads', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- E) DRAFT CHASE — مسودات /add-listing الواقفة ----------
  let draftChased = 0
  try {
    if (okDraftResume) {
      const minAge = new Date(Date.now() - 24 * 3600_000).toISOString()          // ≥ 24h old
      const maxAge = new Date(Date.now() - 14 * 86400_000).toISOString()         // ≤ 14 days old
      const { data: stuck } = await sb.from('listing_drafts')
        .select('id, contact_name, contact_phone, business_name, title, current_step, created_at, metadata')
        .eq('status', 'draft')
        .lt('current_step', 5)
        .not('contact_phone', 'is', null)
        .lt('created_at', minAge)
        .gt('created_at', maxAge)
        .order('created_at', { ascending: false })
        .limit(CAP_DRAFT_CHASE * 4)

      const seen = new Set<string>()
      const picked: Array<{ draft: Record<string, unknown>; phone: string }> = []
      for (const d of stuck || []) {
        const meta = (d.metadata as Record<string, unknown> | null) || {}
        if (meta.marid_chased === true) continue
        const p = normPhone(String(d.contact_phone))
        if (!p || seen.has(p) || suppressed.has(p)) continue
        seen.add(p)
        picked.push({ draft: d as Record<string, unknown>, phone: p })
        if (picked.length >= CAP_DRAFT_CHASE) break
      }

      if (picked.length > 0 && !dry) {
        for (const { draft, phone } of picked) {
          const name = cleanName(String(draft.contact_name || ''))
          const biz = cleanName(String(draft.business_name || draft.title || 'إعلانك'))
          await sb.from('whatsapp_outbound_queue').insert({
            recipient_phone: '+' + phone,
            recipient_name: name,
            message: `[template:${tplDraftResume}]`,
            agent_name: AGENT,
            campaign: 'marid_draft_chase',
            status: 'pending',
            template_name: tplDraftResume,
            template_params: [{ type: 'body', parameters: [{ type: 'text', text: name }, { type: 'text', text: biz }] }],
            metadata: { source: 'marid_v4', draft_id: draft.id, stuck_at_step: draft.current_step }
          })
          const newMeta = { ...((draft.metadata as Record<string, unknown> | null) || {}), marid_chased: true, marid_chased_at: new Date().toISOString() }
          await sb.from('listing_drafts').update({ metadata: newMeta }).eq('id', draft.id)
          draftChased++
        }
        await logOutreach(picked.map(({ draft, phone }) => ({ phone, target_type: 'stuck_supplier', target_id: String(draft.id), note: 'draft_chase', template: tplDraftResume })))
      }
      log.push({ step: 'draft_chase', candidates: (stuck || []).length, queued: dry ? 0 : draftChased, dry_would_send: dry ? picked.length : undefined })
    } else {
      log.push({ step: 'draft_chase', skipped: 'draft_resume_template_not_approved' })
    }
  } catch (e) {
    log.push({ step: 'draft_chase', error: e instanceof Error ? e.message : 'unknown' })
  }

  // ---------- registry counters ----------
  if (!dry) {
    try {
      const { data: reg } = await sb.from('agent_registry').select('run_count, success_count').eq('agent_name', AGENT).maybeSingle()
      await sb.from('agent_registry').update({
        last_run_at: new Date().toISOString(),
        run_count: (reg?.run_count || 0) + 1,
        success_count: (reg?.success_count || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('agent_name', AGENT)
    } catch (_e) { /* non-fatal */ }
  }

  return new Response(JSON.stringify({
    ok: true,
    agent: AGENT,
    version: 'v5',
    dry,
    harvested,
    harvested_real_estate: harvestedRE,
    fresh_sent: freshSent,
    followup_sent: followupSent,
    revive_sent: reviveSent,
    draft_chased: draftChased,
    took_ms: Date.now() - t0,
    log,
  }), { headers: { 'Content-Type': 'application/json' } })
})
