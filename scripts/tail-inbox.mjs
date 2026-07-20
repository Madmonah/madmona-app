// 📡 آخر الرسايل الواردة — بغض النظر عن الجلسة
//   node scripts/tail-inbox.mjs

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const { data: msgs } = await db
  .from('whatsapp_messages')
  .select('conversation_id, direction, body, created_at, wa_message_id, media_url')
  .order('created_at', { ascending: false })
  .limit(25)

const ids = [...new Set((msgs || []).map((m) => m.conversation_id))]
const { data: cs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_name, contact_phone, session_id')
  .in('id', ids)
const byId = new Map((cs || []).map((c) => [c.id, c]))

console.log('\n═══ آخر ٢٥ رسالة ═══\n')
for (const m of (msgs || []).reverse()) {
  const c = byId.get(m.conversation_id) || {}
  const who = m.direction === 'inbound' ? '👤' : '🤖'
  const when = new Date(m.created_at).toLocaleString('ar-EG')
  const sent = m.direction === 'outbound' && !m.wa_message_id ? ' ⚠️ماخرجتش' : ''
  const txt = (m.body || (m.media_url ? '(ميديا)' : '(فاضية)')).replace(/\s+/g, ' ')
  console.log(`${who} ${(c.contact_name || c.contact_phone || '?').slice(0, 18).padEnd(19)} ج:${(c.session_id || '—').slice(-4)} ${when}${sent}`)
  console.log(`   ${txt.slice(0, 180)}\n`)
}
