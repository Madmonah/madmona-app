#!/usr/bin/env node
// =====================================================================
// ✏️  إصلاح أسماء الجروبات الوهمية
//
// التسجيل التلقائي بيحط أسماء زي «موردة جديدة» و«حساب 1060138703».
// الاسم ده اتحوّل لعنوان جروب — بيبان للمورّد ولكل حد يتضاف.
//
// مافيش اسم حقيقي في الداتابيز نستخدمه، فبنحطّ اسم محايد محترم
// لحد ما نعرف اسم شغلهم الفعلي.
//
//   node scripts/fix-group-names.mjs           معاينة
//   node scripts/fix-group-names.mjs --send    تنفيذ
// =====================================================================

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

const SEND = process.argv.includes('--send')
const GATEWAY = 'https://www.madmonacairo.com/api/internal/wa-group'
const NEW_SUBJECT = 'مضمونة 🤝 متابعة'

const { data: groups, error } = await db
  .from('supplier_wa_groups')
  .select('id, subject, group_jid')
  .eq('is_active', true)

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

const PLACEHOLDER = /موردة جديدة|مورد جديد|حساب \d/
const bad = (groups || []).filter((g) => PLACEHOLDER.test(g.subject || ''))

console.log(`\n═══ أسماء الجروبات ═══\n`)
console.log(`  إجمالي   : ${groups.length}`)
console.log(`  محتاج تصليح : ${bad.length}\n`)
for (const g of bad) console.log(`   ${g.subject}`)

if (!SEND) {
  console.log(`\n👀 معاينة. الاسم الجديد: «${NEW_SUBJECT}»\n`)
  process.exit(0)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

console.log('\n─── جاري التغيير ───\n')

for (let i = 0; i < bad.length; i++) {
  const g = bad[i]
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({ action: 'rename', group_jid: g.group_jid, subject: NEW_SUBJECT }),
    })
    const data = await res.json().catch(() => ({}))

    if (data?.ok) {
      await db.from('supplier_wa_groups').update({ subject: NEW_SUBJECT }).eq('id', g.id)
      ok++
      console.log(`  ✅ ${g.subject}`)
    } else {
      fail++
      console.log(`  🔴 ${g.subject}  ${data?.error || res.status}`)
    }
  } catch (e) {
    fail++
    console.log(`  🔴 ${g.subject}  ${e.message}`)
  }
  if (i < bad.length - 1) await sleep(4000)
}

console.log(`\n═══ خلص: ${ok} اتغيّر · ${fail} فشل ═══\n`)
