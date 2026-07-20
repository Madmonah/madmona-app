// 📖 اقرا محادثة سامي فؤاد بالكامل قبل ما أرد
//   node scripts/read-sami.mjs

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

// كل صفوف المحادثة للرقم ده (ممكن تكون متكررة)
const forms = ['+201000092680', '201000092680', '01000092680']
const { data: convs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name, session_id, updated_at')
  .in('contact_phone', forms)

console.log(`\n🔎 ${convs?.length || 0} صف محادثة لسامي فؤاد\n`)

const ids = (convs || []).map((c) => c.id)
if (!ids.length) process.exit(0)

const { data: msgs } = await db
  .from('whatsapp_messages')
  .select('conversation_id, direction, body, created_at, media_url, media_mime')
  .in('conversation_id', ids)
  .order('created_at', { ascending: true })

console.log(`📨 ${msgs?.length || 0} رسالة\n`)
for (const m of msgs || []) {
  const who = m.direction === 'inbound' ? '👤 سامي' : '🤖 المارد'
  const when = new Date(m.created_at).toLocaleString('ar-EG')
  const txt = (m.body || (m.media_url ? `(${m.media_mime || 'ميديا'})` : '(فاضية)')).replace(/\s+/g, ' ')
  console.log(`${who}  ${when}\n   ${txt.slice(0, 700)}\n`)
}
