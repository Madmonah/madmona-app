#!/usr/bin/env node
// =====================================================================
// 💬 اعتذار للمحادثات اللي مااتردّش عليها
//
// السبب: القناة اتكسرت من ١٣ يوليو (الويبهوك كان 404 بسبب .vercelignore،
// وبعدين Cloud API وقف). ناس بعتت ومحدش رد.
//
// الضوابط:
//   • فاصل عشوائي ٤٥–١٢٠ ثانية بين كل رسالة — الإرسال المتتابع
//     السريع بيتقري كسبام وممكن يوقف الرقم
//   • استثناء المسيئين — الاعتذار للمسيء بيشجّع مش بيصلح
//   • استثناء اللي اترد عليه بعد كده
//   • --dry افتراضي: بيعرض مين هياخد إيه من غير ما يبعت
//
// التشغيل:
//   node scripts/send-apology.mjs                 معاينة
//   node scripts/send-apology.mjs --send --limit 10   إرسال فعلي
// =====================================================================

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
// ⚠️ بنقسم على /\r?\n/ مش '\n'.
// السبب: `.` في جافاسكريبت مابتطابقش \r، فسطر واحد منتهي بـ CRLF
// جوه ملف LF بيفشل بصمت — المتغير بيبان «ناقص» وهو موجود.
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.trim().match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const args = process.argv.slice(2)
const SEND = args.includes('--send')
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || 10
const SITE = 'https://www.madmonacairo.com'

// ── مين نستثنيه ──────────────────────────────────────────────────────
// أرقام بعتت سباب — الاعتذار هنا مالوش معنى
const BLOCKED = ['+201006485850']

// أرقام اختبار عملناها إحنا
const TEST = /^\+?20155500|^\+?201002229982$/

const MESSAGE = `مساء الخير 👋

أنا *المارد* — مساعد مضمونة الذكي.

بعتّلنا الأيام اللي فاتت ومارّدناش عليك، وده مش من عادتنا. كنا بنعمل تحديثات على النظام والرسايل مااتوصلتش لينا في وقتها. أعتذرلك بجد.

النظام رجع شغال دلوقتي وأنا موجود ٢٤/٧ على الرقم ده. لو طلبك لسه قايم، ابعتهولي تاني وهرد عليك على طول.

${SITE}`

// ── الاختيار ─────────────────────────────────────────────────────────
const { data: convs, error } = await db
  .from('whatsapp_conversations')
  .select('id, contact_phone, contact_name, last_message_at, last_inbound_at, last_outbound_at')
  .eq('last_message_direction', 'inbound')
  .gte('last_message_at', '2026-07-10')
  .order('last_message_at', { ascending: false })

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

const targets = (convs || []).filter((c) => {
  const p = (c.contact_phone || '').trim()
  if (!p) return false
  if (BLOCKED.includes(p)) return false
  if (TEST.test(p)) return false
  // مُعرّف مخفي من غير JID محفوظ — مش هيوصله
  const d = p.replace(/\D/g, '')
  if (d.length >= 14) return false
  return true
})

console.log(`\n═══ الاعتذار ═══\n`)
console.log(`  محادثات مستنية : ${convs?.length ?? 0}`)
console.log(`  مؤهّلة للإرسال : ${targets.length}`)
console.log(`  في الدفعة دي   : ${Math.min(LIMIT, targets.length)}\n`)

const batch = targets.slice(0, LIMIT)
for (const c of batch) {
  console.log(`   ${c.contact_phone.padEnd(16)} ${(c.contact_name || '—').slice(0, 22)}`)
}

if (!SEND) {
  console.log(`\n👀 معاينة بس. للإرسال: node scripts/send-apology.mjs --send --limit ${LIMIT}\n`)
  console.log('─── النص ───')
  console.log(MESSAGE)
  process.exit(0)
}

// ── الإرسال ──────────────────────────────────────────────────────────
const GATEWAY = `${SITE}/api/internal/wa-send`
const SECRET = env.EDGE_GATEWAY_SECRET

if (!SECRET) {
  console.error('🔴 EDGE_GATEWAY_SECRET ناقص')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

console.log('\n─── جاري الإرسال ───\n')

for (let i = 0; i < batch.length; i++) {
  const c = batch[i]
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': SECRET },
      body: JSON.stringify({
        to: c.contact_phone,
        text: MESSAGE,
        conversation_id: c.id,
        agent_name: 'المارد',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (data?.ok) {
      ok++
      console.log(`  ✅ ${c.contact_phone}  ${(c.contact_name || '').slice(0, 18)}`)
    } else {
      fail++
      console.log(`  🔴 ${c.contact_phone}  ${data?.error || res.status}`)
    }
  } catch (e) {
    fail++
    console.log(`  🔴 ${c.contact_phone}  ${e.message}`)
  }

  // فاصل عشوائي — التتابع السريع بيتقري كسبام
  if (i < batch.length - 1) {
    const wait = 45_000 + Math.floor(Math.random() * 75_000)
    console.log(`     … استنى ${Math.round(wait / 1000)}ث`)
    await sleep(wait)
  }
}

console.log(`\n═══ خلص: ${ok} اتبعت · ${fail} فشل ═══\n`)
