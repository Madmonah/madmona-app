// 📭 مين كلّمنا ومارددناش عليه؟ (آخر ٤٨ ساعة)
//   node scripts/check-unanswered.mjs

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

const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

const { data: msgs, error } = await db
  .from('whatsapp_messages')
  .select('conversation_id, direction, created_at, body')
  .gte('created_at', since)
  .order('created_at', { ascending: true })

if (error) { console.error(error); process.exit(1) }

// آخر رسالة في كل محادثة — لو واردة يبقى مارددناش
const last = new Map()
for (const m of msgs || []) last.set(m.conversation_id, m)

const pending = [...last.values()].filter((m) => m.direction === 'inbound')
if (!pending.length) { console.log('\n✅ مفيش رسالة معلّقة\n'); process.exit(0) }

const { data: convs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name, session_id')
  .in('id', pending.map((p) => p.conversation_id))

const byId = new Map((convs || []).map((c) => [c.id, c]))

console.log(`\n📭 ${pending.length} محادثة معلّقة\n`)
for (const p of pending.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
  const c = byId.get(p.conversation_id) || {}
  const when = new Date(p.created_at).toLocaleString('ar-EG')
  const who = (c.contact_name || c.contact_phone || '?').slice(0, 22)
  const sess = c.session_id || '—'
  console.log(`  ${who.padEnd(24)} ${sess.padEnd(14)} ${when}`)
  console.log(`    « ${(p.body || '(ميديا)').replace(/\s+/g, ' ').slice(0, 80)} »`)
}
console.log('')
