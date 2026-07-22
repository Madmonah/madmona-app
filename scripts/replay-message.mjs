// ▶️ عدّي رسالة واردة على الويبهوك تاني — عشان المارد يرد بنفسه
//
// بنستخدمه لما رد ضاع بسبب عطل (قناة مفصولة/نشر فاشل). مش بنكتب
// الرد بإيدينا — المارد هو اللي يقرا ويرد، ده الاختبار الحقيقي.
//
//   node scripts/replay-message.mjs 145398115078244

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

const phone = process.argv[2]
if (!phone) { console.log('لازم رقم/مُعرّف'); process.exit(1) }

const { data: convs } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name, session_id')
  .eq('contact_phone', phone)

if (!convs?.length) { console.log('مالقيتش محادثة'); process.exit(1) }
const conv = convs[0]

// آخر رسالة واردة — دي اللي المارد المفروض يرد عليها
const { data: msgs } = await db
  .from('whatsapp_messages')
  .select('id, body, created_at, wa_message_id')
  .in('conversation_id', convs.map((c) => c.id))
  .eq('direction', 'inbound')
  .order('created_at', { ascending: false })
  .limit(1)

const last = msgs?.[0]
if (!last) { console.log('مفيش رسالة واردة'); process.exit(1) }

const isLid = /^\d{10,}$/.test(phone) && phone.length > 13

console.log(`\n👤 ${conv.contact_name || phone}`)
console.log(`📨 «${(last.body || '').replace(/\s+/g, ' ').slice(0, 90)}»`)
console.log(`📞 هيرد من: ${conv.session_id}\n`)

// ⚠️ message_id جديد — عشان مايتفلترش كمكرر
const payload = {
  session_id: conv.session_id,
  reply_jid: isLid ? `${phone}@lid` : `${phone.replace(/\D/g, '')}@s.whatsapp.net`,
  is_lid: isLid,
  from: phone,
  name: conv.contact_name || null,
  message_id: `replay-${Date.now()}`,
  timestamp: Math.floor(Date.now() / 1000),
  type: 'text',
  text: last.body || '',
  is_group: false,
}

const res = await fetch('https://www.madmonacairo.com/api/whatsapp/baileys', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-madmona-secret': env.EDGE_GATEWAY_SECRET,
  },
  body: JSON.stringify(payload),
})

const out = await res.text()
console.log(`HTTP ${res.status}`)
console.log(out.slice(0, 600))
