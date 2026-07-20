#!/usr/bin/env node
// =====================================================================
// 🖼️  لوجو الشركة كصورة للجروب
//
// ⚠️ الواقع: من ١٤٧ مورّد، **اتنين بس** عندهم logo_url في الداتابيز.
//    فالسكريبت ده هيحط لوجو للي عنده، والباقي محتاج نجمّع لوجوهاتهم
//    الأول (المارد بيطلبها في الجروب — أنضف طريقة وبتفتح كلام كمان).
//
//   node scripts/set-group-logos.mjs           معاينة
//   node scripts/set-group-logos.mjs --send    تنفيذ
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

const { data: groups, error } = await db
  .from('supplier_wa_groups')
  .select('id, subject, group_jid, supplier_id, logo_applied_at')
  .eq('is_active', true)

if (error) {
  console.error('🔴', error.message)
  process.exit(1)
}

const supIds = groups.map((g) => g.supplier_id)
const { data: sups } = await db
  .from('marketplace_suppliers')
  .select('id, business_name, logo_url')
  .in('id', supIds)

const logoOf = Object.fromEntries((sups || []).map((s) => [s.id, s.logo_url]))

const ready = groups.filter((g) => logoOf[g.supplier_id] && !g.logo_applied_at)
const missing = groups.filter((g) => !logoOf[g.supplier_id])

console.log('\n═══ لوجوهات الجروبات ═══\n')
console.log(`  جروبات        : ${groups.length}`)
console.log(`  عندهم لوجو    : ${groups.length - missing.length}`)
console.log(`  من غير لوجو   : ${missing.length}`)
console.log(`  جاهز للتطبيق  : ${ready.length}\n`)

for (const g of ready) console.log(`   ✓ ${g.subject}`)

if (missing.length) {
  console.log(`\n  ⚠️ ${missing.length} جروب من غير لوجو — لازم نجمّعهم الأول.`)
}

if (!SEND) {
  console.log('\n👀 معاينة بس.\n')
  process.exit(0)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = 0
let fail = 0

for (let i = 0; i < ready.length; i++) {
  const g = ready[i]
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': env.EDGE_GATEWAY_SECRET },
      body: JSON.stringify({
        action: 'picture',
        group_jid: g.group_jid,
        image_url: logoOf[g.supplier_id],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (data?.ok) {
      await db
        .from('supplier_wa_groups')
        .update({ logo_applied_at: new Date().toISOString() })
        .eq('id', g.id)
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
  if (i < ready.length - 1) await sleep(6000)
}

console.log(`\n═══ خلص: ${ok} لوجو · ${fail} فشل ═══\n`)
