// app/api/admin/marid/route.ts
// Admin API for the Marid control room:
//  GET  → stats + notifications + template gates
//  POST → { action: 'upload_leads', leads:[{name,phone,sector?,area?}], sector? }
//         { action: 'mark_seen' }
//         { action: 'run_now' } / { action: 'send_report' }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const AGENT_SECRET = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const FN_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

function normPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('0020')) d = d.slice(2)
  if (d.startsWith('20') && d.length === 12) return d
  if (d.startsWith('01') && d.length === 11) return '2' + d
  if (d.startsWith('1') && d.length === 10) return '20' + d
  return null
}

export async function GET() {
  try {
    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString()

    const [pool, sentToday, notifs, cfgRows, chased] = await Promise.all([
      admin.from('restaurant_leads').select('status, sector'),
      admin.from('outreach_log').select('id', { count: 'exact', head: true })
        .eq('agent_name', 'marid-restaurant-agent').gte('created_at', since24),
      admin.from('marid_notifications').select('*').order('created_at', { ascending: false }).limit(50),
      admin.from('whatsapp_config').select('key, value').in('key', [
        'restaurant_partnership_template', 'supplier_intro_template', 'draft_resume_template',
        'template_madmona_restaurant_intro_v2_status',
        'template_madmona_supplier_intro_v1_status',
        'template_madmona_draft_resume_v1_status',
      ]),
      admin.from('outreach_log').select('id', { count: 'exact', head: true })
        .eq('agent_name', 'marid-restaurant-agent').ilike('notes', '%draft_chase%'),
    ])

    const byStatus: Record<string, number> = {}
    const bySector: Record<string, number> = {}
    for (const r of (pool.data || []) as { status: string; sector: string }[]) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
      bySector[r.sector || 'restaurants'] = (bySector[r.sector || 'restaurants'] || 0) + 1
    }

    const cfg = Object.fromEntries(((cfgRows.data || []) as { key: string; value: string }[]).map(r => [r.key, r.value]))

    return NextResponse.json({
      pool: byStatus,
      sectors: bySector,
      sent_24h: sentToday.count ?? 0,
      drafts_chased_total: chased.count ?? 0,
      notifications: notifs.data || [],
      templates: {
        restaurants: { name: cfg.restaurant_partnership_template, status: cfg.template_madmona_restaurant_intro_v2_status || '—' },
        supplier: { name: cfg.supplier_intro_template, status: cfg.template_madmona_supplier_intro_v1_status || '—' },
        draft_resume: { name: cfg.draft_resume_template, status: cfg.template_madmona_draft_resume_v1_status || '—' },
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      action?: string
      sector?: string
      leads?: Array<{ name?: string; phone?: string; sector?: string; area?: string }>
    } | null
    if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 })

    if (body.action === 'mark_seen') {
      await admin.from('marid_notifications').update({ seen: true }).eq('seen', false)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'run_now' || body.action === 'send_report') {
      const suffix = body.action === 'send_report' ? '?report=1' : ''
      const r = await fetch(`${FN_BASE}/marid-restaurant-agent${suffix}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'x-agent-secret': AGENT_SECRET,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
      const data = await r.json().catch(() => ({}))
      return NextResponse.json({ ok: r.ok, result: data })
    }

    if (body.action === 'upload_leads') {
      const leads = Array.isArray(body.leads) ? body.leads : []
      if (leads.length === 0) return NextResponse.json({ error: 'مفيش صفوف' }, { status: 400 })
      if (leads.length > 500) return NextResponse.json({ error: 'الحد الأقصى 500 صف' }, { status: 400 })
      const defaultSector = String(body.sector || 'restaurants')

      // existing phones (dedupe)
      const { data: existing } = await admin.from('restaurant_leads').select('phone')
      const known = new Set<string>()
      for (const r of (existing || []) as { phone: string }[]) {
        const p = normPhone(r.phone); if (p) known.add(p)
      }
      // registered suppliers are never leads
      const { data: sups } = await admin.from('suppliers').select('contact_phone').not('contact_phone', 'is', null)
      for (const r of (sups || []) as { contact_phone: string }[]) {
        const p = normPhone(r.contact_phone); if (p) known.add(p)
      }

      const rows: Record<string, unknown>[] = []
      let skippedDup = 0, skippedBad = 0
      for (const l of leads) {
        const p = normPhone(l.phone)
        if (!p) { skippedBad++; continue }
        if (known.has(p)) { skippedDup++; continue }
        known.add(p)
        rows.push({
          name: String(l.name || '').trim().slice(0, 120) || 'مورد',
          phone: p,
          area: String(l.area || '').trim().slice(0, 120) || null,
          sector: String(l.sector || defaultSector).trim() || defaultSector,
          source: 'owner_excel',
          status: 'new',
          has_whatsapp: true,
        })
      }
      let created = 0
      if (rows.length > 0) {
        const { data: ins, error } = await admin.from('restaurant_leads').insert(rows).select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        created = (ins || []).length
      }
      return NextResponse.json({ ok: true, created, skipped_duplicate: skippedDup, skipped_invalid: skippedBad })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'server error' }, { status: 500 })
  }
}
