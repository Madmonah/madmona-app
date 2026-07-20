// 📖 كل المحادثات على الرقم الجديد + محادثات تيكوود
//   node scripts/read-tw.mjs

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

// كل محادثة على الرقم الجديد
const { data: convs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name, session_id, updated_at')
  .eq('session_id', '201114621551')
  .order('updated_at', { ascending: false })

console.log(`\n═══ ${convs?.length || 0} محادثة على الرقم الجديد 201114621551 ═══\n`)

for (const c of convs || []) {
  console.log(`\n── ${c.contact_name || '?'} · ${c.contact_phone} · ${new Date(c.updated_at).toLocaleString('ar-EG')}\n`)
  const { data: msgs } = await db
    .from('whatsapp_messages')
    .select('direction, body, created_at, wa_message_id, media_url')
    .eq('conversation_id', c.id)
    .order('created_at', { ascending: false })
    .limit(10)
  for (const m of (msgs || []).reverse()) {
    const who = m.direction === 'inbound' ? '👤' : '🤖'
    const when = new Date(m.created_at).toLocaleString('ar-EG')
    const sent = m.direction === 'outbound' && !m.wa_message_id ? ' ⚠️ ماخرجتش' : ''
    const txt = (m.body || (m.media_url ? '(ميديا)' : '(فاضية)')).replace(/\s+/g, ' ')
    console.log(`${who} ${when}${sent}\n   ${txt.slice(0, 500)}\n`)
  }
}
