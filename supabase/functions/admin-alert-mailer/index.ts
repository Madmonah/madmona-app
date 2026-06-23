// admin-alert-mailer v4 (2026-06-11) — failure window 6h→35min so each failure alerts ONCE (cron runs */30; 6h window caused up to 12 duplicate WA messages).
// v3: WHATSAPP-FIRST per Mohamed — FULL details to WA (admin_alert_phone), chunked ≤3500 chars. Email = silent archive. Insights marked if EITHER channel ok.
// WA to the main admin (+201002229982) is impossible (it IS the WABA number, Meta #100).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = 'madmona@madmonacairo.com'
const FROM_EMAIL = 'alerts@madmonacairo.com'
const WA_CHUNK = 3500
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const { data: keyData } = await sb.rpc('get_resend_key')
    const resendKey = (keyData as string) || ''

    const since = new Date(Date.now() - 24 * 3600000).toISOString()
    const { data: insights } = await sb.from('agent_insights')
      .select('id, agent_name, insight_type, title, description, recommended_action, data_points, created_at')
      .eq('priority', 'high').gte('created_at', since)
      .order('created_at', { ascending: false }).limit(20)
    const fresh = ((insights || []) as Array<any>).filter(i => !i?.data_points?.alerted_at)

    // 35-min window (cron runs every 30 min) → each failure alerts exactly once
    const sinceFail = new Date(Date.now() - 35 * 60000).toISOString()
    const { data: fails } = await sb.from('agent_runs')
      .select('agent_name, error_message, started_at')
      .eq('status', 'error').gte('started_at', sinceFail)
      .order('started_at', { ascending: false }).limit(10)
    const failures = (fails || []) as Array<any>

    if (fresh.length === 0 && failures.length === 0) {
      return json({ ok: true, sent: false, reason: 'nothing to alert' })
    }

    const fmtDate = (s: string) => new Date(s).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', hour12: true })

    // ===== WHATSAPP (primary channel — FULL details) =====
    let waQueued = false
    let waParts = 0
    try {
      const { data: cfg } = await sb.from('whatsapp_config').select('value').eq('key', 'admin_alert_phone').maybeSingle()
      const altPhone = (cfg as { value?: string } | null)?.value || ''
      if (altPhone) {
        const blocks: string[] = []
        let n = 0
        for (const i of fresh) {
          n++
          let b = `⚠️ ${n}) ${i.title}\n🤖 ${i.agent_name} · ${fmtDate(i.created_at)}`
          if (i.description) b += `\n${String(i.description).slice(0, 600)}`
          if (i.recommended_action) b += `\n✅ الإجراء: ${String(i.recommended_action).slice(0, 300)}`
          blocks.push(b)
        }
        if (failures.length) {
          let fb = `🔴 فشل جديد في الـ agents:`
          for (const f of failures) {
            fb += `\n• ${f.agent_name} · ${fmtDate(f.started_at)}\n  ${String(f.error_message || '').slice(0, 180)}`
          }
          blocks.push(fb)
        }
        const header = `⚠️ تنبيهات مضمونة — ${fresh.length} مهم${failures.length ? ` + ${failures.length} فشل` : ''}\n──────────`
        const chunks: string[] = []
        let cur = header
        for (const b of blocks) {
          if ((cur + '\n\n' + b).length > WA_CHUNK) { chunks.push(cur); cur = b }
          else cur = cur + '\n\n' + b
        }
        if (cur.trim()) chunks.push(cur)
        const total = chunks.length
        const phone = altPhone.startsWith('+') ? altPhone : '+' + altPhone.replace(/\D/g, '')
        const nowIso = new Date().toISOString()
        let allOk = true
        for (let c = 0; c < total; c++) {
          const suffix = total > 1 ? `\n\n(${c + 1}/${total})` : ''
          const { error: qErr } = await sb.from('whatsapp_outbound_queue').insert({
            recipient_phone: phone,
            message: chunks[c] + suffix,
            agent_name: 'admin-alert-mailer', campaign: 'admin_wa_alerts_v1',
            status: 'pending', scheduled_at: nowIso,
            metadata: { part: c + 1, of: total, insights: fresh.map((i: any) => i.id) }
          })
          if (qErr) allOk = false; else waParts++
        }
        waQueued = allOk && waParts > 0
      }
    } catch { /* wa best-effort */ }

    // ===== EMAIL (silent archive/backup) =====
    let emailOk = false
    let resendData: any = null
    if (resendKey) {
      let html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;color:#0A0A0A;background:#FAFAF7;padding:24px;border-radius:16px">`
      html += `<h2 style="color:#1F6F5F;margin:0 0 16px">⚠️ تنبيهات مضمونة — ${fresh.length} تنبيه مهم${failures.length ? ` + ${failures.length} فشل agents` : ''}</h2>`
      for (const i of fresh) {
        html += `<div style="background:#fff;border-radius:12px;padding:14px 18px;margin-bottom:10px;border-right:5px solid #d4a017">`
        html += `<b>${esc(i.title)}</b><br><span style="color:#555;font-size:13px">${esc(i.agent_name)} · ${fmtDate(i.created_at)}</span>`
        if (i.description) html += `<p style="margin:8px 0 0">${esc(String(i.description).slice(0, 300))}</p>`
        if (i.recommended_action) html += `<p style="margin:6px 0 0;color:#1F6F5F"><b>الإجراء:</b> ${esc(i.recommended_action)}</p>`
        html += `</div>`
      }
      if (failures.length) {
        html += `<h3 style="color:#b00020;margin:18px 0 8px">فشل جديد في الـ agents</h3>`
        for (const f of failures) {
          html += `<div style="background:#fff;border-radius:10px;padding:10px 16px;margin-bottom:8px;border-right:5px solid #b00020;font-size:13px">`
          html += `<b>${esc(f.agent_name)}</b> · ${fmtDate(f.started_at)}<br>${esc(String(f.error_message || '').slice(0, 200))}</div>`
        }
      }
      html += `<p style="color:#888;font-size:12px;margin-top:18px">مضمونة — معاملاتك مضمونة · admin-alert-mailer (أرشيف — القناة الأساسية واتساب)</p></div>`
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `مضمونة Alerts <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            subject: `⚠️ مضمونة: ${fresh.length} تنبيه مهم${failures.length ? ` و${failures.length} فشل` : ''}`,
            html
          })
        })
        resendData = await r.json()
        emailOk = r.ok
      } catch { /* email best-effort */ }
    }

    if (emailOk || waQueued) {
      for (const i of fresh) {
        await sb.from('agent_insights').update({
          data_points: { ...(i.data_points || {}), alerted_at: new Date().toISOString(), email_id: resendData?.id ?? null, wa_queued: waQueued, wa_parts: waParts }
        }).eq('id', i.id)
      }
    }
    return json({ ok: emailOk || waQueued, insights: fresh.length, failures: failures.length, wa_queued: waQueued, wa_parts: waParts, email_ok: emailOk })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
