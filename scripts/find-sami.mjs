// 🔎 فين رسايل سامي؟ دوّر بالاسم وبالمحتوى (الإلكترونيات)
//   node scripts/find-sami.mjs

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

// ١) رسايل فيها كلام عن الإلكترونيات
const { data: hits } = await db
  .from('whatsapp_messages')
  .select('conversation_id, direction, body, created_at')
  .or('body.ilike.%الكترون%,body.ilike.%إلكترون%,body.ilike.%electron%,body.ilike.%تيكوود%,body.ilike.%techwood%')
  .order('created_at', { ascending: false })
  .limit(25)

console.log(`\n═══ رسايل فيها «إلكترونيات/تيكوود» — ${hits?.length || 0} ═══\n`)
const ids = [...new Set((hits || []).map((h) => h.conversation_id))]
const { data: cs } = ids.length
  ? await db.from('whatsapp_conversations').select('id, contact_name, contact_phone').in('id', ids)
  : { data: [] }
const byId = new Map((cs || []).map((c) => [c.id, c]))

for (const h of hits || []) {
  const c = byId.get(h.conversation_id) || {}
  console.log(`  ${(c.contact_name || '?').padEnd(18)} ${(c.contact_phone || '').padEnd(15)} ${h.direction === 'inbound' ? '👤' : '🤖'}`)
  console.log(`    ${(h.body || '').replace(/\s+/g, ' ').slice(0, 160)}\n`)
}

// ٢) آخر المحادثات النشطة — يمكن سامي فيهم باسم تاني
const { data: recent } = await db
  .from('whatsapp_conversations')
  .select('contact_name, contact_phone, updated_at')
  .order('updated_at', { ascending: false })
  .limit(20)

console.log('═══ آخر ٢٠ محادثة نشطة ═══\n')
for (const r of recent || []) {
  console.log(`  ${(r.contact_name || '?').padEnd(24)} ${(r.contact_phone || '').padEnd(16)} ${new Date(r.updated_at).toLocaleString('ar-EG')}`)
}
console.log('')
